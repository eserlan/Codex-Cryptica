# Research & Technical Decisions: Vault Store Refactor

## Analyzed "God File": `apps/web/src/lib/stores/vault.svelte.ts` (1,381 lines)

### 1. I/O Orchestration

- **Current State**: Mix of `vaultIO` imports and direct `saveQueue` manipulation.
- **Decision**: Create `VaultRepository`. It will wrap the `KeyedTaskQueue` and coordinate between the in-memory `$state` and the `FileSystemDirectoryHandle`.
- **Rationale**: Isolates the "how" of storage (OPFS) from the "what" of state.

### 2. Synchronization Complexity

- **Current State**: `syncToLocal` is a 150-line method containing handle validation, permission requests, directory pickers, and UI notifications.
- **Decision**: Extract `SyncCoordinator`. This service will manage the lifecycle of a sync operation and the persistence of the `syncHandle`.
- **Rationale**: Reduces cognitive load when reading the core store.

### 3. Asset Management

- **Current State**: Image saving and URL resolution (with P2P/Guest fallbacks) are mixed in.
- **Decision**: Extract `AssetManager`. It will handle blob-to-OPFS logic and the complex URL resolution rules.
- **Rationale**: Asset handling is a distinct domain from entity metadata management.

### 4. Specialized Registries

- **Current State**: `maps` and `canvases` are reactive objects inside `VaultStore`.
- **Decision**: Move to `MapRegistryStore` and `CanvasRegistryStore` in `apps/web/src/lib/stores/`.
- **Rationale**: These domains have their own save triggers and state transitions that don't need to bloat the main vault controller.

## Technical Decisions

### 1. Dependency Injection (ADR 007)

- **Decision**: `VaultStore` will receive `repository`, `sync`, and `assets` via constructor.
- **Rationale**: Align with project mandate for unit-testability.

### 2. Package: `@codex/vault-engine`

- **Decision**: Logic moved to `packages/vault-engine`.
- **Rationale**: Library-First principle.

### 3. Event-Driven Decoupling

- **Decision**: Continue using `window.dispatchEvent` for "vault-switched" to notify disconnected components (like the graph).
- **Rationale**: Proven effective for cross-domain notification in this project.
