# Quickstart: #2145

## Intended API shape

```ts
const result = await vault.batchChangeEntityType(entityIds, nextType);
const deleted = await vault.batchDeleteEntities(entityIds);
await vault.flushPendingSaves();
```

Exact names should follow existing `batchUpdate` conventions during implementation. Existing single-entity methods remain compatible.

## Implementation order

1. Add delta-aware index-maintainer operations and tests; retain full rebuild for cache load/recovery.
2. Add coalesced explicit batch persistence and tests for debounce versus flush, partial failure, and vault switching.
3. Add pure batch type-change and relationship-aware delete helpers.
4. Add mutation-service orchestration and public `EntityStore`/`VaultStore` delegation.
5. Update table/bulk callers only where they currently loop over per-entity operations.
6. Run focused vault tests, Svelte autofixer for touched `.svelte.ts` files, workspace lint/type checks, and affected web tests.

## Safety checks

- Test guest/demo restrictions before disk writes.
- Assert no write uses a vault ID different from the ID captured at scheduling time.
- Assert partial failure returns failed IDs and does not erase successful results.
- Assert batch delete removes inbound references, child parent references, search records, and cache/files consistently.
