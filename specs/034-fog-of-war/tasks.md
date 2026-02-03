# Tasks: Fog of War

**Input**: Design documents from `/specs/034-fog-of-war/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: State registration and persistence setup

- [x] T001 Add `sharedMode` boolean state to `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T002 Add `defaultVisibility` enum ("visible" | "hidden") to `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T003 Implement persistence for `defaultVisibility` in `vaultStore.init` using IndexedDB in `apps/web/src/lib/stores/vault.svelte.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core filtering logic for Graph and Search

- [x] T004 Implement unified visibility check logic (precedence: hidden > revealed > defaultVisibility) in `packages/schema/src/visibility.ts`
- [x] T004a [P] Add unit tests for visibility logic in `packages/schema/src/visibility.test.ts`
- [x] T005 [P] Update `elements` derived store in `apps/web/src/lib/stores/graph.svelte.ts` to filter entities using the visibility check
- [x] T006 [P] Update `setQuery` in `apps/web/src/lib/stores/search.ts` to filter search results using the visibility check
- [x] T007 [P] Update `GraphTransformer` or `GraphView` to hide edges if source or target node is hidden in `packages/graph-engine/src/transformer.ts`

**Checkpoint**: Foundation ready - visibility filtering is active when `sharedMode` is true.

---

## Phase 3: User Story 1 - Selective Visibility (P1) 🎯 MVP

**Goal**: Toggle shared mode and control individual node visibility via tags

**Independent Test**: Manually add `hidden` tag to a file; toggle Shared Mode in UI; verify node disappears from Graph and Search.

### Implementation for User Story 1

- [x] T008 [P] [US1] Add "Shared Mode" toggle button (Eye icon) to `apps/web/src/lib/components/VaultControls.svelte`
- [x] T009 [US1] Create `apps/web/src/lib/components/settings/VaultSettings.svelte` with Default Visibility control
- [x] T010 [US1] Integrate `VaultSettings` into the Vault tab of `apps/web/src/lib/components/settings/SettingsModal.svelte`
- [x] T011 [US1] Add E2E test for basic node hiding with `hidden` tag in `apps/web/tests/fog-of-war.spec.ts` (Implemented, execution skipped due to environment limits)

**Checkpoint**: MVP complete - Selective hiding via tags and global toggle works.

---

## Phase 4: User Story 2 - Real-time "Uncovering" (P1)

**Goal**: Immediate feedback when visibility tags are modified

**Independent Test**: While in Shared Mode, edit an entity to remove the `hidden` tag; verify it appears in the graph instantly.

### Implementation for User Story 2

- [x] T012 [US2] Verify that `graph.elements` reactively updates when `vault.entities` change in `apps/web/src/lib/stores/graph.svelte.ts`
- [x] T013 [US2] Add E2E test for real-time reveal (adding `revealed` tag to a hidden-by-default world) in `apps/web/tests/fog-of-war.spec.ts` (Implemented, execution skipped due to environment limits)

---

## Phase 5: User Story 4 - Global Fog / "The Great Unknown" (P2)

**Goal**: Support worlds that are hidden by default

**Independent Test**: Set Default Visibility to "Hidden"; verify Graph is empty in Shared Mode; add `revealed` tag to one node; verify only that node appears.

### Implementation for User Story 4

- [x] T015 [US4] Add E2E test for "Hidden by Default" blank slate and incremental revealing in `apps/web/tests/fog-of-war.spec.ts` (Implemented, execution skipped due to environment limits)

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T016 Add "Shared Mode" indicator to the UI (e.g., status bar or border glow) in `apps/web/src/lib/components/GraphView.svelte`
- [x] T016a [US1] Handle deep links to hidden entities in `apps/web/src/lib/components/EntityDetailPanel.svelte` by showing a "Content Obscured" state in Shared Mode.
- [x] T017 [P] Update Quickstart documentation in `specs/034-fog-of-war/quickstart.md`
- [x] T018 Final validation against `specs/034-fog-of-war/spec.md` measurable outcomes

---

## Dependencies & Execution Order

1. **Phase 1 & 2** are critical prerequisites for all functionality.
2. **US1 (Phase 3)** must be completed to have a testable UI.
3. **US2 & US4** can then be implemented in any order or in parallel.

### Parallel Opportunities
- T005, T006, T007 (Core filtering integration)
- T008 (UI toggle) and T009 (Settings UI)
- E2E tests (T011, T013, T015) can be developed together after the UI is ready.

---

## Implementation Strategy

1. **Phase 2 (T004-T007)** is the most important part to get right to avoid data leakage.
2. **US1** provides the MVP: a way to hide specific nodes.
3. **US4** extends this to the "Empty Map" discovery experience (Logic already covered in Phase 2).
