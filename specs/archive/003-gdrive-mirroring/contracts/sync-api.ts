/**
 * Cloud Bridge API Contracts
 * Defines the interface for the Sync Engine and Cloud Adapters.
 */

export interface CloudConfig {
  enabled: boolean;
  provider: "gdrive";
  lastSyncTimestamp?: number;
  syncInterval: number; // milliseconds
}

export interface SyncStats {
  filesUploaded: number;
  filesDownloaded: number;
  errors: number;
  duration: number;
}

export interface ICloudAdapter {
  /**
   * Authenticate the user.
   * @returns The user's email or identifier.
   */
  connect(): Promise<string>;

  /**
   * Disconnect/Sign out.
   */
  disconnect(): Promise<void>;

  /**
   * List all files in the app's folder.
   * @returns Map of relative path -> remote file ID + metadata
   */
  listFiles(): Promise<Map<string, RemoteFileMeta>>;

  /**
   * Upload a file.
   * @param path Relative path
   * @param content File content (Blob/Text)
   * @param parentId Optional parent folder ID
   * @returns New Remote Metadata
   */
  uploadFile(
    path: string,
    content: string | Blob,
    existingId?: string,
  ): Promise<RemoteFileMeta>;

  /**
   * Download a file.
   * @param fileId Remote File ID
   * @returns File content as text
   */
  downloadFile(fileId: string): Promise<string>;

  /**
   * Delete a file remotely.
   */
  deleteFile(fileId: string): Promise<void>;
}

export interface RemoteFileMeta {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string; // ISO
  parents: string[];
}

export type SyncStatus = "IDLE" | "SCANNING" | "SYNCING" | "ERROR";

export interface SyncState {
  status: SyncStatus;
  lastError?: string;
  stats?: SyncStats;
}
