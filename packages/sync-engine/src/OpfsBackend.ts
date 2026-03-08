import {
  type ISyncBackend,
  type FileMetadata,
  type OpfsStateEntry,
} from "./types";
import { SyncRegistry } from "./SyncRegistry";
import { hashBlob } from "./hash";

export class OpfsBackend implements ISyncBackend {
  constructor(
    private handle: FileSystemDirectoryHandle,
    private registry: SyncRegistry,
  ) {}

  async scan(vaultId: string): Promise<{ files: FileMetadata[] }> {
    const results: FileMetadata[] = [];
    const start = performance.now();
    const cachedEntries = await this.registry.getOpfsStatesByVault(vaultId);
    const cachedByPath = new Map(
      cachedEntries.map((entry) => [entry.filePath, entry]),
    );
    const refreshedEntries: OpfsStateEntry[] = [];

    const scan = async (
      dirHandle: FileSystemDirectoryHandle,
      path: string[] = [],
    ) => {
      try {
        for await (const [name, entry] of dirHandle) {
          try {
            const currentPath = [...path, name];
            if (entry.kind === "file") {
              const fileHandle = entry as FileSystemFileHandle;
              const file = await fileHandle.getFile();
              const relativePath = currentPath.join("/");
              const cached = cachedByPath.get(relativePath);
              let hash = cached?.hash;

              if (
                !cached ||
                cached.size !== file.size ||
                cached.lastModified !== file.lastModified
              ) {
                hash = await hashBlob(file);
                refreshedEntries.push({
                  vaultId,
                  filePath: relativePath,
                  hash,
                  size: file.size,
                  lastModified: file.lastModified,
                });
              }

              results.push({
                path: relativePath,
                lastModified: file.lastModified,
                size: file.size,
                handle: fileHandle,
                hash,
              });
            } else if (entry.kind === "directory") {
              await scan(entry as FileSystemDirectoryHandle, currentPath);
            }
          } catch (entryErr: any) {
            if (entryErr.name === "NotFoundError") continue;
            throw entryErr;
          }
        }
      } catch (scanErr: any) {
        if (scanErr.name === "NotFoundError") return;
        throw scanErr;
      }
    };

    await scan(this.handle);

    if (refreshedEntries.length > 0) {
      await this.registry.putOpfsStates(refreshedEntries);
    }

    const end = performance.now();
    console.log(
      `[Sync] OpfsBackend scan took ${(end - start).toFixed(2)}ms for ${results.length} files (${refreshedEntries.length} hashed, ${results.length - refreshedEntries.length} cached).`,
    );

    return { files: results };
  }

  async download(path: string): Promise<Blob> {
    const fileHandle = await this.resolveFileHandle(path, false);
    return fileHandle.getFile();
  }

  async upload(path: string, content: Blob): Promise<FileMetadata> {
    const fileHandle = await this.resolveFileHandle(path, true);
    const writable = await fileHandle.createWritable({
      keepExistingData: false,
    });

    try {
      await writable.write(content);
      await writable.close();
    } catch (writeErr) {
      try {
        await writable.abort();
      } catch {
        // ignore abort errors
      }
      throw writeErr;
    }

    const updated = await fileHandle.getFile();
    return {
      path,
      lastModified: updated.lastModified,
      size: updated.size,
      handle: fileHandle,
      hash: await hashBlob(updated),
    };
  }

  async delete(path: string): Promise<void> {
    const pathParts = path.split("/").filter((part) => part.length > 0);
    if (pathParts.length === 0) return;

    const fileName = pathParts.pop()!;
    let current = this.handle;
    for (const part of pathParts) {
      current = await current.getDirectoryHandle(part);
    }
    await current.removeEntry(fileName, { recursive: true });
  }

  private async resolveFileHandle(
    path: string,
    create: boolean,
  ): Promise<FileSystemFileHandle> {
    const parts = path.split("/").filter((part) => part.length > 0);
    const fileName = parts.pop();
    if (!fileName) {
      throw new Error(`Invalid path: ${path}`);
    }

    let currentDir = this.handle;
    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create });
    }

    return currentDir.getFileHandle(fileName, { create });
  }
}
