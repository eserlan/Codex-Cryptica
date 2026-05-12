export interface SyncResult {
  updated: string[];
  created: string[];
  deleted: string[];
  conflicts: string[];
  error?: string;
}

export interface ILocalSyncService {
  /**
   * Triggers a bidirectional sync cycle.
   * @param vaultId The ID of the active vault.
   * @param localHandle The directory handle for the local folder.
   * @param opfsHandle The directory handle for the OPFS vault root.
   */
  sync(
    vaultId: string,
    localHandle: FileSystemDirectoryHandle,
    opfsHandle: FileSystemDirectoryHandle,
  ): Promise<SyncResult>;

  /**
   * Resets the sync registry for a specific vault.
   */
  resetRegistry(vaultId: string): Promise<void>;
}
