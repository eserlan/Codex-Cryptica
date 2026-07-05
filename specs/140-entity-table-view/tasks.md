# Tasks: Entity Table / List View

**Input**: Design documents from `/specs/140-entity-table-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md

> **Retroactive & Extended**: Reconstructed task breakdown for the already-shipped implementation (T001–T031, marked complete), extended with the forward-facing tasks for the interactive selection model, double-click navigation, and right-click context menu slice (T032–T048).

**Tests**: Mandated for selection behaviors, context menu triggers, modal confirmations, and guest mode blocks.

## Phase 1: Setup

- [x] T001 Create `/table` route skeleton with `ssr = false` in `apps/web/src/routes/(app)/table/+page.ts` and page shell in `+page.svelte` (PR #1512)
- [x] T002 Add Entity Table navigation entries to `apps/web/src/lib/components/layout/ActivityBar.svelte`, `apps/web/src/lib/components/layout/MobileMenu.svelte`, and `apps/web/src/lib/components/search/SearchModal.svelte` (PR #1512)

## Phase 2: Foundational

- [x] T003 Add optional `createdAt`/`modifiedAt` timestamp fields to the Entity schema in `packages/schema` and wire them into entity create/update paths (commit 8e2b8d8b, PR #1521 era)
- [x] T004 [P] Create pure sort/derivation module with `SortKey`, `SortState`, `getEntityCreatedAt`, `getEntityModifiedAt` (legacy `updatedAt`/`lastUpdated` fallbacks), `getEntityLabels` (legacy tags fallback) in `apps/web/src/lib/components/table/entityTableSort.ts` (PR #1512)
- [x] T005 [P] Create markdown-stripping summary snippet helper `entitySnippet` (content → lore fallback, 140-char clamp) in `apps/web/src/lib/components/table/entityTableSnippet.ts` (PR #1512)

## Phase 3: User Story 1 — Browse the whole vault as a table (P1) 🎯 MVP

- [x] T006 [US1] Unit tests for snippet derivation in `apps/web/src/lib/components/table/__tests__/entityTableSnippet.test.ts` (PR #1512)
- [x] T007 [US1] Build table shell with column definitions, sticky header, and horizontal-scroll container in `apps/web/src/lib/components/table/EntityTable.svelte` (PR #1512)
- [x] T008 [US1] Build row component rendering name, type badge (category icon/color, raw-type fallback), snippet, label chips (max 3 + overflow count), created/modified dates, and accessible "—" placeholders in `apps/web/src/lib/components/table/EntityTableRow.svelte` (PR #1512)
- [x] T009 [US1] Wire vault store into the page: loading, no-vault, and empty-vault states via shared `EmptyState`, plus visible entity count, in `apps/web/src/routes/(app)/table/+page.svelte` (PR #1512)
- [x] T010 [US1] Component test for table rendering in `apps/web/src/lib/components/table/__tests__/EntityTable.test.ts` and route test in `apps/web/src/routes/(app)/table/page.route.test.ts` (PR #1512)
- [x] T011 [US1] Add Connections column: precompute per-entity inbound/outbound/total summaries from `vault.inboundConnections` + resolved outbound targets in `+page.svelte`, render in `EntityTableRow.svelte` (PR #1520)

## Phase 4: User Story 2 — Narrow the table with search and filters (P2)

- [x] T012 [US2] Reuse shared `filterEntities`/`countEntityTypes` from `apps/web/src/lib/components/explorer/entityListFiltering.ts` for search/type/label filtering in `+page.svelte` (PR #1512)
- [x] T013 [US2] Add search input, type filter pills with per-type counts, active label chips, and Clear control to `apps/web/src/routes/(app)/table/+page.svelte` (PR #1512)
- [x] T014 [US2] Make row type badges and label chips act as filter shortcuts (`onFilterType`/`onFilterLabel` props) in `EntityTable.svelte` and `EntityTableRow.svelte` (PR #1512)
- [x] T015 [US2] Add no-match empty state with "Clear filters" CTA in `+page.svelte` (PR #1512)

## Phase 5: User Story 3 — Sort columns to compare and find gaps (P2)

- [x] T016 [P] [US3] Unit tests for `sortEntities`/`nextSortState` (direction toggle, missing-last, tie-breaks) in `apps/web/src/lib/components/table/__tests__/entityTableSort.test.ts` (PR #1512)
- [x] T017 [US3] Implement `sortEntities` for title/type/labels/created/modified with missing-values-last and title tie-break in `entityTableSort.ts` (PR #1512)
- [x] T018 [US3] Add sortable header buttons with direction icons and `aria-sort` in `EntityTable.svelte`; wire `nextSortState` in `+page.svelte` (PR #1512)
- [x] T019 [US3] Add `connections` sort key backed by the precomputed connection summaries in `entityTableSort.ts` and `+page.svelte` (PR #1520)

## Phase 6: User Story 4 — Select rows and apply bulk label actions (P3)

- [x] T020 [US4] Add `selectedIds` state, row/all toggles, and the filter-change-clears-selection `$effect` (sort excluded) in `apps/web/src/routes/(app)/table/+page.svelte` (PR #1521)
- [x] T021 [US4] Add select-all header checkbox with imperative indeterminate binding in `EntityTable.svelte` and per-row checkbox + selected highlight in `EntityTableRow.svelte` (PR #1521)
- [x] T022 [US4] Add selection toolbar (count, "Add / remove labels" via `modalUIStore.openBulkLabelDialog`, "Clear selection") in `+page.svelte` (PR #1521)
- [x] T023 [P] [US4] Extend component tests for selection behavior in `apps/web/src/lib/components/table/__tests__/EntityTable.test.ts` (PR #1521)
- [x] T024 [P] [US4] E2E spec for the bulk-label flow in `apps/web/tests/table-bulk-labels.spec.ts` (PR #1521)

## Phase 7: User Story 5 — Open an entity from the table (P3)

- [x] T025 [US5] Title cell as real `<a href>` to the entity route with whole-row click convenience deferring to inner `a`/`button`/`[data-row-select]` elements in `EntityTableRow.svelte` (PR #1512)
- [x] T026 [US5] Preserve native modifier-click (ctrl/cmd/shift/middle) behavior on the title link in `EntityTableRow.svelte` (PR #1512)
- [x] T027 [US5] Guest mode: build guest entity URL via `buildGuestEntityUrl`, sync `vault.selectedEntityId`, and open Zen mode in place instead of navigating in `EntityTableRow.svelte` (PR #1588)
- [x] T028 [P] [US5] E2E spec for open/close flow in `apps/web/tests/table-entity-close.spec.ts` (PR #1588)

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T029 [P] Help article `table-view-filters` documenting filter/sort interactions in `apps/web/src/lib/config/help-content.ts` (constitution VII) (PR #1512/#1521)
- [x] T030 [P] Accessibility pass: `aria-sort` on headers, `aria-pressed` on filter pills, aria-labels on checkboxes and empty-value placeholders, focus-visible rings throughout table components (PR #1512/#1521)
- [x] T031 Performance: replace `Object.fromEntries`/`filter().length` connection counting with allocation-light imperative loops in `+page.svelte` (post-#1520 optimization)

---

## Phase 9: Refined Interaction & Selection Shortcuts (US4 & US5 Updates - #1627)

**Goal**: Implement Shift/Ctrl selection modifiers, map left-click background to toggle select, double-click to open.

**Independent Test**: Row backgrounds toggle selection; double-clicks trigger entity navigation; Shift-clicks select bounds; Esc clears all.

- [ ] T032 [US4] Add `lastSelectedId` state to track Shift-click range anchors in `apps/web/src/routes/(app)/table/+page.svelte`
- [ ] T033 [US4] Add range selection calculations when Shift key is held during row toggles in `+page.svelte`
- [ ] T034 [US4] Add window keyboard event listener for `Esc` to clear selection in `+page.svelte`
- [ ] T035 [US5] Update row background click handler in `apps/web/src/lib/components/table/EntityTableRow.svelte` to select/toggle instead of navigate
- [ ] T036 [US5] Implement `ondblclick` on row container to trigger `openEntity` in `EntityTableRow.svelte`
- [ ] T037 [P] [US4] Add unit tests verifying selection modifiers in `apps/web/src/lib/components/table/__tests__/EntityTable.test.ts`

**Checkpoint**: Row interaction model refactored for rapid selection workflows.

---

## Phase 10: Custom Context Menu Overlay (US6 - #1627)

**Goal**: Create dynamic positioning context menu overlay driven by right-click coordinates.

**Independent Test**: Right-click unselected and selected rows opens context menu at cursor coordinates; clicks outside dismiss.

- [ ] T038 [US6] Create new custom floating context menu component `apps/web/src/lib/components/table/TableContextMenu.svelte`
- [ ] T039 [US6] Intercept `oncontextmenu` on rows in `apps/web/src/lib/components/table/EntityTableRow.svelte` and forward coordinates
- [ ] T040 [US6] Implement select-on-right-click rules in `apps/web/src/routes/(app)/table/+page.svelte` (unselected row → select and open, selected row → preserve selection)
- [ ] T041 [US6] Implement click-outside overlay listener to close context menu in `TableContextMenu.svelte`
- [ ] T042 [P] [US6] Add unit tests for positioning and mount parameters in `apps/web/src/lib/components/table/__tests__/TableContextMenu.test.ts`

**Checkpoint**: Right-click triggers and closes context menus reliably.

---

## Phase 11: Context Menu Management Actions & Confirmation Modals (US6 - #1627)

**Goal**: Populate context menu with dynamic label count strings, and bind delete/type change confirmation prompts.

**Independent Test**: Dynamic count indicators display in context menu. Triggers modal prompts for delete/type warnings.

- [ ] T043 [US6] Add Label list, Category list, and Delete options to `apps/web/src/lib/components/table/TableContextMenu.svelte`
- [ ] T044 [US6] Bind Label edit button to `modalUIStore.openBulkLabelDialog` for the selection
- [ ] T045 [US6] Implement type change flow with `vault.updateEntity` and metadata loss warnings in `+page.svelte`
- [ ] T046 [US6] Implement single and bulk deletion flows with `vault.deleteEntity` and `notificationStore.confirm` in `+page.svelte`
- [ ] T047 [P] [US6] Disable write actions inside the context menu when in Guest session mode
- [ ] T048 [P] [US6] Add unit tests in `apps/web/src/lib/components/table/__tests__/TableContextMenu.test.ts` verifying dialog triggers

---

## Dependencies & Execution Order

- Setup (Phase 1) & Foundational (Phase 2) are already complete.
- Phase 9 (Refined Interaction) refactors Row interaction clicks (required before Context Menu triggers).
- Phase 10 (Custom Context Menu) handles positioning overlays.
- Phase 11 (Management Actions) binds business logic and confirmation dialogs.
- All code changes must build and lint clean.
