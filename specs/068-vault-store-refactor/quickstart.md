# Quickstart: Implementing the Vault Store Refactor

## Steps

### 1. Initialize `@codex/vault-engine`

- **Location**: `packages/vault-engine/`
- **Task**: Setup `package.json` and basic directory structure.

### 2. Extract `VaultRepository`

- **Location**: `packages/vault-engine/src/repository.ts`
- **Task**: Move `loadFiles`, `saveToDisk`, and `entities` state management. Wrap the `KeyedTaskQueue`.
- **Verification**: Run `npm test` in the engine package.

### 3. Extract `AssetManager`

- **Location**: `packages/vault-engine/src/asset-manager.ts`
- **Task**: Move `saveImageToVault` and `resolveImageUrl` logic.
- **Verification**: Ensure images still load in the UI.

### 4. Extract `SyncCoordinator`

- **Location**: `packages/vault-engine/src/sync-coordinator.ts`
- **Task**: Move `syncToLocal` and `cleanupConflictFiles` logic.
- **Verification**: Verify local folder sync works across page reloads.

### 5. Refactor `VaultStore` (UI Layer)

- **Location**: `apps/web/src/lib/stores/vault.svelte.ts`
- **Task**: Inject the engine services and expose their reactive properties.
- **Verification**: All existing unit tests in `vault.test.ts` must pass.

### 6. Decouple Registry Stores

- **Location**: `apps/web/src/lib/stores/`
- **Task**: Create `map-registry.svelte.ts` and `canvas-registry.svelte.ts`.
