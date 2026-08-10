# Research: #2145 Delta-Based Mutations and Bulk APIs

## Decision: Extend existing vault mutation services

`EntityStore` already delegates to `EntityMutationService`, `EntityPersistenceService`, `EntityIndexMaintainer`, and pure helpers in `entities.ts`. `VaultStore` exposes `updateEntity`, `batchUpdate`, and `deleteEntity` but no batch type-change/delete methods. Add the behavior to those seams instead of creating a parallel mutation manager.

## Decision: Send explicit deltas to index maintenance

`EntityStore.handleEntitiesUpdate(oldMap, newMap)` currently enumerates both full maps. Single updates already know the previous and next entity in `EntityMutationService`. Add delta operations for added, updated, and deleted entities while retaining full rebuild for load/recovery.

## Decision: Coalesce persistence by explicit batch flush

`EntityPersistenceService.scheduleSave` debounces each entity for 400 ms, while bulk operations schedule one save per entity. Add a batch scheduling/flush seam that captures one vault context, coalesces repeated IDs, and reuses the existing per-entity disk/retry primitive. Explicit batch operations call it immediately; continuous edits remain debounced.

## Decision: Use result objects for partial failure

Existing mutation methods return booleans/counts and persistence catches disk errors internally. Define a result containing successful IDs, failed IDs with messages, skipped IDs, and cancellation state. Keep existing methods compatible where callers do not need detail.

## Decision: Preserve relationship cleanup semantics

`entities.deleteEntity` already removes OPFS files, images, inbound connections, and child parent references. Factor the pure state/relationship cleanup into a batch-capable helper, then perform file/cache deletion and modified-entity writes through the batch orchestrator.

## Resolved product choices

Bulk type change is a metadata mutation over valid IDs; unknown/duplicate IDs are reported without aborting valid work. Guest deletion remains forbidden and demo mode retains its current in-memory-only behavior. No new package is planned because the change is app/vault-store specific.
