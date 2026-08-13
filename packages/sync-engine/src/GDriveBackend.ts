import {
  type ISyncBackend,
  type FileMetadata,
  type IGDriveAuthService,
} from "./types";
import { type Clock, systemClock } from "./runtime";

/**
 * Custom error class for Google Drive operations.
 */
export class DriveError extends Error {
  constructor(
    message: string,
    public readonly code?: string | number,
    public readonly retryable: boolean = false,
    public readonly reconnectRequired: boolean = false,
  ) {
    super(message);
    this.name = "DriveError";
  }
}

/**
 * Implements ISyncBackend for Google Drive REST API v3.
 * OPFS remains the master; this backend provides push/pull mirroring.
 */
export class GDriveBackend implements ISyncBackend {
  private folderId: string | null = null;
  private readonly API_BASE = "https://www.googleapis.com/drive/v3";
  private readonly UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

  constructor(
    private readonly authService: IGDriveAuthService,
    private readonly vaultId: string,
    private readonly wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
    // Injected for tests; default wraps the global `fetch` lazily.
    private readonly fetcher: typeof fetch = (input, init) =>
      fetch(input, init),
    private readonly clock: Clock = systemClock,
  ) {}

  /**
   * Sets the target folder ID for the vault.
   */
  setVaultFolderId(folderId: string): void {
    this.folderId = folderId;
  }

  /**
   * Validates access to the Drive folder.
   */
  async connect(): Promise<void> {
    if (!this.folderId) {
      throw new DriveError(
        "No Drive folder ID configured for this vault",
        "MISSING_FOLDER",
        false,
        true,
      );
    }

    try {
      await this.driveFetch(`/files/${this.folderId}?fields=id,name,trashed`);
    } catch (error) {
      if (error instanceof DriveError && error.code === 404) {
        throw new DriveError(
          "Drive folder not found or inaccessible",
          "NOT_FOUND",
          false,
          true,
        );
      }
      throw error;
    }
  }

  /**
   * Scans the Drive folder for files recursively.
   */
  async scan(
    _vaultId: string,
    sinceToken?: string | null,
  ): Promise<{ files: FileMetadata[]; nextToken?: string }> {
    if (!this.folderId) return { files: [] };

    const allFiles: FileMetadata[] = [];

    const scanFolder = async (
      folderId: string,
      pathPrefix: string[] = [],
    ): Promise<void> => {
      const query = `'${folderId}' in parents and trashed = false`;
      const fields =
        "nextPageToken, files(id, name, mimeType, modifiedTime, size)";
      const baseUrl = `/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=1000`;

      let url = baseUrl;
      if (folderId === this.folderId && sinceToken) {
        url += `&pageToken=${encodeURIComponent(sinceToken)}`;
      }

      let hasMore = true;
      while (hasMore) {
        const response = await this.driveFetch(url);
        const data = await response.json();

        if (data.files) {
          for (const f of data.files) {
            const currentPath = [...pathPrefix, f.name].join("/");
            if (f.mimeType === "application/vnd.google-apps.folder") {
              await scanFolder(f.id, [...pathPrefix, f.name]);
            } else {
              allFiles.push({
                path: currentPath,
                lastModified: new Date(
                  f.modifiedTime || this.clock.now(),
                ).getTime(),
                size: parseInt(f.size || "0"),
                handle: f.id,
              });
            }
          }
        }

        if (data.nextPageToken) {
          url = `${baseUrl}&pageToken=${encodeURIComponent(data.nextPageToken)}`;
        } else {
          hasMore = false;
        }
      }
    };

    await scanFolder(this.folderId);
    return { files: allFiles };
  }

  /**
   * Downloads file content from Drive.
   */
  async download(_path: string, remoteId?: string): Promise<Blob> {
    if (!remoteId) {
      throw new DriveError("Missing remote ID for download", "MISSING_ID");
    }
    const response = await this.driveFetch(`/files/${remoteId}?alt=media`);
    return await response.blob();
  }

  /**
   * Uploads or updates a file on Drive.
   */
  async upload(
    path: string,
    content: Blob,
    remoteId?: string,
  ): Promise<FileMetadata> {
    if (!this.folderId) {
      throw new DriveError("No folder connected", "MISSING_FOLDER");
    }

    console.log(
      `[GDriveBackend] Uploading ${path} (${(content.size / 1024).toFixed(1)} KB)...`,
    );

    const metadata = {
      name: path,
      parents: remoteId ? undefined : [this.folderId],
    };

    const boundary = "-------314159265358979323846";
    const header = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${content.type || "application/octet-stream"}\r\n\r\n`;
    const footer = `\r\n--${boundary}--`;

    const body = new Blob([header, content, footer]);

    const url = remoteId
      ? `${this.UPLOAD_BASE}/files/${remoteId}?uploadType=multipart`
      : `${this.UPLOAD_BASE}/files?uploadType=multipart`;

    const response = await this.driveFetch(
      url,
      {
        method: remoteId ? "PATCH" : "POST",
        headers: {
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
      true,
    );

    const data = await response.json();

    return {
      path,
      lastModified: this.clock.now(),
      size: content.size,
      handle: data.id,
    };
  }

  /**
   * Deletes a file from Drive.
   */
  async delete(_path: string, remoteId?: string): Promise<void> {
    if (!remoteId) return;
    await this.driveFetch(`/files/${remoteId}`, { method: "DELETE" });
  }

  /**
   * Helper for authenticated Drive API calls with retry logic.
   */
  private async driveFetch(
    endpoint: string,
    options: RequestInit = {},
    isFullUrl = false,
    retryCount = 0,
  ): Promise<Response> {
    const token = await this.authService.getAccessToken();
    if (!token) {
      throw new DriveError("Unauthorized", 401, false, true);
    }

    const url = isFullUrl ? endpoint : `${this.API_BASE}${endpoint}`;
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);

    try {
      const response = await this.fetcher(url, { ...options, headers });

      if (response.ok) return response;

      // Handle common errors
      if (response.status === 401 && retryCount < 1) {
        // Refresh token and retry once
        await this.authService.signOut(); // Force refresh on next getAccessToken
        return this.driveFetch(endpoint, options, isFullUrl, retryCount + 1);
      }

      if (
        (response.status === 500 || response.status === 503) &&
        retryCount < 1
      ) {
        // Transient error, wait 500ms and retry once
        await this.wait(500);
        return this.driveFetch(endpoint, options, isFullUrl, retryCount + 1);
      }

      const errorData = await response.json().catch(() => ({}));
      throw new DriveError(
        errorData.error?.message || response.statusText,
        response.status,
        response.status >= 500,
        response.status === 401 ||
          response.status === 403 ||
          response.status === 404,
      );
    } catch (error) {
      if (error instanceof DriveError) throw error;
      throw new DriveError(
        error instanceof Error ? error.message : "Network error",
        "NETWORK",
        true,
      );
    }
  }
}
