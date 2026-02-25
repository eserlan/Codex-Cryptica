# Contracts: Sync Backend

The `ISyncBackend` interface decouples the sync coordination logic from specific storage APIs (FileSystem, Google Drive, etc.).

## `ISyncBackend.ts`

```typescript
import { FileMetadata } from "./types";

export interface ISyncBackend {
  /**
   * Initializes the backend (auth, connection).
   */
  connect?(): Promise<void>;

  /**
   * Scans the backend for files.
   * For cloud backends, this uses a changes feed or recursive listing.
   * @param vaultId The ID of the local vault
   * @param sinceToken Optional pagination token for delta sync
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
   * @param path Relative path in the vault
   * @param remoteId Optional cloud identifier
   */
  download(path: string, remoteId?: string): Promise<Blob>;

  /**
   * Uploads or updates a file.
   * Includes exponential backoff for rate limiting.
   * @param path Relative path in the vault
   * @param content File contents
   * @param remoteId Optional cloud identifier for updates
   */
  upload(path: string, content: Blob, remoteId?: string): Promise<FileMetadata>;

  /**
   * Deletes a file.
   * @param path Relative path in the vault
   * @param remoteId Optional cloud identifier
   */
  delete(path: string, remoteId?: string): Promise<void>;
}
```
