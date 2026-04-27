# Contract: Synchronization Service

## Types

```typescript
type SyncDirection = 'push' | 'pull';

interface SyncOptions {
  direction: SyncDirection;
  signal?: AbortSignal;
  onProgress?: (stats: SyncStats) => void;
}

interface SyncStats {
  updated: number;
  created: number;
  deleted: number;
  failed: number;
  total: number;
}
```

## Methods

### `SyncService.sync(vaultId, fsBackend, opfsBackend, options)`
Performs a unidirectional synchronization between the two backends.

- **Push (`OPFS -> FS`)**:
    - Generates diff between OPFS and FS.
    - Filters for `EXPORT_TO_FS` and `DELETE_FS` actions.
    - Updates `lastSyncedOpfsHash` and FS metadata in the registry.
- **Pull (`FS -> OPFS`)**:
    - Generates diff between FS and OPFS.
    - Filters for `IMPORT_TO_OPFS` and `DELETE_OPFS` actions.
    - Updates registry with new metadata.
