import type { ICloudAdapter, RemoteFileMeta } from "../index";

const API_BASE = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3/files";

export class WorkerDriveAdapter implements ICloudAdapter {
  constructor(private accessToken: string, private folderId?: string) {}

  async connect(): Promise<string> {
    return "connected-via-token";
  }

  async disconnect(): Promise<void> {
    // No-op for worker adapter
  }

  async listFiles(): Promise<Map<string, RemoteFileMeta>> {
    if (!this.folderId) throw new Error("WorkerDriveAdapter: folderId is required");
    const url = new URL(API_BASE);
    url.searchParams.append("pageSize", "1000");
    url.searchParams.append(
      "fields",
      "files(id, name, mimeType, modifiedTime, parents, appProperties)",
    );
    url.searchParams.append(
      "q",
      `'${this.folderId}' in parents and trashed = false`,
    );

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) throw new Error(`GDrive List Error: ${res.statusText}`);
    const data = await res.json();

    const fileMap = new Map<string, RemoteFileMeta>();
    if (data.files) {
      for (const file of data.files) {
        // Use appProperties.vault_path as the key if available, fallback to name
        const vaultPath = file.appProperties?.vault_path || file.name;
        if (vaultPath && file.id) {
          fileMap.set(vaultPath, {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType || "",
            modifiedTime: file.modifiedTime || "",
            parents: file.parents || [],
            appProperties: file.appProperties,
          });
        }
      }
    }
    return fileMap;
  }

  private getMimeType(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "md":
        return "text/markdown";
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "json":
        return "application/json";
      default:
        return "application/octet-stream";
    }
  }

  async uploadFile(
    path: string,
    content: string | Blob,
    existingId?: string,
  ): Promise<RemoteFileMeta> {
    if (!this.folderId)
      throw new Error("WorkerDriveAdapter: folderId is required");
    const method = existingId ? "PATCH" : "POST";
    const baseUrl = existingId ? `${UPLOAD_BASE}/${existingId}` : UPLOAD_BASE;
    const url = new URL(baseUrl);
    url.searchParams.append("uploadType", "multipart");

    if (path.length > 100) {
      console.warn(`[WorkerDriveAdapter] Path length (${path.length}) exceeds safe appProperties limit (124 bytes). Sync may fail for: ${path}`);
    }

    const mimeType = this.getMimeType(path);
    const metadata = {
      name: path.split("/").pop(),
      mimeType: mimeType,
      parents: existingId ? undefined : [this.folderId],
      appProperties: {
        vault_path: path,
      },
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    form.append(
      "file",
      content instanceof Blob ? content : new Blob([content], { type: mimeType }),
    );

    const res = await fetch(url.toString(), {
      method,
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form,
    });

    if (!res.ok) throw new Error(`GDrive Upload Error: ${res.statusText}`);
    const file = await res.json();

    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      parents: file.parents,
      appProperties: file.appProperties,
    };
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const url = `${API_BASE}/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw new Error(`GDrive Download Error: ${res.statusText}`);
    return res.blob();
  }

  async deleteFile(fileId: string): Promise<void> {
    const url = `${API_BASE}/${fileId}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw new Error(`GDrive Delete Error: ${res.statusText}`);
  }
}
