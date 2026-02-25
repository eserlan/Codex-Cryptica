import {
  type ISyncBackend,
  type FileMetadata,
  type GDriveListResponse,
} from "./types";

export class GDriveBackend implements ISyncBackend {
  private accessToken: string | null = null;
  private tokenClient: any;
  private vaultFolderId: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private activeVaultId: string | null = null;
  private connectionResolvers: {
    resolve: () => void;
    reject: (reason?: any) => void;
    prompt: string;
  } | null = null;

  constructor(
    private clientId: string,
    private scope: string = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
  ) {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.accessToken = null;
      });
    }
  }

  get isConnected(): boolean {
    return !!this.accessToken;
  }

  setVaultFolderId(folderId: string): void {
    this.vaultFolderId = folderId;
  }

  async connect(
    prompt: "" | "none" | "select_account" = "none",
  ): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve, reject) => {
      if (typeof google === "undefined") {
        return reject(new Error("Google Identity Services not loaded"));
      }

      this.connectionResolvers = { resolve, reject, prompt };

      if (!this.tokenClient) {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: this.scope,
          callback: (response: any) => {
            const resolvers = this.connectionResolvers;
            if (!resolvers) return;

            if (response.error) {
              if (resolvers.prompt === "none") {
                this.accessToken = null;
                resolvers.reject(new Error("SILENT_AUTH_FAILED"));
              } else {
                resolvers.reject(response);
              }
            } else {
              this.accessToken = response.access_token;
              resolvers.resolve();
            }
          },
          error_callback: (error: any) => {
            this.connectionResolvers?.reject(error);
          },
        });
      }

      this.tokenClient.requestAccessToken({ prompt });
    });

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
      this.connectionResolvers = null;
    }
  }

  private async getVaultFolderId(vaultId: string): Promise<string> {
    if (this.vaultFolderId) return this.vaultFolderId;

    let rootId = await this.findFolder("CodexCryptica");
    if (!rootId) {
      rootId = await this.createFolder("CodexCryptica");
    }

    const folderId = await this.findFolder(vaultId, rootId);
    if (!folderId) {
      this.vaultFolderId = await this.createFolder(vaultId, rootId);
    } else {
      this.vaultFolderId = folderId;
    }

    return this.vaultFolderId;
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = 3,
  ): Promise<Response> {
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (response.status === 401) {
        try {
          await this.connect("none"); // Attempt silent refresh
          continue; // Retry with new token
        } catch (err: any) {
          if (err.message === "SILENT_AUTH_FAILED") {
            throw new Error("AUTH_REQUIRED", { cause: err });
          }
          throw err;
        }
      }

      if (
        response.status === 429 ||
        (response.status >= 500 && response.status < 600)
      ) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      if (!response.ok) {
        return response; // Fail fast for 400, 403, 404 etc.
      }

      return response;
    }
    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
  }

  async getUserProfile(): Promise<{ email: string; name: string }> {
    if (!this.accessToken) throw new Error("Not authenticated");
    const res = await this.fetchWithRetry(
      "https://www.googleapis.com/oauth2/v3/userinfo",
    );
    if (!res.ok) throw new Error("Failed to fetch user profile");
    return await res.json();
  }

  async scan(
    vaultId: string,
    sinceToken?: string | null,
  ): Promise<{ files: FileMetadata[]; nextToken?: string }> {
    this.activeVaultId = vaultId;
    const folderId = await this.getVaultFolderId(vaultId);

    if (sinceToken) {
      let files: FileMetadata[] = [];
      let pageToken: string | undefined = sinceToken;
      let newStartPageToken: string | undefined;

      do {
        const res = await this.fetchWithRetry(
          `https://www.googleapis.com/drive/v3/changes?pageToken=${pageToken}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=newStartPageToken,nextPageToken,changes(fileId,removed,file(id,name,mimeType,modifiedTime,size,md5Checksum,appProperties))`,
        );
        if (!res.ok) throw new Error("Failed to scan changes");
        const data: any = await res.json();

        files = files.concat(
          data.changes
            .filter((c: any) => {
              // Filter out files that don't belong to this vault.
              // For deletions (c.removed), we rely on the registry lookup later,
              // but we can at least filter by fileId if we had a cache.
              // For now, if we have metadata, check parents or appProperties.
              if (!c.file) return true; // Keep deletions for registry matching
              return (
                c.file.appProperties?.vault_path ||
                c.file.parents?.includes(folderId)
              );
            })
            .map((c: any) => ({
              path:
                c.file?.appProperties?.vault_path || c.file?.name || "unknown",
              lastModified: c.file
                ? new Date(c.file.modifiedTime).getTime()
                : 0,
              size: c.file ? parseInt(c.file.size || "0") : 0,
              handle: c.fileId,
              hash: c.file?.md5Checksum,
              isDeleted: c.removed || c.file?.trashed,
            })),
        );

        pageToken = data.nextPageToken;
        newStartPageToken = data.newStartPageToken || newStartPageToken;
      } while (pageToken);

      return { files, nextToken: newStartPageToken };
    } else {
      const files: FileMetadata[] = [];

      const fetchAllInFolder = async (
        folderId: string,
        currentPath: string,
      ) => {
        let pageToken: string | undefined;
        do {
          const q = `'${folderId}' in parents and trashed = false`;
          const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,mimeType,modifiedTime,size,md5Checksum,appProperties)${pageToken ? `&pageToken=${pageToken}` : ""}`;
          const res = await this.fetchWithRetry(url);
          if (!res.ok)
            throw new Error(`Failed to list files in ${currentPath}`);
          const data: any = await res.json();

          for (const f of data.files) {
            const path = currentPath ? `${currentPath}/${f.name}` : f.name;
            if (f.mimeType === "application/vnd.google-apps.folder") {
              await fetchAllInFolder(f.id, path);
            } else {
              files.push({
                path: f.appProperties?.vault_path || path,
                lastModified: new Date(f.modifiedTime).getTime(),
                size: parseInt(f.size || "0"),
                handle: f.id,
                hash: f.md5Checksum,
              });
            }
          }
          pageToken = data.nextPageToken;
        } while (pageToken);
      };

      await fetchAllInFolder(folderId, "");

      const startTokenRes = await this.fetchWithRetry(
        "https://www.googleapis.com/drive/v3/changes/startPageToken",
      );
      const { startPageToken } = await startTokenRes.json();

      return { files, nextToken: startPageToken };
    }
  }

  async download(path: string, remoteId?: string): Promise<Blob> {
    if (!remoteId) throw new Error("remoteId required for cloud download");
    const res = await this.fetchWithRetry(
      `https://www.googleapis.com/drive/v3/files/${remoteId}?alt=media`,
    );
    if (!res.ok) throw new Error(`Failed to download file ${remoteId}`);
    return await res.blob();
  }

  async upload(
    path: string,
    content: Blob,
    remoteId?: string,
  ): Promise<FileMetadata> {
    const fileName = path.split("/").pop()!;
    const method = remoteId ? "PATCH" : "POST";
    const baseUrl = remoteId
      ? `https://www.googleapis.com/upload/drive/v3/files/${remoteId}`
      : "https://www.googleapis.com/upload/drive/v3/files";

    // We can't easily resolve vaultId here from just the path,
    // but in this app the backend instance is typically used for one vault at a time.
    // However, if vaultFolderId is missing, we need a vaultId.
    // Let's assume the orchestrator ensures vaultFolderId is set via scan()
    // or we resolve it here if we have enough context.

    // Ensure we have a parent folder if this is a new file
    if (!remoteId && !this.vaultFolderId) {
      if (this.activeVaultId) {
        await this.getVaultFolderId(this.activeVaultId);
      } else {
        throw new Error(
          "Cannot upload new file: No active vault or parent folder ID resolved.",
        );
      }
    }

    const metadata = {
      name: fileName,
      appProperties: {
        vault_path: path,
      },
      parents: remoteId
        ? undefined
        : [await this.resolveParentFolder(path, this.vaultFolderId!)],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    form.append("file", content);

    const res = await this.fetchWithRetry(
      `${baseUrl}?uploadType=multipart&fields=id,name,modifiedTime,md5Checksum,appProperties`,
      {
        method,
        body: form,
      },
    );

    if (!res.ok) throw new Error(`Failed to upload file ${path}`);
    const gfile: any = await res.json();

    return {
      path,
      lastModified: new Date(gfile.modifiedTime || Date.now()).getTime(),
      size: content.size,
      handle: gfile.id,
      hash: gfile.md5Checksum,
    };
  }

  async findFolder(name: string, parentId?: string): Promise<string | null> {
    const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    let q = `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }

    const res = await this.fetchWithRetry(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    );
    if (!res.ok) throw new Error(`Failed to find folder ${name}`);
    const data: GDriveListResponse = await res.json();
    return data.files.length > 0 ? data.files[0].id : null;
  }

  async listFolders(
    parentId?: string,
  ): Promise<Array<{ id: string; name: string }>> {
    let q =
      "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }

    const res = await this.fetchWithRetry(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1000`,
    );
    if (!res.ok) throw new Error("Failed to list folders");
    const data = await res.json();
    return data.files || [];
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    const metadata = {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    };

    const res = await this.fetchWithRetry(
      "https://www.googleapis.com/drive/v3/files?fields=id",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      },
    );
    if (!res.ok) throw new Error(`Failed to create folder ${name}`);
    const data = await res.json();
    return data.id;
  }

  private async resolveParentFolder(
    path: string,
    vaultRootId: string,
  ): Promise<string> {
    const segments = path.split("/");
    segments.pop(); // Remove filename

    let currentParentId = vaultRootId;
    for (const segment of segments) {
      let folderId = await this.findFolder(segment, currentParentId);
      if (!folderId) {
        folderId = await this.createFolder(segment, currentParentId);
      }
      currentParentId = folderId;
    }
    return currentParentId;
  }

  async delete(_path: string, remoteId?: string): Promise<void> {
    if (!remoteId) return;
    const res = await this.fetchWithRetry(
      `https://www.googleapis.com/drive/v3/files/${remoteId}`,
      { method: "DELETE" },
    );
    if (!res.ok && res.status !== 404) {
      throw new Error(`Failed to delete file ${remoteId}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.accessToken) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${this.accessToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          },
        );
      } catch (err) {
        console.warn("Failed to revoke token during disconnect", err);
      }
    }
    this.accessToken = null;
    this.vaultFolderId = null;
    this.activeVaultId = null;
  }
}
