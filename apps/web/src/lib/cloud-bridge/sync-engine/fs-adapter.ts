export interface FileEntry {
  path: string;
  lastModified: number;
  logicalUpdatedAt?: number;
  handle: FileSystemFileHandle;
  size: number;
}

import { VAULTS_DIR } from "$lib/utils/opfs";

const WHITELISTED_SYSTEM_DIRS = [".codex"];

export class FileSystemAdapter {
  private async _getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
    return navigator.storage.getDirectory();
  }

  async listAllFiles(vaultId: string): Promise<FileEntry[]> {
    const root = await this._getOpfsRoot();
    try {
      const vaultsDir = await root.getDirectoryHandle(VAULTS_DIR);
      const vaultRoot = await vaultsDir.getDirectoryHandle(vaultId);
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
      // Skip hidden/system folders unless explicitly whitelisted for metadata
      const isWhitelisted = WHITELISTED_SYSTEM_DIRS.includes(name);
      if (name.startsWith(".") && !isWhitelisted) continue;

      const path = parentPath ? `${parentPath}/${name}` : name;

      if (handle.kind === "file") {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();

        let logicalUpdatedAt: number | undefined = undefined;

        // Optimization: Read the first 8KB of markdown files to extract updatedAt
        if (name.endsWith(".md") || name.endsWith(".markdown")) {
          try {
            const blob = file.slice(0, 8192);
            const text = await blob.text();
            const match = text.match(/^updatedAt:\s*(\d+)/m);
            if (match) {
              logicalUpdatedAt = parseInt(match[1], 10);
            }
          } catch (e) {
            console.warn(`Failed to extract updatedAt from ${path}`, e);
          }
        }

        files.push({
          path,
          lastModified: file.lastModified,
          logicalUpdatedAt,
          handle: fileHandle,
          size: file.size,
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
    const vaultsDir = await root.getDirectoryHandle(VAULTS_DIR, { create });
    const vaultRoot = await vaultsDir.getDirectoryHandle(vaultId, { create });

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
