# Tasks: Add to Canvas in Context Menu

**Input**: Design documents from `/specs/076-add-canvas-context-menu/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, quickstart.md

**Tests**: Unit tests for canvas add logic, E2E test for context menu flow

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3])
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `apps/web/src/lib/` for components, stores, config

<!--
  ============================================================================
  Tasks generated for feature 076-add-canvas-context-menu
  Organized by user story for independent implementation
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verify existing patterns

- [ ] T001 Verify existing context menu pattern in `apps/web/src/lib/components/graph/GraphContextMenu.svelte`
- [ ] T002 Verify canvas store structure in `apps/web/src/lib/stores/canvas-registry.svelte.ts`
- [ ] T003 [P] Verify toast notification pattern exists in codebase

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Add `addEntities(canvasId, entityIds)` method to canvas store in `apps/web/src/lib/stores/canvas-registry.svelte.ts`
- [ ] T005 [P] Add `createCanvas(entityIds, title?)` method to canvas store in `apps/web/src/lib/stores/canvas-registry.svelte.ts`
- [ ] T006 [P] Create `CanvasAddResult` type definition in `apps/web/src/lib/stores/canvas-registry.svelte.ts`
- [ ] T007 [P] Implement duplicate detection logic in canvas store `addEntities()` method
- [ ] T008 [P] Update `lastUsedAt` timestamp when canvas is accessed

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Add Selected Entity to Existing Canvas (Priority: P1) 🎯 MVP

**Goal**: Allow users to right-click a single selected entity and add it to an existing canvas

**Independent Test**: Select 1 entity → right-click → "Add to Canvas" → select canvas → verify entity added with toast notification

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T009 [P] [US1] Unit test for `addEntities()` with single entity in `apps/web/src/lib/stores/canvas-registry.test.ts`
- [ ] T010 [P] [US1] Unit test for duplicate detection in `apps/web/src/lib/stores/canvas-registry.test.ts`
- [ ] T011 [US1] E2E test: Add single entity to canvas via context menu in `apps/web/tests/canvas-add-context-menu.spec.ts`

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create `CanvasPicker.svelte` component with submenu structure in `apps/web/src/lib/components/canvas/CanvasPicker.svelte`
- [ ] T013 [P] [US1] Add "Add to Canvas" menu item to `GraphContextMenu.svelte` in `apps/web/src/lib/components/graph/GraphContextMenu.svelte`
- [ ] T014 [US1] Implement canvas list fetching (up to 5 recents) in `CanvasPicker.svelte`
- [ ] T015 [US1] Wire up context menu click handler to call `canvasStore.addEntities()` in `GraphContextMenu.svelte`
- [ ] T016 [US1] Add toast notification on success in `apps/web/src/lib/components/graph/GraphView.svelte`
- [ ] T017 [US1] Add toast notification for skipped duplicates in `apps/web/src/lib/components/graph/GraphView.svelte`
- [ ] T018 [US1] Add keyboard navigation for submenu (arrow keys, Enter, Escape) in `CanvasPicker.svelte`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Add Multiple Selected Entities (Priority: P2)

**Goal**: Allow users to add all selected entities to a canvas in one action

**Independent Test**: Select 5 entities → right-click → "Add to Canvas" → select canvas → verify all 5 added with summary toast

### Tests for User Story 2 ⚠️

- [ ] T019 [P] [US2] Unit test for `addEntities()` with multiple entities in `apps/web/src/lib/stores/canvas-registry.test.ts`
- [ ] T020 [P] [US2] Unit test for partial duplicates (some exist, some new) in `apps/web/src/lib/stores/canvas-registry.test.ts`
- [ ] T021 [US2] E2E test: Add multiple entities to canvas via context menu in `apps/web/tests/canvas-add-context-menu.spec.ts`

### Implementation for User Story 2

- [ ] T022 [P] [US2] Update context menu handler to pass all selected entity IDs in `GraphContextMenu.svelte`
- [ ] T023 [US2] Update toast notification to show count ("Added 5 entities to 'Canvas Name'") in `apps/web/src/lib/components/graph/GraphView.svelte`
- [ ] T024 [US2] Update duplicate notification to show count ("Skipped 2 duplicates") in `apps/web/src/lib/components/graph/GraphView.svelte`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Create New Canvas from Selection (Priority: P3)

**Goal**: Allow users to create a new canvas containing selected entities

**Independent Test**: Select entities → right-click → "Create New Canvas" → enter name → verify new canvas created with entities

### Tests for User Story 3 ⚠️

- [ ] T025 [P] [US3] Unit test for `createCanvas()` with entities in `apps/web/src/lib/stores/canvas-registry.test.ts`
- [ ] T026 [P] [US3] Unit test for cancel flow in `apps/web/src/lib/stores/canvas-registry.test.ts`
- [ ] T027 [US3] E2E test: Create new canvas from selection via context menu in `apps/web/tests/canvas-add-context-menu.spec.ts`

### Implementation for User Story 3

- [ ] T028 [P] [US3] Add "+ New Canvas" option to `CanvasPicker.svelte` submenu
- [ ] T029 [US3] Implement canvas name prompt dialog in `apps/web/src/lib/components/canvas/CanvasNamePrompt.svelte`
- [ ] T030 [US3] Wire up "New Canvas" click to call `canvasStore.createCanvas()` in `CanvasPicker.svelte`
- [ ] T031 [US3] Generate default canvas name (e.g., "5 entities" or first entity title) in `canvas-registry.svelte.ts`
- [ ] T032 [US3] Handle cancel flow (no canvas created) in `CanvasNamePrompt.svelte`
- [ ] T033 [US3] Show "Create New Canvas" as only option when no canvases exist in `CanvasPicker.svelte`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T034 [P] Add help article to `apps/web/src/lib/config/help-content.ts` with title "Adding Entities to Canvas"
- [ ] T035 [P] Add FeatureHint component for first-time context menu usage in `apps/web/src/lib/components/help/FeatureHint.svelte`
- [ ] T036 [P] Update quickstart.md with actual implementation details
- [ ] T037 Code cleanup and refactoring
- [ ] T038 [P] Run full test suite and fix any regressions
- [ ] T039 [P] Verify accessibility (keyboard navigation, screen reader labels)
- [ ] T040 [P] Performance check: context menu appears <200ms

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 infrastructure
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent canvas creation flow

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Component creation before wiring
- Store integration before notifications
- Core implementation before polish

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Component creation tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for addEntities() with single entity"
Task: "Unit test for duplicate detection"

# Launch component creation for User Story 1 together:
Task: "Create CanvasPicker.svelte component"
Task: "Add menu item to GraphContextMenu.svelte"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
