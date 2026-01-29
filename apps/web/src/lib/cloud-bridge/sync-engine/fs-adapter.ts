export interface FileEntry {
  path: string;
  lastModified: number;
  handle: FileSystemFileHandle;
}

export class FileSystemAdapter {
  private root: FileSystemDirectoryHandle | null = null;

  async init(): Promise<void> {
    if (!this.root) {
      this.root = await navigator.storage.getDirectory();
    }
  }

  setRoot(handle: FileSystemDirectoryHandle) {
    this.root = handle;
  }

  async listAllFiles(): Promise<FileEntry[]> {
    await this.init();
    const files: FileEntry[] = [];
    if (!this.root) throw new Error("FS not initialized");

    await this.scanDirectory(this.root, "", files);
    return files;
  }

  private async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    parentPath: string,
    files: FileEntry[],
  ) {
    for await (const [name, handle] of dirHandle.entries()) {
      const path = parentPath ? `${parentPath}/${name}` : name;

      if (handle.kind === "file") {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        files.push({
          path,
          lastModified: file.lastModified,
          handle: fileHandle,
        });
      } else if (handle.kind === "directory") {
        await this.scanDirectory(
          handle as FileSystemDirectoryHandle,
          path,
          files,
        );
      }
    }
  }

  async readFile(path: string): Promise<Blob> {
    await this.init();
    if (!this.root) throw new Error("FS not initialized");

    const handle = await this.getFileHandle(path);
    return handle.getFile();
  }

  async writeFile(path: string, content: Blob | string): Promise<void> {
    await this.init();
    if (!this.root) throw new Error("FS not initialized");

    const handle = await this.getFileHandle(path, true);
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  private async getFileHandle(
    path: string,
    create = false,
  ): Promise<FileSystemFileHandle> {
    if (!this.root) throw new Error("FS not initialized");

    const parts = path.split("/");
    const fileName = parts.pop()!;
    let currentDir = this.root;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create });
    }

    return currentDir.getFileHandle(fileName, { create });
  }
}
