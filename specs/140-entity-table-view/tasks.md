# Tasks: Entity Table / List View

**Input**: Design documents from `/specs/140-entity-table-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md

> **Retroactive document**: reconstructed task breakdown for the already-shipped implementation. All tasks are complete. Each task notes the PR that delivered it: #1512 (read-only table view, closes #1509), #1520 (connection summary), #1521 (row selection + bulk label actions, closes #1516), #1588 (guest-mode fixes, closes #1587).

**Tests**: Included — the constitution (Principle II) mandates unit tests for all logic; e2e specs cover the bulk-label and open/close flows.

**Organization**: Tasks are grouped by user story from spec.md (US1 browse, US2 filter, US3 sort, US4 selection + bulk labels, US5 open entity).

## Phase 1: Setup

- [x] T001 Create `/table` route skeleton with `ssr = false` in `apps/web/src/routes/(app)/table/+page.ts` and page shell in `+page.svelte` (PR #1512)
- [x] T002 Add Entity Table navigation entries to `apps/web/src/lib/components/layout/ActivityBar.svelte`, `apps/web/src/lib/components/layout/MobileMenu.svelte`, and `apps/web/src/lib/components/search/SearchModal.svelte` (PR #1512)

## Phase 2: Foundational

- [x] T003 Add optional `createdAt`/`modifiedAt` timestamp fields to the Entity schema in `packages/schema` and wire them into entity create/update paths (commit 8e2b8d8b, PR #1521 era)
- [x] T004 [P] Create pure sort/derivation module with `SortKey`, `SortState`, `getEntityCreatedAt`, `getEntityModifiedAt` (legacy `updatedAt`/`lastUpdated` fallbacks), `getEntityLabels` (legacy tags fallback) in `apps/web/src/lib/components/table/entityTableSort.ts` (PR #1512)
- [x] T005 [P] Create markdown-stripping summary snippet helper `entitySnippet` (content → lore fallback, 140-char clamp) in `apps/web/src/lib/components/table/entityTableSnippet.ts` (PR #1512)

## Phase 3: User Story 1 — Browse the whole vault as a table (P1) 🎯 MVP

**Goal**: Every entity in the active vault renders as a row with all columns, with loading/no-vault/empty-vault states.

**Independent Test**: Open a vault with mixed entities at `/table`; verify one row per entity, "—" placeholders for missing data, and each non-table state.

- [x] T006 [US1] Unit tests for snippet derivation in `apps/web/src/lib/components/table/__tests__/entityTableSnippet.test.ts` (PR #1512)
- [x] T007 [US1] Build table shell with column definitions, sticky header, and horizontal-scroll container in `apps/web/src/lib/components/table/EntityTable.svelte` (PR #1512)
- [x] T008 [US1] Build row component rendering name, type badge (category icon/color, raw-type fallback), snippet, label chips (max 3 + overflow count), created/modified dates, and accessible "—" placeholders in `apps/web/src/lib/components/table/EntityTableRow.svelte` (PR #1512)
- [x] T009 [US1] Wire vault store into the page: loading, no-vault, and empty-vault states via shared `EmptyState`, plus visible entity count, in `apps/web/src/routes/(app)/table/+page.svelte` (PR #1512)
- [x] T010 [US1] Component test for table rendering in `apps/web/src/lib/components/table/__tests__/EntityTable.test.ts` and route test in `apps/web/src/routes/(app)/table/page.route.test.ts` (PR #1512)
- [x] T011 [US1] Add Connections column: precompute per-entity inbound/outbound/total summaries from `vault.inboundConnections` + resolved outbound targets in `+page.svelte`, render in `EntityTableRow.svelte` (PR #1520)

**Checkpoint**: Table renders the whole vault read-only — the MVP of the epic.

## Phase 4: User Story 2 — Narrow the table with search and filters (P2)

**Goal**: Live free-text search, toggleable type pills with counts, label filters, one-click row shortcuts, and a single Clear action.

**Independent Test**: In a mixed vault, combine search + type + label filters; verify live row set/count, chip shortcuts, no-match empty state, and Clear.

- [x] T012 [US2] Reuse shared `filterEntities`/`countEntityTypes` from `apps/web/src/lib/components/explorer/entityListFiltering.ts` for search/type/label filtering in `+page.svelte` (PR #1512)
- [x] T013 [US2] Add search input, type filter pills with per-type counts, active label chips, and Clear control to `apps/web/src/routes/(app)/table/+page.svelte` (PR #1512)
- [x] T014 [US2] Make row type badges and label chips act as filter shortcuts (`onFilterType`/`onFilterLabel` props) in `EntityTable.svelte` and `EntityTableRow.svelte` (PR #1512)
- [x] T015 [US2] Add no-match empty state with "Clear filters" CTA in `+page.svelte` (PR #1512)

**Checkpoint**: Table is usable on large vaults.

## Phase 5: User Story 3 — Sort columns to compare and find gaps (P2)

**Goal**: All data columns sortable with direction toggle, missing-values-last, title tie-breaks, and accessible sort indicators.

**Independent Test**: Click each header in a vault where entities lack timestamps/labels; verify order, toggle, gap placement.

- [x] T016 [P] [US3] Unit tests for `sortEntities`/`nextSortState` (direction toggle, missing-last, tie-breaks) in `apps/web/src/lib/components/table/__tests__/entityTableSort.test.ts` (PR #1512)
- [x] T017 [US3] Implement `sortEntities` for title/type/labels/created/modified with missing-values-last and title tie-break in `entityTableSort.ts` (PR #1512)
- [x] T018 [US3] Add sortable header buttons with direction icons and `aria-sort` in `EntityTable.svelte`; wire `nextSortState` in `+page.svelte` (PR #1512)
- [x] T019 [US3] Add `connections` sort key backed by the precomputed connection summaries in `entityTableSort.ts` and `+page.svelte` (PR #1520)

**Checkpoint**: Comparison/maintenance workflows (stale, least-connected, unlabeled) work.

## Phase 6: User Story 4 — Select rows and apply bulk label actions (P3)

**Goal**: Checkbox selection scoped to the filtered set, select-all with indeterminate state, selection toolbar, bulk labels via the shared dialog.

**Independent Test**: Select rows/select-all, apply a bulk label change, verify it lands on every selected entity; verify filter changes clear the selection and sort changes keep it.

- [x] T020 [US4] Add `selectedIds` state, row/all toggles, and the filter-change-clears-selection `$effect` (sort excluded) in `apps/web/src/routes/(app)/table/+page.svelte` (PR #1521)
- [x] T021 [US4] Add select-all header checkbox with imperative indeterminate binding in `EntityTable.svelte` and per-row checkbox + selected highlight in `EntityTableRow.svelte` (PR #1521)
- [x] T022 [US4] Add selection toolbar (count, "Add / remove labels" via `modalUIStore.openBulkLabelDialog`, "Clear selection") in `+page.svelte` (PR #1521)
- [x] T023 [P] [US4] Extend component tests for selection behavior in `apps/web/src/lib/components/table/__tests__/EntityTable.test.ts` (PR #1521)
- [x] T024 [P] [US4] E2E spec for the bulk-label flow in `apps/web/tests/table-bulk-labels.spec.ts` (PR #1521)

**Checkpoint**: First management capability on top of the read-heavy table.

## Phase 7: User Story 5 — Open an entity from the table (P3)

**Goal**: Row/title click opens the entity; interactive cells don't navigate; modifier-clicks keep native behavior; guest mode opens in-place.

**Independent Test**: Click row body, title, and ctrl/cmd-click title in host mode; open an entity from a guest share link.

- [x] T025 [US5] Title cell as real `<a href>` to the entity route with whole-row click convenience deferring to inner `a`/`button`/`[data-row-select]` elements in `EntityTableRow.svelte` (PR #1512)
- [x] T026 [US5] Preserve native modifier-click (ctrl/cmd/shift/middle) behavior on the title link in `EntityTableRow.svelte` (PR #1512)
- [x] T027 [US5] Guest mode: build guest entity URL via `buildGuestEntityUrl`, sync `vault.selectedEntityId`, and open Zen mode in place instead of navigating in `EntityTableRow.svelte` (PR #1588)
- [x] T028 [P] [US5] E2E spec for open/close flow in `apps/web/tests/table-entity-close.spec.ts` (PR #1588)

**Checkpoint**: Table feeds back into the deep-dive views in both session modes.

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T029 [P] Help article `table-view-filters` documenting filter/sort interactions in `apps/web/src/lib/config/help-content.ts` (constitution VII) (PR #1512/#1521)
- [x] T030 [P] Accessibility pass: `aria-sort` on headers, `aria-pressed` on filter pills, aria-labels on checkboxes and empty-value placeholders, focus-visible rings throughout table components (PR #1512/#1521)
- [x] T031 Performance: replace `Object.fromEntries`/`filter().length` connection counting with allocation-light imperative loops in `+page.svelte` (post-#1520 optimization)

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T005) → US1 (MVP) → US2/US3 (both depend only on US1) → US4 (needs US2's filtered row set) → US5 (needs US1 rows) → Polish
- Actual shipping order: US1+US2+US3+US5-host (PR #1512) → connections column/sort (PR #1520) → US4 (PR #1521) → US5-guest (PR #1588)

## Implementation Strategy (as it played out)

The epic was sliced almost exactly along user-story lines: the read-only MVP shipped first (#1509→#1512), enrichment and maintenance capabilities followed (#1520, #1516→#1521), and a hardening pass fixed guest mode (#1587→#1588). Remaining epic #1508 slices (e.g. #1627 selection model / context menu) should be added as new phases here or as a follow-up spec extension.
