# Execution Tasks: Adjustable Sidebars

**Branch**: `088-adjustable-sidebars`

## Phase 1: Setup

_No specific setup tasks required as this is an integration into the existing `apps/web` project._

## Phase 2: Foundational

**Goal:** Establish the state management and persistence layer required by both sidebars.

- [x] T001 Extend `uiStore` in `apps/web/src/lib/stores/ui.svelte.ts` to include `leftSidebarWidth` and `rightSidebarWidth` as `$state` with `localStorage` persistence.
- [x] T002 Update `uiStore` tests in `apps/web/src/lib/stores/ui.test.ts` (if exists) or create it to verify that widths are correctly initialized and persisted.
- [x] T003 Create `ResizerHandle.svelte` component in `apps/web/src/lib/components/layout/` encapsulating the Pointer Event logic (`pointerdown`, `pointermove`, `pointerup`, `setPointerCapture`).

## Phase 3: Resize Navigation/Left Sidebar [US1]

**Goal:** Allow users to dynamically adjust the width of the left sidebar by dragging its edge.

- [x] T004 [US1] Integrate `ResizerHandle` into `apps/web/src/lib/components/layout/SidebarPanelHost.svelte` (or equivalent left sidebar component).
- [x] T005 [US1] Bind the left sidebar container's inline `style="width: ...px"` to `uiStore.leftSidebarWidth`.
- [x] T006 [US1] Implement boundary logic in the resize handler to restrict the left sidebar width between `MIN_LEFT_SIDEBAR_WIDTH` (e.g., 240px) and `MAX_SIDEBAR_VW` (e.g., 40vw).

**Independent Test:** Drag the right edge of the left sidebar. Verify continuous resizing, boundary enforcement (min ~240px, max ~40vw), and fluid cursor interaction (`col-resize`).

## Phase 4: Resize Tool/Right Sidebar [US2]

**Goal:** Allow users to dynamically adjust the width of the right sidebar by dragging its edge.

- [x] T007 [US2] Integrate `ResizerHandle` into `apps/web/src/lib/components/EntityDetailPanel.svelte` (or equivalent right sidebar component).
- [x] T008 [US2] Bind the right sidebar container's inline `style="width: ...px"` to `uiStore.rightSidebarWidth`.
- [x] T009 [US2] Implement boundary logic in the resize handler to restrict the right sidebar width between `MIN_RIGHT_SIDEBAR_WIDTH` (e.g., 320px) and `MAX_SIDEBAR_VW` (e.g., 40vw).

**Independent Test:** Drag the left edge of the right sidebar. Verify continuous resizing, boundary enforcement (min ~320px, max ~40vw), and fluid cursor interaction.

## Phase 5: Persistent Layout Preferences [US3]

**Goal:** Ensure sidebar widths are saved across sessions and restored correctly.

- [x] T010 [US3] Verify that the width states in `uiStore` are correctly reading from `localStorage` on initial load in the layout hierarchy (e.g., in `apps/web/src/routes/(app)/+layout.svelte`).
- [x] T011 [US3] Create E2E test in `apps/web/tests/adjustable-sidebars.spec.ts` to verify dragging the left sidebar updates width and persists after a page reload.
- [x] T012 [P] [US3] Create E2E test in `apps/web/tests/adjustable-sidebars.spec.ts` to verify dragging the right sidebar updates width and persists after a page reload.

**Independent Test:** Adjust both sidebars to non-default widths. Refresh the page. Verify both sidebars restore to the custom widths. Collapse and expand a sidebar; verify it returns to the custom width, not the default.

## Phase 6: Polish

**Goal:** Ensure visual affordances and edge cases are handled gracefully.

- [x] T013 Add global `cursor-col-resize` style application during active drag (e.g., by adding a class to `body` via the `uiStore` or `ResizerHandle`) to prevent cursor flickering.
- [x] T014 Prevent pointer events on `iframe` or nested interactive elements during the drag to prevent them from stealing capture.
- [x] T015 Ensure sidebar toggle logic respects `uiStore.leftSidebarWidth` and `uiStore.rightSidebarWidth` when switching from collapsed to expanded state (FR-006).
- [x] T016 Implement media queries or a ResizeObserver to collapse or scale down sidebars if the browser window becomes too small to accommodate the minimum widths.
- [x] T017 Update `apps/web/src/lib/config/help-content.ts` to include documentation or a `FeatureHint` for the adjustable sidebars (Constitution Rule VII).

## Dependencies

- **Phase 2 (Foundational)** must be completed before Phase 3 or Phase 4.
- **Phase 3 (Left Sidebar)** and **Phase 4 (Right Sidebar)** can be developed in parallel once Phase 2 is complete.
- **Phase 5 (Persistence)** implicitly relies on Phases 2-4 being functional to test effectively via E2E.
- **Phase 6 (Polish)** should follow Phase 3 and 4 to refine the interaction.

## Implementation Strategy

**MVP Scope:** Complete Phase 2 and Phase 3 (Left Sidebar only). This delivers the core technical challenge and provides immediate value to users who need more space for the Entity Explorer. Once the pattern is proven, rapidly apply it to the right sidebar (Phase 4).
