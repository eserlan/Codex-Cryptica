# Refactor Analysis: SearchService Monolith

**File:** `apps/web/src/lib/services/search.svelte.ts`  
**Current Size:** 923 lines  
**Status:** 🔴 God File  
**Tracking:** Issue #962 (parent #943)

## 1. Problem Statement

`SearchService` is a 923-line class that conflates six distinct responsibilities:

1. **Worker lifecycle** — spawning, wrapping, and terminating the Comlink-backed `SearchEngine` worker.
2. **Vault event routing** — subscribing to all `VAULT:*` events and deciding what indexing action each one triggers.
3. **Index persistence** — loading from and saving to IndexedDB, debounced auto-save, dirty-flag tracking.
4. **Progress state machine** — run IDs, dirty flags, retry queue, listener fan-out, status transitions (`idle → rebuilding → partial → ready / failed / cancelled`).
5. **Indexing pipeline** — chunked batching, progressive rebuild, background content sweep, retry orchestration.
6. **Search** — query dispatch to the worker plus QuickNote result merging.

Because these concerns share private fields (`activeVaultId`, `isDirty`, `activeRunId`, `pendingRetryEntities`) they cannot be tested independently. Every unit test must mock a worker, an event bus, and an IndexedDB — even tests that only care about a progress state transition.

## 2. Proposed Architecture

Extract two focused collaborators; keep `SearchService` as a thin facade over the indexing pipeline.

```
apps/web/src/lib/services/
  search.svelte.ts                  ← facade: worker lifecycle + indexing pipeline + search
  search-progress-coordinator.ts    ← new: progress state machine
  search-index-lifecycle.ts         ← new: vault event routing
```

### `SearchProgressCoordinator`

Owns all mutable run-tracking state:

- `progress`, `progressListeners`
- `isDirty`, `saveTimeout`, `activeVaultId`, `activeRunId`, `runCounter`
- `pendingRetryEntities`, `retryNeedsContentSweep`

Exposes: `emitProgress`, `getIndexProgress`, `subscribeIndexProgress`, `createRunId`, `isActiveRun`, `failIndexing`, `cancelIndexing`, `scheduleAutoSave`.

Constructor injection: `debug`, `timers`, `onScheduledSave: (vaultId) => Promise<void>`.  
**No dependency on the worker, event bus, or IndexedDB** — fully unit-testable in isolation.

### `SearchIndexLifecycle`

Owns all vault event subscriptions and the `visibilitychange` listener. Reads `coordinator.activeVaultId` for the stale-vault guard. Delegates every action through a typed callback object — never calls the worker API directly.

```ts
type LifecycleCallbacks = {
  onVaultSwitch(vaultId: string): Promise<void>;
  onColdBoot(vaultId: string, entities: unknown[]): Promise<void>;
  onWarmRestore(vaultId: string): Promise<void>;
  onSyncChunk(entities: unknown[]): Promise<void>;
  onSyncComplete(vaultId: string): Promise<void>;
  onEntityUpdated(entity: unknown, patch: unknown): Promise<void>;
  onEntityDeleted(entityId: string): Promise<void>;
  onBatchCreated(entities: unknown[]): Promise<void>;
  onBatchUpdated(
    entities: unknown[],
    patches: Record<string, unknown>,
  ): Promise<void>;
  onVisibilityHide(): void;
};
```

Constructor injection: `eventBus`, `coordinator`, `windowRef`, `documentRef`, `callbacks`.

### `SearchService` (after refactor)

Keeps: worker lifecycle (`initWorker`, `ensureWorker`, `terminate`, `init`), indexing pipeline (`index`, `remove`, `clear`, `indexBatch`, `rebuildFromEntities`, `indexContentInBackground`), public API (`search`, `loadIndex`, `saveIndex`, `retryIndexing`), entity mapping utilities.

Forwards `getIndexProgress`, `subscribeIndexProgress`, `cancelIndexing` to the coordinator.  
Constructs both collaborators in its constructor, wires itself as the callback target.

**Target size: ≤ 350 lines** (down from 923).

## 3. Phased Plan

### Phase 1 — Extract `SearchProgressCoordinator` (low risk)

- Move all state fields and methods listed above into the new class.
- `SearchService` constructs it and forwards the public progress API.
- Add `search-progress-coordinator.test.ts`: status transitions, listener isolation, save suppression during partial builds, no-op cancel guard.
- **Verify:** `pnpm test` — all existing search tests green.

### Phase 2 — Extract `SearchIndexLifecycle` (medium risk)

- Move the `eventBus.subscribe("VAULT:*", ...)` block and `visibilitychange` listener.
- Move `BATCH_UPDATED_SEARCH_FIELDS` filter logic here.
- Add `search-index-lifecycle.test.ts`: one test per event type, stale-vault guard, visibility listener, batch field filter.
- **Verify:** `pnpm test` — all existing search tests green.

### Phase 3 — Slim the facade (low risk)

- Remove any remaining forwarding stubs left as scaffolding.
- Confirm `search.svelte.ts` is ≤ 350 lines.
- Update `GOD_FILES_ANALYSIS.md`.

## 4. Key Constraints

- Public API of `SearchService` and the exported `searchService` singleton must stay unchanged — callers (`SearchModal`, `search-store.svelte.ts`) need no updates.
- All existing tests in `search.svelte.test.ts` and `search.test.ts` must pass without modification after each phase.
- No new `as any` casts.
- `activeVaultId` stays as the single source of truth in `SearchProgressCoordinator`; `SearchIndexLifecycle` reads it from the coordinator rather than maintaining a copy.
