# Tasks: Entity Explorer Sidebar & Embedded Content View

**Input**: Design documents from `/specs/078-entity-traditional-view/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/sidebar.md

**Tests**: Unit tests for store state and E2E tests for layout integrity are mandatory per Constitution X.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (Scanning), US2 (Focus), US3 (Integrity)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Create directories: `apps/web/src/lib/components/explorer/` and `apps/web/src/lib/components/entity/`
- [x] T002 Update `SettingsTab` type to include placeholders for new navigation if needed in `apps/web/src/lib/stores/ui.svelte.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core state and reusable logic required for all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Update `UIStore` with `activeSidebarTool`, `mainViewMode`, and `focusedEntityId` in `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T004 Implement `toggleSidebarTool` and `focusEntity` actions in `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T005 [P] Create unit tests for new `UIStore` state transitions in `apps/web/src/lib/stores/ui.svelte.test.ts`
- [x] T006 Extract `FilteredEntityList` logic from `EntityPalette.svelte` into a reusable `EntityList.svelte` in `apps/web/src/lib/components/explorer/EntityList.svelte` (MUST consume Dexie `graphEntities` for metadata listing)
- [x] T007 [P] Update `apps/web/src/lib/components/canvas/EntityPalette.svelte` to use the new `EntityList.svelte` to verify zero-regression

**Checkpoint**: Foundation ready - UI state can now drive multi-pane sidebar transitions using high-performance Dexie metadata.

---

## Phase 3: User Story 1 - Quick Scanning via Entity Explorer (Priority: P1) 🎯 MVP

**Goal**: Implement the Activity Bar and the Entity Explorer sidebar panel.

**Independent Test**: Click the Explorer icon in the Activity Bar and verify the sidebar list appears with the familiar palette styling.

### Implementation for User Story 1

- [x] T008 [P] [US1] Create `ActivityBar.svelte` with Oracle and Explorer toggles in `apps/web/src/lib/components/layout/ActivityBar.svelte` (Use prop-based tool registration for DI)
- [x] T009 [P] [US1] Create `SidebarPanelHost.svelte` to dynamically render tool panels in `apps/web/src/lib/components/layout/SidebarPanelHost.svelte` (Use prop-based component injection for DI)
- [x] T010 [US1] Implement `EntityExplorer.svelte` wrapping the shared `EntityList.svelte` in `apps/web/src/lib/components/explorer/EntityExplorer.svelte`
- [x] T011 [US1] Integrate `ActivityBar` and `SidebarPanelHost` into the main layout in `apps/web/src/routes/(app)/+layout.svelte`
- [x] T012 [US1] Remove legacy `OracleSidebarProvider` and replace with the new `SidebarPanelHost` in `apps/web/src/routes/(app)/+layout.svelte`
- [x] T013 [US1] Create E2E test `apps/web/tests/explorer-sidebar.spec.ts` verifying sidebar toggling and persistence

**Checkpoint**: User Story 1 is functional - the "Two-Tier Sidebar" architecture is live.

---

## Phase 4: User Story 2 - Main View Entity Focus (Priority: P1)

**Goal**: Swap central visualizations for an embedded high-density entity view.

**Independent Test**: Select an entity in the Explorer and verify the Graph/Map is replaced by the Zen-like content area while sidebars stay visible.

### Implementation for User Story 2

- [x] T014 [US2] Implement `EmbeddedEntityView.svelte` reusing modular `ZenHeader`, `ZenSidebar`, and `ZenContent` in `apps/web/src/lib/components/entity/EmbeddedEntityView.svelte`
- [x] T015 [US2] Update `apps/web/src/routes/(app)/+page.svelte` to conditionally render `EmbeddedEntityView` when `uiStore.mainViewMode === 'focus'`
- [x] T016 [US2] Ensure `vault.loadEntityContent(id)` is triggered upon entering Focus mode in `apps/web/src/lib/components/entity/EmbeddedEntityView.svelte`
- [x] T017 [US2] Implement "Back to Workspace" button in the HUD to reset `mainViewMode` to `'visualization'` in `apps/web/src/lib/components/entity/EmbeddedEntityView.svelte`
- [x] T018 [US2] Add E2E test case to `apps/web/tests/explorer-sidebar.spec.ts` for visualization-to-focus transitions

**Checkpoint**: User Story 2 is functional - the "Embedded Zen" workflow is operational.

---

## Phase 5: User Story 3 - Hierarchical Layout Integrity (Priority: P2)

**Goal**: Ensure Oracle remains the leftmost anchor and layout is responsive.

- [x] T019 [US3] Verify CSS order and Activity Bar anchoring in `apps/web/src/routes/(app)/+layout.svelte`
- [x] T020 [US3] Implement mobile-responsive logic for the new three-pane layout in `apps/web/src/lib/stores/ui.svelte.ts` (e.g. collapse all but main on small screens)

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T021 [P] Add user documentation for Entity Explorer in `apps/web/src/lib/config/help-content.ts`
- [x] T022 [P] Create `FeatureHint` for the new Activity Bar icons in `apps/web/src/lib/config/help-content.ts`
- [x] T023 Final type check and linting across modified files
- [x] T024 [US1] Performance benchmark: Verify filtering of 1,000 entities takes < 100ms (SC-002) in `apps/web/src/lib/components/explorer/EntityList.test.ts`

---

## Dependencies & Execution Order

1. **Phase 2 (Foundation)** MUST be completed before any UI work.
2. **US1 (Phase 3)** establishes the sidebar containers and blocks US2 navigation.
3. **US2 (Phase 4)** can be implemented once the Explorer is visible.
4. **US3 (Phase 5)** is a refinement of the layout implemented in US1.

## Parallel Execution Examples

- T001, T002 (Setup)
- T005 (Unit Tests) and T006 (Logic extraction)
- T008, T009 (Component scaffolding for US1)
- T021, T022 (Documentation)

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup and Foundation.
2. Deliver the Activity Bar and Explorer sidebar.
3. Verify that the Oracle and Explorer coexist on the left.

### Incremental Delivery

1. Foundation -> State & Shared Components.
2. US1 -> Multi-pane Sidebar.
3. US2 -> Embedded Focus Mode.
4. US3 -> Responsive Refinement.
