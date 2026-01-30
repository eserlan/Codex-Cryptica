# Data Model: Sync Refinement

**Feature**: Sync Refinement & Deletion Support (017-sync-refinement)

## Sync Metadata (IndexedDB)

The `SyncMetadata` entity tracks the relationship between local paths and remote IDs.

### `SyncMetadata`
| Field | Type | Description |
| :--- | :--- | :--- |
| `filePath` | `string` | Primary Key. Relative path in vault (e.g., `images/map.png`). |
| `remoteId` | `string` | Google Drive File ID. |
| `localModified` | `number` | Last seen local `lastModified` timestamp. |
| `remoteModified` | `string` | Last seen remote `modifiedTime` (ISO string). |
| `syncStatus` | `string` | Enum: `SYNCED`, `CONFLICT`. |

## Progress State (Worker Message)

Emitted from `sync.ts` worker to the main thread.

### `SyncProgress`
| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | `string` | `SYNC_PROGRESS` |
| `total` | `number` | Total files in current plan phase. |
| `current` | `number` | Number of files completed. |
| `phase` | `string` | `UPLOADING`, `DOWNLOADING`, `DELETING`. |
