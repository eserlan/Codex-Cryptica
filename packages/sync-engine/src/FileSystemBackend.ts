import { type ISyncBackend, type FileMetadata } from "./types";

export class FileSystemBackend implements ISyncBackend {
  constructor(private handle: FileSystemDirectoryHandle) {}

  async scan(_vaultId: string): Promise<{ files: FileMetadata[] }> {
    const results: FileMetadata[] = [];
    const scan = async (
      handle: FileSystemDirectoryHandle,
      path: string[] = [],
    ) => {
      try {
        for await (const entry of (handle as any).values()) {
          try {
            const currentPath = [...path, entry.name];
            if (entry.kind === "file") {
              const file = await (entry as FileSystemFileHandle).getFile();
              results.push({
                path: currentPath.join("/"),
                lastModified: file.lastModified,
                size: file.size,
                handle: entry as FileSystemFileHandle,
              });
            } else if (entry.kind === "directory") {
              await scan(entry as FileSystemDirectoryHandle, currentPath);
            }
          } catch (entryErr: any) {
            // If a file is deleted while we are scanning, just skip it
            if (entryErr.name === "NotFoundError") continue;
            throw entryErr;
          }
        }
      } catch (scanErr: any) {
        // If the directory itself was deleted while scanning, just return what we have
        if (scanErr.name === "NotFoundError") return;
        throw scanErr;
      }
    };
    await scan(this.handle);
    return { files: results };
  }

  async download(path: string): Promise<Blob> {
    try {
      const fileHandle = await this.getFileHandle(path);
      return await fileHandle.getFile();
    } catch (err: any) {
      if (err.name === "NotFoundError" || err.cause?.name === "NotFoundError") {
        throw new Error(`File not found: ${path}`, { cause: err });
      }
      throw err;
    }
  }

  async upload(path: string, content: Blob): Promise<FileMetadata> {
    const fileHandle = await this.getFileHandle(path, true);
    const writable = await (fileHandle as any).createWritable({
      keepExistingData: false,
    });
    try {
      await writable.write(content);
      await writable.close();
    } catch (err: any) {
      try {
        await writable.abort();
      } catch {
        // Ignore abort errors
      }
      throw err;
    }

    const updated = await fileHandle.getFile();
    return {
      path,
      lastModified: updated.lastModified,
      size: updated.size,
      handle: fileHandle,
    };
  }

  async delete(path: string): Promise<void> {
    try {
      const pathParts = path.split("/");
      const fileName = pathParts.pop()!;
      const dirParts = pathParts;

      let current = this.handle;
      for (const part of dirParts) {
        current = await current.getDirectoryHandle(part);
      }
      await current.removeEntry(fileName);
    } catch (err: any) {
      // If already deleted, that's fine
      if (err.name === "NotFoundError" || err.cause?.name === "NotFoundError")
        return;
      throw err;
    }
  }

  private async getFileHandle(path: string, create = false) {
    const pathParts = path.split("/");
    const fileName = pathParts.pop()!;
    const dirParts = pathParts;

    let current = this.handle;
    for (const part of dirParts) {
      current = await current.getDirectoryHandle(part, { create });
    }
    return await current.getFileHandle(fileName, { create });
  }
}
