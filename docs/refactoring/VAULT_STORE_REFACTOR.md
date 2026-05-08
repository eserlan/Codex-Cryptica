# Assessment: VaultStore Refactoring (The God File Cleanup)

**File Path**: `apps/web/src/lib/stores/vault.svelte.ts`
**Current State**: ~1,260 lines, 70+ methods, high entropy.
**Objective**: Reduce `VaultStore` to a lean coordination shell (< 300 lines) by extracting specialized sub-stores and services.

## Current Responsibilities (The Bloat)

1.  **Reactive State Management**: Global status, error messages, sync stats, conflict flags.
2.  **Entity Cache & Indices**: Stores all entities and maintains derived indices like `labelIndex` and `inboundConnections`.
3.  **Sync Orchestration**: Coordinates complex flows between OPFS, Dexie cache, and Local Filesystem.
4.  **Conflict Handling**: Checks for `.conflict` files and manages resolution.
5.  **Asset Management**: Resolves URLs, saves images, and handles demo-mode asset redirection.
6.  **Service Integration**: Lazy-loads Search and AI services.
7.  **Event Coordination**: BroadcastChannel messaging and global event dispatching.

---

## Architectural Pillars

To ensure this refactor doesn't just move the mess around, we will adhere to two core principles:

### 1. Strict Dependency Injection (DI)

Every new sub-store and service must use **Constructor-based DI**.

- Avoid "closure soup" (passing 10+ callbacks to a constructor).
- Use clearly defined **Dependency Interfaces**.
- This ensures that every part of the vault system can be unit-tested without a browser environment.

### 2. Event-Driven Decoupling

Instead of stores calling each other directly, we will leverage the **`vaultEventBus`**.

- **`SyncStore`** emits events like `SYNC_CHUNK_READY` or `VAULT_OPENING`.
- **`EntityStore`** and **`SearchService`** listen to these events to update their internal state.
- This creates a **One-Way Data Flow** and prevents circular dependencies between specialized stores.

---

## Current Status

The refactor is **complete**. The monolith has been split into specialized sub-stores and managers, legacy layers have been collapsed, and the `VaultStore` façade has been reduced from ~1,260 lines to **280 lines** (a ~78% reduction). The architecture strictly adheres to constructor-based DI and event-driven decoupling.

### Implemented Pieces

- `EntityStore.svelte.ts` owns entity cache/index behavior, CRUD operations, and save coordination.
- `SyncStore.svelte.ts` owns sync orchestration, conflict handling, and file loading.
- `AssetStore.svelte.ts` owns asset URL resolution and persistence.
- `VaultStorageManager` (extracted to `storage.ts`) owns handle management for OPFS and Sync.
- `VaultLifecycleManager` handles complex lifecycle events like vault switching, deletion, and migration.
- `VaultMessenger` (extracted to `messenger.ts`) handles cross-tab synchronization and event-bus bridging.
- `ServiceRegistry` owns lazy-loading of search and AI services.
- `SearchStore` owns FlexSearch indexing and reactivity.

### Phase 3: Cleanup & Validation

- [x] **Task T006**: Simplify `VaultCrudManager` and `VaultLifecycleManager`. Merged `VaultCrudManager` into `EntityStore` and refactored `VaultLifecycleManager` to use DI.
- [x] **Task T007**: Run full unit test suite to ensure sync and persistence logic remains robust.
- [x] **Task T008**: Reach < 300 line target for `VaultStore.svelte.ts`. Accomplished by extracting `VaultStorageManager` and `VaultMessenger`.

---

## Expected Outcome

- `vault.svelte.ts` line count reduced by **~78%** (from 1,260 to 280), meeting the < 300 line objective.
- Improved testability: All specialized stores have direct unit tests and use constructor-based DI.
- Reduced cognitive load: `VaultStore` is now a thin coordination layer.
- Stable Façade: The public API of `VaultStore` remains backward-compatible for the UI layer.
