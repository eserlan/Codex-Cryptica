# Data Model: Directional Vault Synchronization

## Core Entities

### Vault Metadata (Extended)

Tracks the synchronization state and timing for each vault.

| Field                | Type                        | Description                                                               |
| -------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `lastInternalChange` | `number` (Timestamp)        | Updated whenever an entity, map, or canvas is saved to OPFS.              |
| `lastSavedToFolder`  | `number` (Timestamp)        | Updated upon successful completion of a "Push" (Save) operation.          |
| `isDirty`            | `boolean` (Derived)         | `lastInternalChange > lastSavedToFolder`. Used to enable the Save button. |
| `syncFolderHandle`   | `FileSystemDirectoryHandle` | Stored in IndexedDB to maintain the link to the local folder.             |

### Sync Direction (Enum)

Determines which subset of changes the engine should process.

| Value  | Description                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| `push` | **OPFS → Local Folder**. Only `EXPORT_TO_FS` and `DELETE_FS` actions allowed.     |
| `pull` | **Local Folder → OPFS**. Only `IMPORT_TO_OPFS` and `DELETE_OPFS` actions allowed. |

### Sync Results

The response from the synchronization operation.

| Field     | Type       | Description                                      |
| --------- | ---------- | ------------------------------------------------ |
| `created` | `string[]` | Paths of newly created files.                    |
| `updated` | `string[]` | Paths of updated files.                          |
| `deleted` | `string[]` | Paths of deleted files.                          |
| `failed`  | `object[]` | List of `{ path, error }` for failed operations. |

## State Transitions

### Push Flow

1. **Trigger**: User clicks "SAVE TO FOLDER".
2. **State**: `status = 'saving'`.
3. **Action**: `syncEngine.sync(..., direction: 'push')`.
4. **Success**: `lastSavedToFolder = Date.now()`, `status = 'idle'`.
5. **UI**: Save button becomes disabled (Clean).

### Pull Flow

1. **Trigger**: User clicks "LOAD FROM FOLDER".
2. **Pre-Check**: If `isDirty`, show confirmation dialog.
3. **State**: `status = 'loading'`.
4. **Action**: `syncEngine.sync(..., direction: 'pull')`.
5. **Post-Action**: `loadFiles()` to refresh in-memory state.
6. **Success**: `status = 'idle'`.
