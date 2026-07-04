# Research: Entity Table / List View

> Retroactive record. These are the decisions the implementation actually made (PRs #1512, #1520, #1521, #1588), written up in research format so future slices inherit the rationale.

## Decision 1: Peer view over the active vault (no route-level data loading)

- **Decision**: `/table` is a peer view like `/map` and `/timeline`: it reads `vault.activeVaultId` / `vault.allEntities` from the existing store, with `ssr = false`.
- **Rationale**: The vault already lives client-side (OPFS); loading it again per-route would duplicate state and break the local-first model (constitution V). Empty/loading states cover the not-ready cases.
- **Alternatives considered**: Route `load()` with vault id param (rejected: table is vault-global, not entity-scoped; would fragment the "active vault" concept).

## Decision 2: Reuse Explorer filter logic instead of table-specific filtering

- **Decision**: Import `filterEntities` and `countEntityTypes` from `$lib/components/explorer/entityListFiltering`.
- **Rationale**: Identical semantics across Explorer and Table (search by name/content/`#label`, type sets, label sets) with zero duplication — required by constitution III's DRY rule.
- **Alternatives considered**: Bespoke table filter module (rejected: would drift from Explorer behavior and duplicate tested logic).

## Decision 3: Pure-function sort module with missing-values-last

- **Decision**: `entityTableSort.ts` exports `sortEntities(entities, sort, connectionCounts)` (returns a new array) and `nextSortState`. Entities missing the sorted value (timestamp, label) sort last **regardless of direction**; all comparisons tie-break on title.
- **Rationale**: The table's maintenance purpose means gaps must stay visible at the bottom instead of hiding among sorted values; title tie-break gives stable, predictable output. Pure functions make the logic trivially unit-testable (constitution II, X).
- **Alternatives considered**: Treating missing as 0/empty-string (rejected: interleaves gaps with real data); a table library with built-in sorting (rejected: YAGNI for 7 fixed columns).

## Decision 4: Timestamp and label resolution with legacy fallbacks

- **Decision**: `getEntityModifiedAt` = `modifiedAt ?? updatedAt ?? lastUpdated`; `getEntityLabels` = `labels` if non-empty else `tags ?? []`.
- **Rationale**: Vaults predate the `createdAt`/`modifiedAt` fields (added in #1516 era) and the labels rename (constitution XII); old entities must still show sensible values without a data migration.
- **Alternatives considered**: One-off vault migration writing canonical fields (rejected for read-only view: mutating user data as a side effect of rendering violates least surprise).

## Decision 5: Precomputed connection summaries

- **Decision**: Compute `Record<entityId, {inbound, outbound, total}>` once per vault change in `$derived.by`, using imperative loops; count only outbound connections with a resolved `target`.
- **Rationale**: Per-row recomputation would be O(rows × connections) on every reactive tick; the imperative loop avoids intermediate array allocations (documented "Bolt Optimization" in code). Unresolved outbound links aren't real connections yet.
- **Alternatives considered**: `Object.fromEntries(map(...))` + `filter().length` (original shape; rejected for GC overhead), computing in `EntityTableRow` (rejected: N× duplicate work).

## Decision 6: Selection cleared on filter change, preserved on sort

- **Decision**: A `$effect` reads `searchQuery`/`typeFilters`/`labelFilters` and resets `selectedIds`; sort changes don't touch it. Select-all targets the filtered `rows` only.
- **Rationale**: Bulk actions must never hit rows the user can no longer see (spec SC-006). Sorting is a pure reorder of the same set, so clearing there would be hostile.
- **Alternatives considered**: Pruning selection to the intersection with the new filter result (viable, more state churn; may be revisited for #1627's richer selection model).

## Decision 7: Navigation layering and guest mode

- **Decision**: Title cell is a real `<a href>`; whole-row click is a convenience that defers to inner interactive elements (`a`, `button`, `[data-row-select]`). Modifier-clicks fall through to the browser. In guest mode, opening sets `vault.selectedEntityId` and calls `modalUIStore.openZenMode(id)` instead of navigating.
- **Rationale**: Keyboard users need a focusable target and native new-tab semantics must survive (accessibility + platform conventions). Guest snapshots have no `/vault/:id/entity/:id` route, and syncing selection keeps the `?entity=` deep link honest (#1588).
- **Alternatives considered**: `onclick`-only row navigation (rejected: breaks middle-click/keyboard); a guest entity route (rejected: snapshot data model doesn't support it).

## Decision 8: Bulk actions through the shared global dialog

- **Decision**: The table exposes only "Add / remove labels", delegating to `modalUIStore.openBulkLabelDialog(selectedIds)` rendered by `GlobalModalProvider`.
- **Rationale**: The dialog already existed for the list view; reusing it keeps one label-editing flow (constitution III) and keeps the table read-heavy as the epic intended.
- **Alternatives considered**: Inline label editor in the toolbar (rejected: duplicates dialog logic, crowds the table chrome).
