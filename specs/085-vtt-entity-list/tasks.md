# Tasks: VTT Entity List

## Phase 1: Setup

- [x] T001 [P] Update `UIStore` with `vttSidebarCollapsed` and `vttEntityListCollapsed` state in `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T002 [P] Add persistence logic for VTT sidebar states in `UIStore` constructor and persistence methods in `apps/web/src/lib/stores/ui.svelte.ts`

## Phase 2: Foundational

- [x] T003 [P] Add `dragPreview` state and `DragPreview` type to `MapSessionStore` in `apps/web/src/lib/stores/map-session.svelte.ts`
- [x] T004 [P] Implement `setDragPreview` and `clearDragPreview` methods in `MapSessionStore` in `apps/web/src/lib/stores/map-session.svelte.ts`

## Phase 3: User Story 1 - Access Entity List in VTT

**Goal**: Users can see and search vault entities within the VTT sidebar.

**Independent Test**: Open a map in VTT mode, expand the VTT sidebar, and verify the "Vault Entities" section is visible, searchable, and its collapse state persists on refresh.

- [x] T005 [US1] Migrate `isVttSidebarCollapsed` local state to `uiStore.vttSidebarCollapsed` in `apps/web/src/routes/(app)/map/+page.svelte`
- [x] T006 [US1] Import and integrate `EntityList` component into the VTT Sidebar in `apps/web/src/routes/(app)/map/+page.svelte`
- [x] T007 [US1] Implement collapsible section wrapper for the VTT Entity List using `uiStore.vttEntityListCollapsed` in `apps/web/src/routes/(app)/map/+page.svelte`

## Phase 4: User Story 2 - Drag Entity to Map

**Goal**: Users can drag an entity from the sidebar onto the map to create a token.

**Independent Test**: Drag an 'Actor' entity from the VTT sidebar and drop it onto the map. Verify a new token appears at the drop location.

- [x] T008 [US2] Update `handleDragOver` in `apps/web/src/routes/(app)/map/+page.svelte` to allow `application/codex-entity` drops.
- [x] T009 [US2] Implement `handleDrop` logic to extract `entityId` from `application/codex-entity` data in `apps/web/src/routes/(app)/map/+page.svelte`
- [x] T010 [US2] Call `mapSession.addToken` with unprojected map coordinates and entity metadata in `handleDrop` within `apps/web/src/routes/(app)/map/+page.svelte`
- [x] T011 [US2] Update `apps/web/src/lib/components/explorer/EntityList.svelte` to support an `allowedTypes` filtering prop and use it to restrict draggable entities in VTT mode.

## Phase 5: User Story 3 - Visual Feedback during Drag

**Goal**: Users see a preview of the token location while dragging.

**Independent Test**: While dragging an entity over the map, verify a semi-transparent preview of the token follows the cursor.

- [x] T012 [US3] Update `handleDragOver` to continuously update `mapSession.dragPreview` with unprojected coordinates in `apps/web/src/routes/(app)/map/+page.svelte`
- [x] T013 [US3] Implement `handleDragLeave` and `handleDrop` cleanup to clear `mapSession.dragPreview` in `apps/web/src/routes/(app)/map/+page.svelte`
- [x] T014 [US3] Update the `draw` loop in `apps/web/src/lib/components/map/MapView.svelte` to render a ghost token at `mapSession.dragPreview` coordinates.
- [x] T015 [US3] Add validation check in `MapView.svelte` to change preview style (e.g., red tint) when the cursor is over invalid drop zones.

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T016 [P] Add automated Vitest coverage for `UIStore` persistence in `apps/web/src/lib/stores/ui.svelte.test.ts`
- [x] T017 [P] Add E2E Playwright coverage in `apps/web/tests/map.spec.ts` verifying:
  - Successful token creation from 'Actor'/'Object' drag.
  - Prevention of dragging restricted types.
  - Creation of multiple tokens from the same entity (FR-007).
  - P2P sync latency remains under 200ms (SC-004).
- [x] T018 Add a new help guide section for VTT Entity List in `apps/web/src/lib/config/help-content.ts`

## Dependencies

- US1 is the foundation for US2 and US3.
- US2 can be implemented once US1 is complete.
- US3 provides feedback for US2 but depends on the drag-and-drop event pipeline established in US2.

## Parallel Execution

- T001 and T003 can be done in parallel.
- T016 (Tests) can be started as soon as T001/T002 are complete.
- T018 (Docs) can be done in parallel with implementation.
