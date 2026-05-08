# Vault I/O Improvements Proposal

> Status: Draft for discussion  
> Scope: Loading, saving, sync, and search-indexing across `sync-store`, `entity-store`, `lifecycle`, `VaultRepository`, `SearchStore`, `VaultEventBus`

---

## What I looked at

- `apps/web/src/lib/stores/vault/sync-store.svelte.ts` (315 lines)
- `apps/web/src/lib/stores/vault/entity-store.svelte.ts` (813 lines)
- `apps/web/src/lib/stores/vault/lifecycle.ts` (227 lines)
- `apps/web/src/lib/stores/vault/events.ts` (67 lines)
- `apps/web/src/lib/stores/vault/search-store.svelte.ts` (67 lines)
- `packages/vault-engine/src/repository.svelte.ts` (225 lines)
- `packages/vault-engine/src/queue.ts` (69 lines)
- ADRs 001, 002, 006, 008 and the three docs you linked

The architecture is genuinely solid — the modularisation ADR paid off and the event bus design is clean. What follows are targeted improvements, not a rewrite.

---

## Loading vault

### Issue L1: `CACHE_LOADED` indexing is serially awaited

**Where**: `search-store.svelte.ts:27–31`

```typescript
} else if (event.type === "CACHE_LOADED") {
  const services = await this.serviceRegistry.ensureInitialized();
  await services.search.clear();
  for (const entity of Object.values(event.entities)) {
    await this.indexEntity(entity); // ← awaits each one serially
  }
}
```

For a 500-entity vault this calls `services.search.index()` 500 times serially. Each call also re-runs `ensureInitialized()` (async, even when already ready) because `indexEntity` calls it internally.

Two fixes:

**L1a. Move `ensureInitialized()` out of the per-entity path.** Pass the resolved services in from the caller rather than re-resolving per entity.

**L1b. Parallelise the bulk index on CACHE_LOADED.** FlexSearch is synchronous under the hood so `Promise.all` here should be safe:

```typescript
const services = await this.serviceRegistry.ensureInitialized();
await services.search.clear();
await Promise.all(
  Object.values(event.entities).map((e) => this.indexEntity(e, services)),
);
```

---

### Issue L2: Extract `isStale()` — race-check boilerplate duplicated 7 times

**Where**: `sync-store.svelte.ts:75, 119, 149–150, 162, 176, 187, 233–234`

The guard `this.deps.activeVaultId() !== vaultIdAtStart || signal.aborted` appears verbatim seven times. It's easy to miss when adding a new async boundary and the inconsistent indentation makes it look like a one-off each time.

```typescript
// sync-store.svelte.ts
private isStale(vaultIdAtStart: string, signal: AbortSignal): boolean {
  return this.deps.activeVaultId() !== vaultIdAtStart || signal.aborted;
}
```

Every check becomes:

```typescript
if (this.isStale(vaultIdAtStart, signal)) return;
```

Pure readability win — no behaviour change.

---

### Issue L3: Vault switch double-sets `status = "loading"`

**Where**: `lifecycle.ts:172` and `sync-store.svelte.ts:48`

`switchVault` calls `this.deps.syncStore.setStatus("loading")` at line 172, then immediately calls `loadFiles()`, which unconditionally sets `this.status = "loading"` again at line 48. The first set is redundant.

Remove the `setStatus("loading")` call from `switchVault` and let `loadFiles` own the status transition from the start.

---

### Issue L4: Two content-loading helpers share 30 lines of duplicated logic

**Where**: `entity-store.svelte.ts:595` (`loadEntityContent`) and `entity-store.svelte.ts:767` (`internalLoadContent`)

`internalLoadContent` exists as a simpler OPFS-only read used exclusively as a pre-save content hydration step (called from `scheduleSave` at line 116, where calling the full `loadEntityContent` would risk re-entering the queue). The problem: the OPFS read logic is duplicated, so a fix in one doesn't carry to the other.

Extract the shared primitive:

```typescript
private async _readFromOpfs(id: string): Promise<{ content: string; lore: string } | null> {
  const entity = this.entities[id];
  if (!entity) return null;
  const path = entity._path || [`${id}.md`];
  const vaultDir = await this.deps.getActiveVaultHandle();
  if (!vaultDir) return null;
  const readFileAsText = this._helpers.readFileAsText
    || (await import("../../utils/opfs")).readFileAsText;
  const text = await readFileAsText(vaultDir, path).catch(() => null);
  if (!text) return null;
  const parseMarkdown = this._helpers.parseMarkdown
    || (await import("../../utils/markdown")).parseMarkdown;
  const { metadata, content } = parseMarkdown(text);
  return { content, lore: (metadata as any).lore || "" };
}
```

`internalLoadContent` becomes a thin wrapper around `_readFromOpfs`.  
`loadEntityContent` calls `_readFromOpfs` as its OPFS tier, keeping the cache and local-FS fallback tiers unchanged.

---

### Issue L5: Content-load state tracked via two parallel Sets

**Where**: `entity-store.svelte.ts:33–34`

```typescript
private _contentLoadedIds = $state(new Set<string>());
private _contentVerifiedIds = $state(new Set<string>());
```

"Loaded" means content is in memory from any source (cache hit, user edit). "Verified" means OPFS confirmed it. In practice almost every code path adds to both sets together — the only difference is the optimistic cache-first path in `loadEntityContent`, which adds to `_contentLoadedIds` but waits until OPFS reads before adding to `_contentVerifiedIds`.

This is correct but the naming is a footgun for anyone adding a new content path. Replacing two `Set<string>`s with a single `Map<string, 'cached' | 'verified'>` makes the two tiers explicit and the transitions obvious.

Lower priority — the current code works. Worth doing alongside any other EntityStore work.

---

## Saving / syncing vault

### Issue S1: No save debounce means O(keystrokes) disk writes

**Where**: `entity-store.svelte.ts:232`, `queue.ts`

Every call to `updateEntity()` immediately calls `scheduleSave()`, which immediately calls `saveQueue.enqueue()`. The `KeyedTaskQueue` serialises per entity, so rapid typing queues e.g. 50 saves for the same entity — all 50 run, each writing a full Markdown file to OPFS and updating Dexie. The last one wins but the first 49 are pure waste.

Add a per-entity debounce before enqueue:

```typescript
// entity-store.svelte.ts
private _saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

scheduleSave(entity: LocalEntity): Promise<void> {
  // ... existing guard clauses ...

  const existing = this._saveTimers.get(entity.id);
  if (existing) clearTimeout(existing);

  return new Promise((resolve) => {
    this._saveTimers.set(
      entity.id,
      setTimeout(() => {
        this._saveTimers.delete(entity.id);
        this.deps.repository.saveQueue
          .enqueue(entity.id, () => this._persistEntity(entity.id))
          .then(resolve);
      }, 400),
    );
  });
}
```

Suggested window: **400 ms** — coalesces bursts, still fast enough not to feel laggy.

**Important**: `waitForAllSaves()` must flush pending debounce timers before draining the queue, otherwise vault switching can miss in-flight edits.

---

### Issue S2: `waitForAllSaves()` has no timeout and can hang vault switching

**Where**: `lifecycle.ts:164`, `queue.ts:62`

```typescript
await this.deps.repository.waitForAllSaves(); // ← no timeout, no cancellation
```

The queue itself won't hang on errors (`.catch(() => {})` is swallowed correctly), but a save that _hangs_ — OPFS permission unexpectedly revoked, browser throttling an inactive tab — blocks vault switching indefinitely with no way out.

```typescript
async waitForAllSaves(timeoutMs = 8000): Promise<void> {
  const timeout = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("waitForAllSaves timed out")), timeoutMs)
  );
  try {
    await Promise.race([this.saveQueue.waitForAll(), timeout]);
  } catch (err) {
    console.warn("[VaultRepository] Save drain timed out — proceeding with vault switch", err);
  }
}
```

A warning rather than an error is right here — the user asked to switch, so proceeding is the correct behaviour.

---

### Issue S3: `batchUpdate` fires N individual `ENTITY_UPDATED` events

**Where**: `entity-store.svelte.ts:291–296`

`batchUpdate()` emits `ENTITY_UPDATED` for each entity inside the loop. For a bulk label operation across 200 entities, `SearchStore` receives 200 events and runs 200 serial `indexEntity()` calls. Same pattern in `bulkAddLabel` and `bulkRemoveLabel`.

Add a `BATCH_UPDATED` event type and handle it as a bulk operation in SearchStore:

```typescript
// events.ts — add new type
| { type: "BATCH_UPDATED"; vaultId: string; entities: LocalEntity[] }
```

```typescript
// entity-store.svelte.ts — emit once after the loop, not inside it
vaultEventBus.emit({
  type: "BATCH_UPDATED",
  vaultId: ...,
  entities: changedEntities,
});
```

```typescript
// search-store.svelte.ts
} else if (event.type === "BATCH_UPDATED") {
  const services = await this.serviceRegistry.ensureInitialized();
  await Promise.all(event.entities.map((e) => this.indexEntity(e, services)));
}
```

---

### Issue S4: `window.dispatchEvent('vault-switched')` bypasses VaultEventBus

**Where**: `lifecycle.ts:181–185`

```typescript
window.dispatchEvent(new CustomEvent("vault-switched", { detail: { id } }));
```

This is a raw DOM event that bypasses the typed bus. Any subscriber needs `window.addEventListener` and loses type safety. A `VAULT_SWITCHED` type on VaultEventBus removes the back-channel:

```typescript
// events.ts
| { type: "VAULT_SWITCHED"; vaultId: string }
```

```typescript
// lifecycle.ts
vaultEventBus.emit({ type: "VAULT_SWITCHED", vaultId: id });
```

---

### Issue S5: `repository.scheduleSave()` appears to be dead code

**Where**: `repository.svelte.ts:197–215`

`VaultRepository` has its own `scheduleSave()` that only writes to OPFS (no Dexie). `EntityStore.scheduleSave()` bypasses it and calls `repository.saveQueue.enqueue()` directly, handling Dexie itself. The repository method seems unreachable from the main write path.

Verify with a grep for callers — if nothing calls it, remove it to avoid confusion about which save path is canonical.

---

## Summary

| #   | Issue                                 | Category | Impact                   | Size   |
| --- | ------------------------------------- | -------- | ------------------------ | ------ |
| S1  | Debounce saves                        | Saving   | High (I/O)               | Medium |
| S2  | Timeout `waitForAllSaves`             | Saving   | High (correctness)       | Small  |
| L1  | Parallelise CACHE_LOADED indexing     | Loading  | Medium (perf)            | Small  |
| S3  | `BATCH_UPDATED` event type            | Saving   | Medium (perf)            | Medium |
| L4  | Consolidate content-load helpers      | Loading  | Medium (maintainability) | Medium |
| L2  | Extract `isStale()` helper            | Loading  | Low (readability)        | Tiny   |
| S4  | `VAULT_SWITCHED` on event bus         | Saving   | Low (consistency)        | Small  |
| L3  | Remove redundant status set           | Loading  | Low (cleanup)            | Tiny   |
| S5  | Remove dead `repository.scheduleSave` | Saving   | Low (clarity)            | Tiny   |
| L5  | Consolidate content-state Sets        | Loading  | Low (future safety)      | Medium |

**Suggested order**: S2 → S1 → L1 → S3 → L4 → rest

---

## What I would not change

- **The three-layer race defence** (vaultIdAtStart + AbortSignal + `_currentLoadId`). Verbose but each layer catches a distinct failure mode.
- **The cache-first load strategy**. The `skipSyncIfWarm` early return is the main reason warm loads feel instant.
- **The `KeyedTaskQueue` design**. Per-entity sequential queues are the right model. Debounce goes in front of it, not inside it.
- **Chunk size of 40 + 50ms yield in `VaultRepository`**. Intentional to keep the UI responsive during cold loads.
