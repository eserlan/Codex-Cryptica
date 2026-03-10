import { type DBSchema } from "idb";

export interface FileMetadata {
  path: string;
  lastModified: number;
  size: number;
  handle?: FileSystemFileHandle | string; // e.g. FileSystemFileHandle or remoteId
  hash?: string; // Content fingerprint
  isDeleted?: boolean;
}

export interface SyncResult {
  updated: string[];
  created: string[];
  deleted: string[];
  conflicts: string[];
  failed: Array<{ path: string; error: string }>;
  error?: string;
}

export interface ISyncBackend {
  /**
   * Initializes the backend (auth, connection).
   */
  connect?(): Promise<void>;

  /**
   * Scans the backend for files.
   */
  scan(
    vaultId: string,
    sinceToken?: string | null,
  ): Promise<{
    files: FileMetadata[];
    nextToken?: string;
  }>;

  /**
   * Downloads a file content.
   */
  download(path: string, remoteId?: string): Promise<Blob>;

  /**
   * Uploads or updates a file.
   */
  upload(path: string, content: Blob, remoteId?: string): Promise<FileMetadata>;

  /**
   * Deletes a file.
   */
  delete(path: string, remoteId?: string): Promise<void>;

  /**
   * Manually sets the target folder ID for the vault.
   */
  setVaultFolderId?(folderId: string): void;
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

export interface SyncEntry {
  filePath: string;
  vaultId: string;
  lastSyncedFsModified?: number;
  lastSyncedFsSize?: number;
  lastSyncedOpfsHash?: string;
  status: "SYNCED" | "DIRTY" | "CONFLICT";
  remoteId?: string; // Kept for generic remote ID support
}

export interface OpfsStateEntry {
  vaultId: string;
  filePath: string;
  hash: string;
  size: number;
  lastModified: number;
}

export interface CloudSyncMetadata {
  vaultId: string;
  remoteFolderId: string;
  remoteFolderName?: string;
  lastSyncToken: string | null;
  lastSyncTime: number;
}

export interface SyncDB extends DBSchema {
  sync_registry: {
    key: [string, string];
    value: SyncEntry;
    indexes: {
      "by-vault": string;
      "by-remote-id": string;
    };
  };
  cloud_sync_metadata: {
    key: string;
    value: CloudSyncMetadata;
  };
  opfs_file_state: {
    key: [string, string];
    value: OpfsStateEntry;
    indexes: {
      "by-vault": string;
    };
  };
}
