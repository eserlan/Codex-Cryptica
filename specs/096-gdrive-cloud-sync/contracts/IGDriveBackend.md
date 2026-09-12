# Contract: IGDriveBackend

`GDriveBackend` implements `ISyncBackend` from `@codex/sync-engine` and is wired into `SyncService` as the optional remote backend.

## TypeScript Interface

```typescript
import type { ISyncBackend, FileMetadata } from "@codex/sync-engine";

/** Thrown by GDriveBackend for identifiable Drive API error conditions. */
export class DriveError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly domain:
      "auth" | "permission" | "not_found" | "server" | "network",
    message: string,
  ) {
    super(message);
    this.name = "DriveError";
  }
}

/**
 * Implements ISyncBackend against the Google Drive REST v3 API.
 * Requires a valid remoteFolderId from CloudSyncMetadata and
 * a live access token from GDriveAuthService.
 */
export interface IGDriveBackend extends ISyncBackend {
  /**
   * Ensures the backend has a valid access token and the target folder exists.
   * Must be called before any scan/download/upload/delete operation.
   * Throws DriveError(403) if the folder is not accessible.
   */
  connect(): Promise<void>;

  /**
   * Lists all files in the configured Drive folder.
   * Maps Drive file resources to FileMetadata, populating `handle` with Drive file ID.
   * `sinceToken` is reserved for future incremental listing support; currently ignored.
   */
  scan(
    vaultId: string,
    sinceToken?: string | null,
  ): Promise<{
    files: FileMetadata[];
    nextToken?: string;
  }>;

  /**
   * Downloads a file from Drive by its file ID.
   * `remoteId` is the Drive file ID (stored in SyncEntry.remoteId).
   */
  download(path: string, remoteId?: string): Promise<Blob>;

  /**
   * Uploads a new file or updates an existing one.
   * If `remoteId` is provided, issues a PATCH to update the existing file.
   * If `remoteId` is absent, issues a POST multipart request to create a new file.
   * Returns FileMetadata with `handle` set to the Drive file ID.
   */
  upload(path: string, content: Blob, remoteId?: string): Promise<FileMetadata>;

  /**
   * Deletes a file from Drive by its file ID.
   */
  delete(path: string, remoteId?: string): Promise<void>;

  /**
   * Sets the Drive folder ID for this backend instance.
   * Must be called before connect() if not set in constructor.
   */
  setVaultFolderId(folderId: string): void;
}
```

## GDriveAuthService Interface

```typescript
export interface IGDriveAuthService {
  /**
   * Initialises the GIS token client. Must be called once after the GIS
   * script is loaded. Safe to call multiple times (idempotent).
   */
  init(): void;

  /**
   * Returns a valid access token, silently refreshing if near expiry.
   * Shows the OAuth consent popup only when GIS indicates consent is required.
   * Throws if the user denies consent or refresh fails.
   */
  getAccessToken(): Promise<string>;

  /**
   * Returns true if the user has previously granted consent in this session.
   */
  isAuthorized(): boolean;

  /**
   * Revokes the current token and clears in-memory state.
   * Does NOT modify IndexedDB — caller is responsible for clearing
   * CloudSyncMetadata if a full disconnect is desired.
   */
  signOut(): void;
}
```

## Sync Events (module augmentation)

Registered in `packages/sync-engine/src/events.ts` via TypeScript module augmentation:

```typescript
declare module "@codex/events" {
  interface AppEventRegistry {
    "SYNC:DRIVE_CONNECTED": AppEventDefinition<
      "sync",
      { vaultId: string; folderId: string }
    >;
    "SYNC:DRIVE_DISCONNECTED": AppEventDefinition<"sync", { vaultId: string }>;
    "SYNC:DRIVE_SYNC_COMPLETE": AppEventDefinition<
      "sync",
      { vaultId: string; uploaded: number; downloaded: number }
    >;
    "SYNC:DRIVE_SYNC_FAILED": AppEventDefinition<
      "sync",
      { vaultId: string; error: string }
    >;
  }
}
```

## Behavioural Contracts

### connect()

- MUST throw `DriveError(401, "auth")` if no valid access token can be obtained after one refresh attempt.
- MUST throw `DriveError(404, "not_found")` if the configured `remoteFolderId` does not exist in Drive.
- MUST throw `DriveError(403, "permission")` if the folder exists but cannot be listed.
- On success, sets internal state so subsequent operations use the validated token.

### scan()

- MUST return an empty `files` array (not throw) if the folder is empty.
- File `handle` field MUST be set to the Drive file ID string for all returned entries.
- File `lastModified` MUST be parsed from the Drive `modifiedTime` ISO string to Unix ms.

### upload()

- MUST use a Drive v3 multipart upload (boundary-encoded) to set both metadata (name, parents) and content in a single HTTP request.
- When `remoteId` is provided, MUST PATCH the existing file rather than creating a new one, to avoid duplicate files in Drive.
- MUST return a `FileMetadata` with `handle` set to the Drive file ID of the created or updated file.

### Error Handling

- All public methods MUST catch Drive API non-2xx responses and rethrow as `DriveError` with appropriate `statusCode` and `domain`.
- `401` responses MUST trigger one silent token refresh attempt before rethrowing.
- `500`/`503` responses MUST be retried once with 500 ms delay before rethrowing as `DriveError(statusCode, "server")`.
- Network failures (no response) MUST be thrown as `DriveError(0, "network")`.
