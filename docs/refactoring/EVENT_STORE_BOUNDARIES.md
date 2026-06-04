# Event And Store Boundaries Refactoring

> **Status**: Implemented  
> **Scope**: Vault Event Handling, Async Race Defenses, and Store Dependency Injection across `events.svelte.ts`, `sync-store.svelte.ts`, `search.svelte.ts`, `entity-mutations.ts`, `entity-persistence.ts`, and core packages.

---

## 1. Problem Statement

As Codex Cryptica evolves, its local-first, reactive store architecture handles an increasing volume of concurrent file writes, index updates, and vault transitions. Three areas were identified as introducing runtime inefficiency, maintainability overhead, or potential race conditions:

1. **Missing `BATCH_UPDATED` handler in `SearchService`**: Bulk operations (`batchUpdate`, `bulkAddLabel`, `bulkRemoveLabel`) correctly emit `BATCH_UPDATED` events through the vault and app event buses, but `SearchService` had no handler for `VAULT_EVENTS.BATCH_UPDATED`. These events were silently dropped, leaving the search index stale after any bulk mutation. `BATCH_CREATED` was already handled.

2. **Sequential saves in bulk label mutations**: `bulkAddLabel` and `bulkRemoveLabel` in `EntityMutationService` awaited `scheduleSave()` inside a `for` loop. Because `scheduleSave` resolves after its 400 ms debounce fires and the disk write completes, this serialised saves per entity — approximately 400 ms × N per bulk operation. `batchUpdate` already used `Promise.all` correctly; the bulk-label methods were inconsistent with it.

3. **No shared stale-operation guard**: `SyncStore` had already extracted the vault-switch staleness check into a private `isStale(vaultIdAtStart, signal)` method. No shared utility existed for new services that add vault-scoped async flows, increasing the risk of developers reinlining the check or getting the signature wrong.

> **What was already correct**: The `VaultEventBus` → `AppEventBus` bridge in `events.svelte.ts` already forwarded both `BATCH_CREATED` and `BATCH_UPDATED` with full payloads. Constructor-based dependency injection via explicit `*Dependencies` interfaces was already applied consistently across `SearchService`, `EntityStore`, `EntityMutationService`, `EntityPersistenceService`, and `SyncStore`.

---

## 2. Completed Changes

### A. `BATCH_UPDATED` handler in `SearchService`

**File**: `apps/web/src/lib/services/search.svelte.ts`

Added a `VAULT_EVENTS.BATCH_UPDATED` case to the existing `VAULT:*` subscription switch. Uses the same `indexBatch` path already used for `BATCH_CREATED`:

```typescript
case VAULT_EVENTS.BATCH_UPDATED: {
  const entities = this.normalizeEntities(event.payload.entities);
  if (entities.length > 0) {
    await this.indexBatch(entities);
  }
  break;
}
```

Bulk label operations, `batchUpdate`, and any future batch mutation that emits `BATCH_UPDATED` now keep the search index current without requiring a full rebuild.

---

### B. Concurrent saves in `bulkAddLabel` and `bulkRemoveLabel`

**File**: `apps/web/src/lib/stores/vault/entity-mutations.ts`

Replaced the sequential `await` inside each loop with the `Promise.all` pattern already used by `batchUpdate`. Applies to both `bulkAddLabel` and `bulkRemoveLabel`:

```typescript
// Before — awaited each 400 ms debounce + write in series
for (const id of modifiedIds) {
  const entity = entities[id];
  if (entity) {
    await this.deps.persistence.scheduleSave(entity);
    changed.push(entity);
  }
}

// After — schedules all concurrently, awaits completion once
const savePromises: Promise<void>[] = [];
for (const id of modifiedIds) {
  const entity = entities[id];
  if (entity) {
    savePromises.push(this.deps.persistence.scheduleSave(entity));
    changed.push(entity);
  }
}
await Promise.all(savePromises);
```

`BATCH_UPDATED` is emitted after `Promise.all` resolves, so downstream listeners (including `SearchService`) receive the event only after all saves are scheduled.

---

### C. `createStaleGuard` shared utility

**File**: `apps/web/src/lib/stores/vault/utils.ts` _(new)_

Canonicalises the vault-switch staleness check as a module-level factory function. Captures the active vault ID at call time and returns a predicate that returns `true` when an async operation should be abandoned:

```typescript
export function createStaleGuard(getActiveId: () => string | null) {
  const startId = getActiveId();
  return (signal?: AbortSignal): boolean =>
    getActiveId() !== startId || (signal?.aborted ?? false);
}
```

`SyncStore`'s existing private `isStale()` method matches this shape exactly; it is not changed. The utility is the canonical pattern for any new service that adds vault-scoped async flows.

---

## 3. Remaining Work

### D. Remove `ENTITY_UPDATED` from connection mutation methods ✅ Done

**File**: `apps/web/src/lib/stores/vault/entity-mutations.ts`

`addConnection`, `updateConnection`, and `removeConnection` all emit `ENTITY_UPDATED` with a `{ connections: [...] }` patch. Connections are not indexed by `SearchService` (the field guard already skips it), and the only other `ENTITY_UPDATED` listener — `quicknoteStore` — only reacts to `patch.status === "active"`, which connection patches never set. The redundant events add unnecessary dispatch and fan-out cost per connection edit.

- `removeConnection`: remove `ENTITY_UPDATED`, keep `CONNECTION_REMOVED` (already emitted).
- `addConnection` / `updateConnection`: remove `ENTITY_UPDATED`. Svelte 5 reactivity on `this.entities` drives UI re-renders; no event is needed.

---

### E. `flushPendingSaves` vault guard ✅ Done

**File**: `apps/web/src/lib/stores/vault/entity-persistence.ts`

`scheduleSave` captures `vaultIdAtStart` at call time and passes it to `_persistEntity`, which correctly discards the save if the vault has since changed. However, `flushPendingSaves` calls `this.deps.activeVaultId()` fresh at flush time, so all pending saves from the previous vault are flushed under whatever vault is active at that moment. Fix: store the vault ID per entity alongside its debounce timer in a `_saveVaultIds` map, and use that in `flushPendingSaves` instead of re-reading the active vault.

---

### F. `VAULT_OPENING` / `indexQueue` race — investigated, no action needed

`SearchService.clear()` bypasses `indexQueue` and calls `api.clear()` directly on the worker. The concern was that in-flight `addBatch` calls already sent to the worker could land after `clear()`. Investigation shows this is safe: the worker processes commands sequentially, so a `clear()` dispatched after a stale `addBatch` will always execute after it, leaving the index empty and correct. The `isActiveRun` guard additionally prevents new chunks from being sent between chunks once `cancelIndexing` fires. No code change required.

---

### G. `BATCH_UPDATED` test coverage ✅ Done

**File**: `apps/web/src/lib/services/search.svelte.test.ts` _(new)_

Focused unit tests for `SearchService`'s event-driven indexing paths:

- `BATCH_UPDATED` causes `indexBatch` to be called with the correct entity list.
- `BATCH_CREATED` causes `indexBatch` to be called (regression guard).
- `ENTITY_UPDATED` with a connection-only patch does **not** trigger indexing.
- `createStaleGuard` returns `true` on vault change, `true` on abort, `false` when neither holds.

---

## 4. Constitutional Rules (forward-looking)

These rules were already followed by existing stores and are recorded here for clarity:

- **Constructor DI**: Every new store or manager under `apps/web/src/lib/stores/` must define a `*Dependencies` interface and accept it via the constructor. The singleton export provides defaults via `deps.foo ?? fooDefault`. Dependency types must be explicit interfaces or imported class types — not `typeof singleton`, which binds to implementation shape rather than contract.
- **Stale-guard pattern**: New vault-scoped async operations must call `createStaleGuard` from `vault/utils.ts` at the start of the operation and check its result after each `await` that crosses a user-interaction boundary.
- **Batch events over fan-out**: Bulk mutations must emit a single `BATCH_CREATED` or `BATCH_UPDATED` event, not one `ENTITY_UPDATED` per entity. Downstream listeners (search, UI views) must handle batch events directly.
- **Connection mutations**: `addConnection`, `updateConnection`, and `removeConnection` must not emit `ENTITY_UPDATED`. Use `CONNECTION_REMOVED` for removal; Svelte 5 store reactivity drives UI for add and update.

---

## 5. Payoffs

| Area                    | Outcome                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Search correctness**  | Bulk label changes and `batchUpdate` now keep the index current without a manual rebuild.                           |
| **Bulk mutation speed** | `bulkAddLabel` / `bulkRemoveLabel` no longer block for `400 ms × N` on saves; all debounce timers fire in parallel. |
| **Async safety**        | `createStaleGuard` provides a single, tested implementation of the vault-switch check for new services.             |
| **Event semantics**     | Connection mutations no longer emit a generic entity-changed event; each mutation type has a clear, correct event.  |
| **Save correctness**    | `flushPendingSaves` uses the vault ID captured at schedule time, not at flush time.                                 |
| **Maintainability**     | Constitutional rules are explicit and grounded in existing patterns rather than aspirational.                       |

---

## 6. Testing

- **All suites**: 128 tests passing across `search.svelte.test`, `entity-store.test`, `search-store.test`, `lifecycle.test`, `events.test`, `entities.test`.
- **New suite** (`search.svelte.test.ts`): 22 tests covering `BATCH_UPDATED` indexing, `BATCH_CREATED` regression guard, `ENTITY_UPDATED` connection-only patch guard, and all `createStaleGuard` branches.
