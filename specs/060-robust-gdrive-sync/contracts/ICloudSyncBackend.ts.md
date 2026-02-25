# Contracts: Cloud Sync Backend

The `ICloudSyncBackend` interface extends the patterns established in `sync-engine` to decouple the sync coordination logic from Google Drive's specific APIs.

## `ICloudSyncBackend.ts`

```typescript
import { FileMetadata } from "./types";

export interface ICloudSyncBackend {
  /**
   * Initializes the connection to the cloud provider.
   * This handles OAuth token generation, refreshing, or prompting the user.
   */
  connect(): Promise<void>;

  /**
   * Retrieves the current user's details to verify connection.
   */
  getUserProfile(): Promise<{ email: string; name: string }>;

  /**
   * Retrieves a list of files that have changed since the last provided token.
   * If token is null, performs a full scan of the cloud vault.
   * @param vaultId The ID of the local vault
   * @param sinceToken Optional pagination token from the changes feed
   */
  scanChanges(
    vaultId: string,
    sinceToken: string | null,
  ): Promise<{
    files: FileMetadata[];
    nextToken: string;
  }>;

  /**
   * Downloads a file from the cloud to an ArrayBuffer or Blob.
   * Includes exponential backoff for rate limiting (429/500).
   * @param remoteId The cloud identifier for the file
   */
  downloadFile(remoteId: string): Promise<Blob>;

  /**
   * Uploads or creates a file in the cloud.
   * Includes exponential backoff for rate limiting (429/500).
   * @param path Relative path in the vault
   * @param content File contents
   * @param parentFolderId Optional cloud identifier of the parent folder
   */
  uploadFile(
    path: string,
    content: Blob,
    parentFolderId?: string,
  ): Promise<{
    remoteId: string;
    lastModified: number;
    hash: string;
  }>;

  /**
   * Deletes a file from the cloud backend.
   * @param remoteId The cloud identifier for the file
   */
  deleteFile(remoteId: string): Promise<void>;
}
```
