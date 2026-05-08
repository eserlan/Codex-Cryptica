# Data Model: Google Drive Cloud Sync

## Entities

### CloudSyncMetadata (existing — extended)

Stored in IndexedDB table `cloud_sync_metadata`, keyed by `vaultId`. This table already exists in `packages/sync-engine/src/types.ts` (`SyncDB`). No schema migration needed; all new fields are optional.

| Field              | Type             | Description                                                            |
| :----------------- | :--------------- | :--------------------------------------------------------------------- |
| `vaultId`          | `string`         | Primary key. The vault this record belongs to.                         |
| `remoteFolderId`   | `string`         | Drive folder ID for the vault root. Populated on first connect.        |
| `remoteFolderName` | `string?`        | Human-readable folder name. Informational only; never used for lookup. |
| `lastSyncToken`    | `string \| null` | Drive page token for incremental listing. Reserved for future use.     |
| `lastSyncTime`     | `number`         | Unix ms timestamp of the last successful Drive sync.                   |

### SyncEntry (existing — unchanged)

Stored in IndexedDB table `sync_registry`. The `remoteId` field already holds the Drive file ID for entries that have been uploaded, linking local file paths to their Drive counterparts.

| Field                  | Type                                | Description                                     |
| :--------------------- | :---------------------------------- | :---------------------------------------------- |
| `filePath`             | `string`                            | Relative path within the vault.                 |
| `vaultId`              | `string`                            | The vault this entry belongs to.                |
| `lastSyncedFsModified` | `number?`                           | Last-synced local filesystem modification time. |
| `lastSyncedOpfsHash`   | `string?`                           | SHA-256 of the OPFS file at last sync.          |
| `status`               | `"SYNCED" \| "DIRTY" \| "CONFLICT"` | Current sync state.                             |
| `remoteId`             | `string?`                           | Drive file ID. Set after first upload.          |

### DriveVaultConfig (runtime — in-memory only)

Not persisted. Held by `GDriveBackend` instance for the lifetime of the page session.

| Field         | Type     | Description                                          |
| :------------ | :------- | :--------------------------------------------------- |
| `folderId`    | `string` | The Drive folder ID loaded from `CloudSyncMetadata`. |
| `accessToken` | `string` | Current OAuth access token. In-memory only.          |
| `tokenExpiry` | `number` | Unix ms timestamp when the access token expires.     |

### GDriveFile (Drive API response — read only)

Shape of a Drive v3 file resource as returned by list/create/update calls.

| Field          | Type     | Description                                        |
| :------------- | :------- | :------------------------------------------------- |
| `id`           | `string` | Drive file ID.                                     |
| `name`         | `string` | File name as stored in Drive.                      |
| `modifiedTime` | `string` | ISO 8601 last-modified time.                       |
| `size`         | `string` | File size in bytes (Drive returns it as a string). |
| `mimeType`     | `string` | MIME type.                                         |

## Auth Token Model

The OAuth access token is managed exclusively by `GDriveAuthService`. Token storage rules:

- **In memory**: Current access token string and expiry timestamp.
- **In IndexedDB**: Nothing auth-related. Only `remoteFolderId` and sync timestamps.
- **In localStorage**: Nothing.
- **Reason**: Storing tokens in persistent browser storage creates a theft surface. GIS can silently refresh tokens on next page load at negligible latency cost.

## Validation Rules

- `CloudSyncMetadata.remoteFolderId` MUST be a non-empty string before any Drive operation is attempted.
- `SyncEntry.remoteId` MUST be set after the first successful upload of a file. Subsequent uploads MUST use this ID as the target (PATCH, not POST) to avoid creating duplicates.
- `GDriveAuthService` MUST reject Drive operations if `accessToken` is absent or expired and a refresh attempt has already failed in the current session.
- `GDriveBackend` MUST NOT be constructed without a valid `remoteFolderId`. The constructor throws if `folderId` is empty.
- Drive API error responses (non-2xx) MUST be surfaced as typed `DriveError` instances with `statusCode`, `domain`, and `message` fields so callers can distinguish auth failures from transient errors.
