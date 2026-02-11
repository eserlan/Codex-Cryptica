export interface FileEntry {
  path: string;
  lastModified: number;
  handle: FileSystemFileHandle;
}

export class FileSystemAdapter {
  private async _getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
    return navigator.storage.getDirectory();
  }

  async listAllFiles(): Promise<FileEntry[]> {
    const root = await this._getOpfsRoot();
    const files: FileEntry[] = [];
    await this.scanDirectory(root, "", files);
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
        // We currently don't sync subdirectories in OPFS to GDrive in this manner
        // but this could be extended if needed.
      }
    }
  }

  async readFile(path: string): Promise<Blob> {
    const handle = await this.getFileHandle(path);
    return handle.getFile();
  }

  async writeFile(path: string, content: Blob | string): Promise<void> {
    const handle = await this.getFileHandle(path, true);
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  private async getFileHandle(
    path: string,
    create = false,
  ): Promise<FileSystemFileHandle> {
    const root = await this._getOpfsRoot();
    const parts = path.split("/");
    const fileName = parts.pop()!;
    let currentDir = root;

    for (const part of parts) {
      if (!part) continue; // Skip empty parts from leading slashes
      currentDir = await currentDir.getDirectoryHandle(part, { create });
    }

    return currentDir.getFileHandle(fileName, { create });
  }
}
