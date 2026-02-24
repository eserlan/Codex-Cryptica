# Data Model: Robust Local File Syncing

## Entities

### SyncMetadata

Tracks the state of a file at the point of the last successful synchronization. This allows the system to differentiate between a "new file" and a "deleted file".

| Field               | Type     | Description                                                                        |
| ------------------- | -------- | ---------------------------------------------------------------------------------- | ------- | ----------- |
| `filePath`          | `string` | Primary Key. The relative path from the vault root (e.g., `characters/eldrin.md`). |
| `vaultId`           | `string` | Index. ID of the vault this metadata belongs to.                                   |
| `lastLocalModified` | `number` | The `lastModified` timestamp of the local file at sync time.                       |
| `lastOpfsModified`  | `number` | The `lastModified` timestamp of the OPFS file at sync time.                        |
| `size`              | `number` | File size at sync time.                                                            |
| `status`            | `string` | `SYNCED`                                                                           | `DIRTY` | `CONFLICT`. |

## State Transitions

### File Sync Lifecycle

1. **Scanning**: Traverses OPFS and Local directories.
2. **Diffing**: Compares current state against `SyncMetadata`.
   - Missing in Local + In Registry -> **Delete in OPFS**.
   - Missing in OPFS + In Registry -> **Delete in Local**.
   - Missing in Registry + In Local -> **Create in OPFS**.
   - Missing in Registry + In OPFS -> **Create in Local**.
   - Timestamp Newer in Local -> **Update OPFS**.
   - Timestamp Newer in OPFS -> **Update Local**.
   - Both Newer -> **Conflict (Newest Wins)**.
3. **Execution**: Performs file operations.
4. **Finalizing**: Updates `SyncMetadata` with new timestamps.
