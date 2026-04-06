# Data Model: Vault Store Refactor

## Shared Types

### `VaultState`

```typescript
interface VaultState {
  status: "idle" | "loading" | "saving" | "error";
  syncType: "local" | null;
  syncStats: {
    updated: number;
    created: number;
    deleted: number;
    failed: number;
    total: number;
    progress: number;
  };
  hasConflictFiles: boolean;
  selectedEntityId: string | null;
}
```

## Service Data Owners

### `VaultRepository`

- **entities**: `$state<Record<string, LocalEntity>>`
- **saveQueue**: `KeyedTaskQueue`

### `SyncCoordinator`

- **syncHandle**: `FileSystemDirectoryHandle | null` (Persisted in IndexedDB)

### `MapRegistryStore` (Web App)

- **maps**: `$state<Record<string, Map>>`

### `CanvasRegistryStore` (Web App)

- **canvases**: `$state<Record<string, any>>`

### `VaultStore` (UI Controller)

- **isInitialized**: `$state<boolean>`
- **errorMessage**: `$state<string | null>`
- **defaultVisibility**: `$state<"visible" | "hidden">`
