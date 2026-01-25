# Data Model: Google Drive Cloud Bridge

**Feature**: Google Drive Cloud Bridge
**Status**: Phase 1 Design

## Entities

### 1. Cloud Configuration (`CloudConfig`)
Persisted in `localStorage` or `IndexedDB` (global settings).

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Master switch for the cloud bridge. |
| `provider` | `'gdrive'` | The cloud provider (extensible for future). |
| `connectedEmail` | `string` | The email address of the connected account (for display). |
| `lastSyncTimestamp` | `number` | Unix timestamp of the last successful sync cycle. |
| `syncInterval` | `number` | Time in ms between auto-syncs (default: 300000 = 5m). |

### 2. Sync Metadata (`SyncMetadata`)
Persisted in `IndexedDB` (Object Store: `sync_metadata`).
Tracks the state of each file to optimize sync and detect changes.

| Field | Type | Description |
|-------|------|-------------|
| `filePath` | `string` | **PK**. Relative path in OPFS (e.g., `locations/castle.md`). |
| `remoteId` | `string` | Google Drive File ID. |
| `localModified` | `number` | Last modified time of the local file at time of sync. |
| `remoteModified` | `string` | ISO string from GDrive of the remote file at time of sync. |
| `etag` | `string` | Google Drive ETag for optimistic concurrency. |
| `syncStatus` | `enum` | `SYNCED`, `DIRTY`, `CONFLICT` (runtime only). |

## State Transitions

### Sync Cycle
1.  **Idle** -> **Scanning** (Checking local vs remote lists)
2.  **Scanning** -> **Syncing** (Uploading/Downloading)
3.  **Syncing** -> **Idle** (Success)
4.  **Syncing** -> **Error** (Network fail / Auth fail)
