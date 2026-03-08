import { type ISyncBackend, type FileMetadata } from "./types";

export class FileSystemBackend implements ISyncBackend {
  constructor(private handle: FileSystemDirectoryHandle) {}

  async scan(_vaultId: string): Promise<{ files: FileMetadata[] }> {
    const results: FileMetadata[] = [];
    const start = performance.now();
    let scannedCount = 0;

    const getTs = () => new Date().toISOString().split("T")[1].split("Z")[0];
    console.log(
      `[${getTs()}] [Sync] FileSystemBackend: Starting to read local folder contents... (This may take a while for large folders)`,
    );

    const scan = async (
      handle: FileSystemDirectoryHandle,
      path: string[] = [],
    ) => {
      try {
        const promises: Promise<void>[] = [];
        for await (const [name, entry] of (handle as any).entries()) {
          const currentPath = [...path, name];
          if (entry.kind === "file") {
            promises.push(
              (entry as FileSystemFileHandle).getFile().then((file) => {
                results.push({
                  path: currentPath.join("/"),
                  lastModified: file.lastModified,
                  size: file.size,
                  handle: entry as FileSystemFileHandle,
                });
                scannedCount++;
                if (scannedCount % 500 === 0) {
                  console.log(
                    `[${getTs()}] [Sync] FileSystemBackend: Scanned ${scannedCount} files so far...`,
                  );
                }
              }),
            );
          } else if (entry.kind === "directory") {
            promises.push(
              scan(entry as FileSystemDirectoryHandle, currentPath),
            );
          }
        }
        await Promise.all(promises);
      } catch (scanErr: any) {
        if (scanErr.name === "NotFoundError") return;
        throw scanErr;
      }
    };
    await scan(this.handle);
    const end = performance.now();
    console.log(
      `[${getTs()}] [Sync] FileSystemBackend scan took ${(end - start).toFixed(2)}ms for ${results.length} files.`,
    );
    return { files: results };
  }

  async download(path: string): Promise<Blob> {
    try {
      const fileHandle = await this.resolveFileHandle(path, false);
      return await fileHandle.getFile();
    } catch (err: any) {
      if (err.name === "NotFoundError") {
        throw new Error(`File not found: ${path}`, { cause: err });
      }
      throw err;
    }
  }

  async upload(path: string, content: Blob): Promise<FileMetadata> {
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        // Resolve leaf handle freshly from the root
        const fileHandle = await this.resolveFileHandle(path, true);

        // VERIFICATION: Ensure the handle is truly functional before opening writable
        await fileHandle.getFile().catch(() => {
          /* may not exist yet if just created */
        });

        const writable = await (fileHandle as any).createWritable({
          keepExistingData: false,
        });

        try {
          await writable.write(content);
          await writable.close();
        } catch (writeErr: any) {
          try {
            await writable.abort();
          } catch {
            /* ignore */
          }
          throw writeErr;
        }

        // Final verification of the written file
        const finalFileHandle = await this.resolveFileHandle(path, false);
        const updated = await finalFileHandle.getFile();

        return {
          path,
          lastModified: updated.lastModified,
          size: updated.size,
          handle: finalFileHandle,
        };
      } catch (err: any) {
        if (err.name === "NotFoundError" && retries > 1) {
          console.warn(
            `[FileSystemBackend] Refreshing root and retrying ${path}... (${retries - 1} left)`,
          );
          retries--;
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        console.error(
          `[FileSystemBackend] Critical upload failure for ${path}:`,
          err,
        );
        throw err;
      }
    }
    throw new Error(`Failed to upload ${path} after multiple retries.`);
  }

  async delete(path: string): Promise<void> {
    try {
      const pathParts = path.split("/").filter((p) => p.length > 0);
      if (pathParts.length === 0) return;

      const fileName = pathParts.pop()!;
      const dirParts = pathParts;

      let current = this.handle;
      for (const part of dirParts) {
        current = await current.getDirectoryHandle(part);
      }
      await current.removeEntry(fileName);
    } catch (err: any) {
      if (err.name === "NotFoundError") return;
      throw err;
    }
  }

  /**
   * Always resolves a path from the root handle to ensure we never use stale sub-handles.
   */
  private async resolveFileHandle(
    path: string,
    create: boolean,
  ): Promise<FileSystemFileHandle> {
    const parts = path.split("/").filter((p) => p.length > 0);
    const fileName = parts.pop()!;
    let currentDir = this.handle;

    // Verify root handle permission on every resolution
    try {
      if (
        (await (currentDir as any).queryPermission({ mode: "readwrite" })) !==
        "granted"
      ) {
        throw new Error("Permission to write to local directory was revoked.");
      }
    } catch {
      const err = new Error(
        "Local directory handle is completely disconnected.",
      );
      err.name = "NotFoundError";
      throw err;
    }

    for (const part of parts) {
      try {
        currentDir = await currentDir.getDirectoryHandle(part, { create });
      } catch (err: any) {
        if (err.name === "NotFoundError") {
          console.error(
            `[FileSystemBackend] Directory ${part} missing in path ${path} (create=${create})`,
          );
        }
        throw err;
      }
    }

    try {
      const fh = await currentDir.getFileHandle(fileName, { create });
      if (create) {
        // Force the OS to acknowledge the file creation
        await fh.getFile();
      }
      return fh;
    } catch (err: any) {
      if (err.name === "NotFoundError") {
        console.error(
          `[FileSystemBackend] File ${fileName} missing in path ${path} (create=${create})`,
        );
      }
      throw err;
    }
  }
}
