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

import { type DBSchema } from "idb";

export interface SyncEntry {
  filePath: string;
  vaultId: string;
  lastLocalModified: number;
  lastOpfsModified: number;
  size: number;
  status: "SYNCED" | "DIRTY" | "CONFLICT";
}

export interface SyncDB extends DBSchema {
  sync_registry: {
    key: [string, string];
    value: SyncEntry;
    indexes: {
      "by-vault": string;
    };
  };
  [key: string]: any;
}

export interface FileMetadata {
  path: string;
  lastModified: number;
  size: number;
  handle: FileSystemFileHandle;
}
