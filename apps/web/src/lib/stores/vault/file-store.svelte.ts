import { type FileImportResult, FileManager } from "@codex/vault-engine";

export interface FileStoreDependencies {
  fileManager: FileManager;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  isGuest: () => boolean;
}

/** App-level adapter that keeps generic file persistence scoped to the active vault. */
export class FileStore {
  constructor(private deps: FileStoreDependencies) {}

  async importFile(file: File): Promise<FileImportResult> {
    if (this.deps.isGuest()) {
      return { ok: false, reason: "vault_unavailable" };
    }
    return this.deps.fileManager.importFile(
      await this.deps.getActiveVaultHandle(),
      file,
    );
  }
}
