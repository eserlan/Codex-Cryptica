# Data Model: Robust GDrive Sync

## Sync Registry Schema (IndexedDB)

Reuses the `SyncEntry` schema defined in `packages/sync-engine/src/types.ts`, but extended slightly to accommodate GDrive-specific metadata if necessary.
For the initial implementation, `filePath` will map to the relative vault path, and we may add an index for `gdriveId`.

### Entity: `CloudSyncMetadata`

Stored in IndexedDB (e.g., `cloud_sync_metadata` store) alongside the regular file registry.

- `vaultId` (string, PK): The ID of the local vault linked to GDrive.
- `gdriveFolderId` (string): The ID of the root "Codex-Arcana/[Vault Name]" folder in Google Drive.
- `lastSyncToken` (string | null): The pagination token returned from the GDrive `changes` API after the last successful sync. Used for delta syncing.
- `lastSyncTime` (number): Epoch timestamp of the last complete successful sync cycle.

### Extended Entity: `SyncEntry`

(From `sync-engine/src/types.ts`)

- `filePath` (string, composite key)
- `vaultId` (string, composite key)
- `lastLocalModified` (number)
- `lastOpfsModified` (number)
- `size` (number)
- `status` ("SYNCED" | "DIRTY" | "CONFLICT")
  _Added for GDrive:_
- `remoteId` (string, optional): The Google Drive File ID corresponding to this path. Helps prevent duplicate file creation when a file is renamed locally.
- `remoteHash` (string, optional): The MD5 checksum returned by Google Drive to verify content integrity after download/before upload.

## State Transitions

1. **Initial Link**: `CloudSyncMetadata` created with `gdriveFolderId` and a fresh `lastSyncToken` from the API.
2. **Sync Cycle Start**: `status` changes from "SYNCED" to "DIRTY" for files detected as modified locally or remotely.
3. **Conflict Detected**: If `DiffAlgorithm` identifies a "Both Changed" scenario, action is determined by "Newest Wins".
4. **Sync Cycle End**: `lastSyncToken` updated in `CloudSyncMetadata`. All successfully processed files return to `status: "SYNCED"`.
