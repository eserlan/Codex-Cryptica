import type { ICloudAdapter, RemoteFileMeta } from "../index";

const API_BASE = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3/files";

export class WorkerDriveAdapter implements ICloudAdapter {
  constructor(private accessToken: string, private folderId?: string) { }

  async connect(): Promise<string> {
    return "connected-via-token";
  }

  async disconnect(): Promise<void> {
    // No-op for worker adapter
  }

  private folderCache = new Map<string, string>(); // name -> id
  private folderPromises = new Map<string, Promise<string>>();

  async listFiles(): Promise<RemoteFileMeta[]> {
    if (!this.folderId) throw new Error("WorkerDriveAdapter: folderId is required");

    const fetchFromFolder = async (parentId: string, _prefix = ""): Promise<RemoteFileMeta[]> => {
      const url = new URL(API_BASE);
      url.searchParams.append("pageSize", "1000");
      url.searchParams.append(
        "fields",
        "files(id, name, mimeType, modifiedTime, parents, appProperties, thumbnailLink)",
      );
      url.searchParams.append(
        "q",
        `'${parentId}' in parents and trashed = false`,
      );

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (!res.ok) throw new Error(`GDrive List Error: ${res.statusText}`);
      const data = await res.json();

      const remoteFiles: RemoteFileMeta[] = [];
      const folders: { id: string, name: string }[] = [];

      if (data.files) {
        for (const file of data.files) {
          if (file.mimeType === "application/vnd.google-apps.folder") {
            folders.push({ id: file.id, name: file.name });
            // We don't add the folder itself to the file list for the engine
            // but we store it in cache for uploads
            this.folderCache.set(file.name, file.id);
          } else if (file.name && file.id) {
            remoteFiles.push({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType || "",
              modifiedTime: file.modifiedTime || "",
              parents: file.parents || [],
              appProperties: file.appProperties,
              thumbnailLink: file.thumbnailLink,
            });
          }
        }
      }

      // Recursively fetch subfolders (specifically 'images' for now to keep it efficient)
      // In a real app we might want a full tree, but for Codex Cryptica, one level is enough.
      for (const folder of folders) {
        if (folder.name === "images") {
          const subFiles = await fetchFromFolder(folder.id, `${folder.name}/`);
          remoteFiles.push(...subFiles);
        }
      }

      return remoteFiles;
    };

    return fetchFromFolder(this.folderId);
  }

  private async ensureFolder(name: string): Promise<string> {
    if (!this.folderId) throw new Error("WorkerDriveAdapter: folderId is required");
    if (this.folderCache.has(name)) return this.folderCache.get(name)!;

    // Check if there's already a creation in progress
    if (this.folderPromises.has(name)) {
      return this.folderPromises.get(name)!;
    }

    const creationPromise = (async () => {
      try {
        // Double check cache after entering promise
        if (this.folderCache.has(name)) return this.folderCache.get(name)!;

        // Search for existing
        const q = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and '${this.folderId}' in parents and trashed = false`;
        const url = new URL(API_BASE);
        url.searchParams.append("q", q);
        url.searchParams.append("fields", "files(id)");

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.files && data.files.length > 0) {
            const id = data.files[0].id;
            this.folderCache.set(name, id);
            return id;
          }
        }

        // Create new
        const createRes = await fetch(API_BASE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [this.folderId],
          }),
        });
        if (!createRes.ok) {
          const text = await createRes.text();
          throw new Error(`GDrive Folder Creation Error: ${createRes.statusText} - ${text}`);
        }
        const createData = await createRes.json();
        this.folderCache.set(name, createData.id);
        return createData.id;
      } finally {
        // Remove promise from tracker regardless of success/failure
        this.folderPromises.delete(name);
      }
    })();

    this.folderPromises.set(name, creationPromise);
    return creationPromise;
  }

  private getMimeType(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase();
    if (!ext || ext === path.toLowerCase()) {
      return "application/octet-stream";
    }
    switch (ext) {
      case "md":
        return "text/markdown";
      case "png":
        return "image/png";
      case "webp":
        return "image/webp";
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

    const mimeType = this.getMimeType(path);
    const pathParts = path.split("/").filter(Boolean);
    const fileName = pathParts.pop() || "unknown";
    const subfolderName = pathParts.length > 0 ? pathParts[0] : null;

    let parentId = this.folderId;
    if (subfolderName) {
      parentId = await this.ensureFolder(subfolderName);
    }

    const metadata = {
      name: fileName,
      mimeType: mimeType,
      parents: existingId ? undefined : [parentId],
      appProperties: {
        vault_path: path,
      },
    };

    // Resumable upload Step 1: Initialize session
    const method = existingId ? "PATCH" : "POST";
    const baseUrl = existingId ? `${UPLOAD_BASE}/${existingId}` : UPLOAD_BASE;
    const initUrl = new URL(baseUrl);
    initUrl.searchParams.append("uploadType", "resumable");

    const initRes = await fetch(initUrl.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
      },
      body: JSON.stringify(metadata),
    });

    if (!initRes.ok) {
      const errorText = await initRes.text();
      throw new Error(`GDrive Upload Session Error: ${initRes.statusText} - ${errorText}`);
    }

    const sessionUri = initRes.headers.get("Location");
    if (!sessionUri) {
      throw new Error("GDrive Upload Error: No Location header returned for resumable session");
    }

    // Step 2: Upload the actual content to the session URI
    const contentBlob =
      content instanceof Blob ? content : new Blob([content], { type: mimeType });

    const uploadRes = await fetch(sessionUri, {
      method: "PUT",
      body: contentBlob,
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`GDrive Content Upload Error: ${uploadRes.statusText} - ${errorText}`);
    }

    const file = await uploadRes.json();

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
