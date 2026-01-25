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

  async listAllFiles(): Promise<FileEntry[]> {
    await this.init();
    const files: FileEntry[] = [];
    if (!this.root) throw new Error('FS not initialized');

    await this.scanDirectory(this.root, '', files);
    return files;
  }

  private async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    parentPath: string,
    files: FileEntry[]
  ) {
    // @ts-expect-error - Iterating async iterable
    for await (const [name, handle] of dirHandle.entries()) {
      const path = parentPath ? `${parentPath}/${name}` : name;
      
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        files.push({
          path,
          lastModified: file.lastModified,
          handle: handle as FileSystemFileHandle,
        });
      } else if (handle.kind === 'directory') {
        await this.scanDirectory(handle as FileSystemDirectoryHandle, path, files);
      }
    }
  }

  async readFile(path: string): Promise<string> {
    await this.init();
    if (!this.root) throw new Error('FS not initialized');

    const handle = await this.getFileHandle(path);
    const file = await handle.getFile();
    return file.text();
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.init();
    if (!this.root) throw new Error('FS not initialized');

    const handle = await this.getFileHandle(path, true);
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  private async getFileHandle(path: string, create = false): Promise<FileSystemFileHandle> {
    if (!this.root) throw new Error('FS not initialized');
    
    const parts = path.split('/');
    const fileName = parts.pop()!;
    let currentDir = this.root;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create });
    }

    return currentDir.getFileHandle(fileName, { create });
  }
}
