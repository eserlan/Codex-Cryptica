# Implementation Plan: Entity Table / List View

**Branch**: `140-entity-table-view` | **Date**: 2026-07-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/140-entity-table-view/spec.md`

> **Retroactive document**: the Entity Table shipped via epic #1508 slices (#1509/#1512 read-only view, #1520 connection summary, #1516/#1521 selection + bulk labels, #1588 guest-mode fixes) before this spec existed. This plan documents the implementation as actually built so future slices (e.g. #1627 selection model / context menu) have accurate design context. It is not a forward plan.

## Summary

A vault-wide, read-heavy table view at the `/table` route: entities are rows; name, type, connections, summary snippet, labels, and created/modified timestamps are columns. Client-side search/type/label filtering (reusing the Explorer's filter logic), pure-function column sorting with missing-values-last semantics, checkbox row selection scoped to the filtered set, and bulk label add/remove via the shared global bulk-label dialog. Guest (read-only snapshot) sessions open entities in-place via Zen mode instead of the host-only entity route.

## Technical Context

**Language/Version**: TypeScript 5 + Svelte 5 (runes: `$state`, `$derived`, `$effect`), SvelteKit
**Primary Dependencies**: SvelteKit routing (`$app/navigation`, `$app/paths`), Tailwind 4 theme tokens, Lucide icon classes, `schema` workspace package (Entity type)
**Storage**: None added — reads the already-loaded vault from `vault` store (OPFS-backed, client-side); selection/filter/sort are transient component state
**Testing**: Vitest unit tests (`entityTableSort`, `entityTableSnippet`, `EntityTable` component, route test) + Playwright e2e (`table-bulk-labels.spec.ts`, `table-entity-close.spec.ts`)
**Target Platform**: Browser (local-first web app); works in host and guest session modes
**Project Type**: Web application (SvelteKit app in `apps/web` over `packages/` workspace)
**Performance Goals**: Immediate filter/sort feedback on vaults of several hundred entities; connection counts computed with allocation-light imperative loops to limit GC pressure during reactive updates
**Constraints**: Client-side only (Principle V); no inline editing; selection must never outlive the filter set that produced it
**Scale/Scope**: One route page (~340 lines), three table components + two pure-logic modules (~530 lines), shared filtering reused from Explorer

## Constitution Check

_GATE: evaluated retroactively against constitution v1.3.0._

| Principle                     | Status                  | Notes                                                                                                                                                                                                                            |
| ----------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First              | PASS (justified)        | No new `packages/` package: the table is a thin view over existing stores; only app-specific view logic lives in `apps/web`. Pure logic is still isolated in importable modules (`entityTableSort.ts`, `entityTableSnippet.ts`). |
| II. TDD                       | PASS                    | Unit tests for sort, snippet, and component; route test; two Playwright specs for bulk labels and open/close flows.                                                                                                              |
| III. Simplicity & YAGNI / DRY | PASS                    | Reuses `entityListFiltering` (Explorer), `EmptyState`, the global bulk-label dialog, `categories` store, and guest-link builder rather than reimplementing. No speculative features (no inline edit, no column config).          |
| IV. AI-First Extraction       | N/A                     | No AI surface.                                                                                                                                                                                                                   |
| V. Privacy & Client-Side      | PASS                    | Entirely client-side over the in-memory vault; no network calls.                                                                                                                                                                 |
| VI. Clean Implementation      | PASS                    | Svelte 5 runes, Tailwind theme tokens, `data-testid` hooks, aria-sort/aria-labels.                                                                                                                                               |
| VII. User Documentation       | PASS                    | `help-content.ts` entry `table-view-filters` documents filtering/sorting interactions.                                                                                                                                           |
| VIII. Dependency Injection    | N/A                     | No new services/stores; components consume existing singletons via props/imports.                                                                                                                                                |
| IX. Natural Language          | PASS                    | Plain copy ("Browse, filter, and sort every entity in this vault.").                                                                                                                                                             |
| X. Coverage                   | PASS                    | Logic modules are pure functions with dedicated unit tests.                                                                                                                                                                      |
| XII. Labels Over Tags         | PASS (with legacy shim) | UI says "Labels" everywhere; `getEntityLabels` falls back to the legacy `tags` field for old entities but never exposes the term "tags".                                                                                         |

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/140-entity-table-view/
├── spec.md              # Retroactive feature spec
├── plan.md              # This file
├── research.md          # Phase 0: decisions as actually made
├── data-model.md        # Phase 1: view-level data model
├── quickstart.md        # Phase 1: how to run/verify the feature
├── contracts/
│   └── ui-contract.md   # Route, component props, test hooks
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
apps/web/src/
├── routes/(app)/table/
│   ├── +page.svelte             # View container: filter/sort/selection state, toolbar, empty states
│   ├── +page.ts                 # ssr=false (client-only, vault lives in browser)
│   └── page.route.test.ts       # Route-level test
├── lib/components/table/
│   ├── EntityTable.svelte       # <table> shell: sortable headers, select-all, sticky thead
│   ├── EntityTableRow.svelte    # One entity row: cells, navigation, guest handling
│   ├── entityTableSort.ts       # Pure: SortKey/SortState, sortEntities, nextSortState,
│   │                            #   getEntityCreatedAt/ModifiedAt/Labels (legacy fallbacks)
│   ├── entityTableSnippet.ts    # Pure: markdown-stripped 140-char summary snippet
│   └── __tests__/               # Vitest unit tests for the above
├── lib/components/explorer/
│   └── entityListFiltering.ts   # SHARED: filterEntities/countEntityTypes (reused, not owned here)
├── lib/stores/
│   ├── vault.svelte.ts          # allEntities, inboundConnections, selectedEntityId
│   ├── categories.svelte.ts     # type → {label, icon, color}
│   └── ui/modal-ui.svelte.ts    # openBulkLabelDialog(ids), openZenMode(id)
└── tests/                       # Playwright: table-bulk-labels, table-entity-close
```

**Structure Decision**: Peer view pattern (like `/map`, `/timeline`): the route reads the already-active vault from the `vault` store rather than loading data itself. Container/presentational split — `+page.svelte` owns all state (filters, sort, selection) and passes plain props + callbacks down; `EntityTable`/`EntityTableRow` are stateless renderers; all comparison/derivation logic lives in pure, unit-testable modules.

## Key Design Decisions (as built)

1. **Reuse Explorer filtering**: `filterEntities`/`countEntityTypes` from `explorer/entityListFiltering` provide search (`name/content/#label`) and type counting, keeping table and explorer filter semantics identical (DRY per constitution III).
2. **Pure sort module**: `sortEntities` returns a new array, never mutates; missing values sort last regardless of direction (cleanup gaps stay visible); every sort tie-breaks on title for stable output. `nextSortState` encodes the toggle-or-reset-to-asc header behavior.
3. **Selection scoped to visibility**: `selectedIds` is cleared by a `$effect` watching search/type/label filters (sort excluded), guaranteeing bulk actions only ever hit rows the user can see (spec FR-011, SC-006). Select-all operates on the filtered `rows`, and indeterminate state is set imperatively on the bound `<input>` element (attribute can't express it).
4. **Connection summary precomputed once per vault change**: an imperative loop builds `Record<entityId, {inbound, outbound, total}>` from `vault.inboundConnections` + each entity's outbound `connections` (only counting resolved targets), avoiding per-row recomputation and intermediate allocations.
5. **Row navigation layering**: the title cell hosts a real `<a>` (keyboard-focusable, native modifier-click behavior preserved); whole-row click is a convenience that defers to inner links/buttons/checkbox via `closest()` guards.
6. **Guest mode**: guest snapshots have no per-entity route, so `EntityTableRow` intercepts opens, syncs `vault.selectedEntityId`, and opens Zen mode in place — keeping the `?entity=` deep-link URL consistent (fixed in #1588).
7. **Bulk actions via shared dialog**: the table doesn't own label-editing UI; it hands selected ids to `modalUIStore.openBulkLabelDialog`, reusing the flow shipped for the list view.

## Complexity Tracking

No constitution violations to justify.
