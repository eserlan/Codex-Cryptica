import { type ISyncBackend, type FileMetadata } from "./types";

export class FileSystemBackend implements ISyncBackend {
  constructor(private handle: FileSystemDirectoryHandle) {}

  async scan(_vaultId: string): Promise<{ files: FileMetadata[] }> {
    const results: FileMetadata[] = [];
    const scan = async (
      handle: FileSystemDirectoryHandle,
      path: string[] = [],
    ) => {
      for await (const entry of (handle as any).values()) {
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
      }
    };
    await scan(this.handle);
    return { files: results };
  }

  async download(path: string): Promise<Blob> {
    const fileHandle = await this.getFileHandle(path);
    return await fileHandle.getFile();
  }

  async upload(path: string, content: Blob): Promise<FileMetadata> {
    const fileHandle = await this.getFileHandle(path, true);
    const writable = await (fileHandle as any).createWritable({
      keepExistingData: false,
    });
    try {
      await writable.write(content);
      await writable.close();
    } catch (err) {
      await writable.abort();
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
    const pathParts = path.split("/");
    const fileName = pathParts.pop()!;
    const dirParts = pathParts;

    let current = this.handle;
    for (const part of dirParts) {
      current = await current.getDirectoryHandle(part);
    }
    await current.removeEntry(fileName);
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
