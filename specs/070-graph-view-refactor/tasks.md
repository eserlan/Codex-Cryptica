# Tasks: GraphView Component Refactor

**Input**: Design documents from `/specs/070-graph-view-refactor/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Modular Overlays (UI) 🎯 MVP

**Goal**: Extract high-level UI components that have minimal dependencies on Cytoscape lifecycle.

- [x] T001 [P] [US2] Create `apps/web/src/lib/components/graph/GraphTooltip.svelte` and migrate tooltip template and logic.
- [x] T002 [P] [US2] Create `apps/web/src/lib/components/graph/EdgeEditorModal.svelte` and migrate connection editing form and logic.
- [x] T003 [US2] Integrate `GraphTooltip` and `EdgeEditorModal` into `GraphView.svelte` and verify functionality.

---

## Phase 2: Controls & HUD (UI)

**Goal**: Extract the HUD and Toolbar to clean up the main template.

- [x] T004 [P] [US2] Create `apps/web/src/lib/components/graph/GraphHUD.svelte` migrating breadcrumbs and filter controls.
- [x] T005 [P] [US2] Create `apps/web/src/lib/components/graph/GraphToolbar.svelte` migrating all bottom controls.
- [x] T006 [US2] Integrate `GraphHUD` and `GraphToolbar` into `GraphView.svelte` ensuring props/callbacks are correctly wired.

---

## Phase 3: Engine Extraction (Logic)

**Goal**: Move visualization-specific logic to `packages/graph-engine`.

- [x] T007 [P] [US3] Extract layout configuration and execution logic into `packages/graph-engine/src/LayoutManager.ts`.
- [x] T008 [P] [US1] Extract graph stylesheet generation and filtering selectors into `packages/graph-engine/src/GraphStyles.ts`.
- [x] T009 [P] [US3] Create unit tests for `LayoutManager.ts` and `GraphStyles.ts` in `packages/graph-engine/src/`.
- [x] T010 [US3] Refactor `GraphView.svelte` to use the new logic and verify all layout modes (Force, Timeline, Orbit).

---

## Phase 4: Lifecycle & Event Decoupling (Logic)

**Goal**: Final cleanup of `GraphView.svelte`.

- [x] T011 [P] [US1] Extract Cytoscape event listener registration into `packages/graph-engine/src/events/useGraphEvents.ts`.
- [x] T012 [P] [US1] Extract incremental element/image synchronization logic into `packages/graph-engine/src/sync/useGraphSync.ts`.
- [x] T013 [P] [US1] Create unit tests for `useGraphEvents.ts` and `useGraphSync.ts`.
- [x] T014 [US1] Final audit of `GraphView.svelte` to ensure it meets the < 250 LOC goal.

---

## Phase 5: Polish & Validation

- [x] T015 [P] Run `npm run check` and fix any type mismatches.
- [x] T016 [P] Run `npm test` to ensure zero regressions in graph logic.
- [x] T017 Run Playwright E2E tests to verify full user journeys and auto-fit on load.

---

## Dependencies & Execution Order

1.  **UI Components (Phases 1 & 2)**: Can be done first with minimal risk to core graph logic.
2.  **Engine Extraction (Phase 3)**: Requires careful migration of Cytoscape instance management.
3.  **Lifecycle (Phase 4)**: The most complex phase, should be done last after logic is isolated.
