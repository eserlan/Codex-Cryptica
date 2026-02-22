export interface FileEntry {
  path: string;
  lastModified: number;
  handle: FileSystemFileHandle;
}

export class FileSystemAdapter {
  private async _getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
    return navigator.storage.getDirectory();
  }

  async listAllFiles(vaultId: string): Promise<FileEntry[]> {
    const root = await this._getOpfsRoot();
    try {
      const vaultRoot = await root.getDirectoryHandle(vaultId);
      const files: FileEntry[] = [];
      await this.scanDirectory(vaultRoot, "", files);
      return files;
    } catch (e) {
      console.warn(
        `[FileSystemAdapter] Vault directory '${vaultId}' not found in OPFS`,
        e,
      );
      return [];
    }
  }

  private async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    parentPath: string,
    files: FileEntry[],
  ) {
    for await (const [name, handle] of dirHandle.entries()) {
      // Skip .trash folder or other system folders if any
      if (name.startsWith(".")) continue;

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
        const subDir = handle as FileSystemDirectoryHandle;
        await this.scanDirectory(subDir, path, files);
      }
    }
  }

  async readFile(vaultId: string, path: string): Promise<Blob> {
    const handle = await this.getFileHandle(vaultId, path);
    return handle.getFile();
  }

  async writeFile(
    vaultId: string,
    path: string,
    content: Blob | string,
  ): Promise<void> {
    const handle = await this.getFileHandle(vaultId, path, true);
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  private async getFileHandle(
    vaultId: string,
    path: string,
    create = false,
  ): Promise<FileSystemFileHandle> {
    const root = await this._getOpfsRoot();
    const vaultRoot = await root.getDirectoryHandle(vaultId, { create });

    const parts = path.split("/");
    const fileName = parts.pop()!;
    let currentDir = vaultRoot;

    for (const part of parts) {
      if (!part) continue; // Skip empty parts from leading slashes
      currentDir = await currentDir.getDirectoryHandle(part, { create });
    }

    return currentDir.getFileHandle(fileName, { create });
  }
}
