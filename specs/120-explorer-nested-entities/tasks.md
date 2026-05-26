# Tasks: Entity Explorer Hierarchy & Nested Entities

**Input**: Design documents from `/specs/120-explorer-nested-entities/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Tests are required under project guidelines (TDD). Test tasks are defined at the start of each phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Register parent attribute schema and persistence structure

- [x] T001 Register parent field in entity schema definition in packages/schema/src/entity.ts
- [x] T002 Update UI storage keys and type declarations in apps/web/src/lib/stores/ui/persistence.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logic and store changes that must be complete before UI can render the hierarchy

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Write unit tests for child entity creation and parent delete promotion in apps/web/src/lib/stores/vault/entities.test.ts
- [x] T004 Implement parent field initialization in createEntity and child promotion in deleteEntity in apps/web/src/lib/stores/vault/entities.ts
- [x] T005 [P] Write unit tests for collapsed entity persistence in apps/web/src/lib/stores/ui/explorer-ui.test.ts
- [x] T006 Implement getCollapsedEntities and toggleExplorerEntityCollapse in apps/web/src/lib/stores/ui/explorer-ui.svelte.ts
- [x] T007 [P] Write cycle-detection unit tests in apps/web/src/lib/stores/vault/entities.test.ts
- [x] T008 Implement cycle-detection utility function detectCycle in apps/web/src/lib/stores/vault/entities.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Expand/Collapse Hierarchical Nested View (Priority: P1) 🎯 MVP

**Goal**: Render a collapsible, nested indented tree structure in the Entity Explorer List View

**Independent Test**: Launch local dev server, create nested entities, click chevrons to collapse/expand. Verify depth cap at 8 levels and search dimensions.

- [x] T009 [P] [US1] Write unit tests for tree structure derived calculation and search filtering in apps/web/src/lib/components/explorer/EntityList.test.ts
- [x] T010 [US1] Implement derived tree nodes calculation and search-dimming logic in apps/web/src/lib/components/explorer/EntityList.svelte
- [x] T011 [US1] Implement Svelte 5 recursive snippet and styling with cap depth at 8 levels in apps/web/src/lib/components/explorer/EntityList.svelte

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 2 - Create Child Entity Directly Under a Parent (Priority: P2)

**Goal**: Add inline child creation form and hover "+" action in the tree view

**Independent Test**: Hover parent, click "+", fill form and submit, verify child nests instantly. Verify controls are hidden in Guest Mode.

- [x] T012 [US2] Implement inline child creation form state and keyboard keydown handlers in apps/web/src/lib/components/explorer/EntityList.svelte
- [x] T013 [US2] Style "+" child button and inline form with Tailwind 4 theme tokens, hiding them for guest sessions in apps/web/src/lib/components/explorer/EntityList.svelte

**Checkpoint**: At this point, child entities can be created directly from the tree hierarchy.

---

## Phase 5: User Story 3 - Re-parent/Move Entities (Priority: P3)

**Goal**: Implement drag-and-drop to move entities between parent nodes or to root

**Independent Test**: Drag an entity, drop directly onto another entity to re-parent it, or onto the "Move to Root" dropzone to promote it. Verify cycle check blocks invalid loops.

- [x] T014 [US3] Implement dragstart and drop re-parenting event handlers in apps/web/src/lib/components/explorer/EntityList.svelte
- [x] T015 [US3] Add a visual "Move to Root" dropzone header shown only during active dragging in apps/web/src/lib/components/explorer/EntityList.svelte

**Checkpoint**: Full hierarchical tree manipulation via drag-and-drop is fully operational.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate code quality, test suite execution, and documentation

- [x] T016 Verify code against strict lint rules using bun run lint in package.json
- [x] T017 Run unit tests to verify 100% test pass using bun run test in package.json
- [x] T018 [P] Add user help documentation and hint keys in apps/web/src/lib/config/help-content.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (Phase 3) must be implemented first to render the hierarchy.
  - US2 and US3 can proceed in parallel or sequentially once US1 is done.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

---

## Parallel Execution Examples

- **Foundational**:
  - T003, T005, and T007 (unit tests setup) can be written in parallel.
- **User Story 1**:
  - T009 (test suite setup) can run in parallel with T010 logic setup.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Complete Phase 3: User Story 1 (collapsible visual hierarchy).
3. **STOP and VALIDATE**: Verify rendering and collapse mechanics with mock data in browser.

### Incremental Delivery

1. Deploy Setup + Foundational + User Story 1 (read-only collapsible hierarchy).
2. Deploy User Story 2 (creation of nested nodes).
3. Deploy User Story 3 (drag-and-drop movement and cycle safety).
