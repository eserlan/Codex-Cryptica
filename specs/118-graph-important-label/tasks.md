# Tasks: Graph Important Label

**Input**: Design documents from `/specs/118-graph-important-label/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: Required by the project constitution for all behavior changes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- All implementation tasks include exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm feature context and avoid drifting from the Speckit artifacts.

- [x] T001 Review feature contracts in specs/118-graph-important-label/contracts/graph-important-label.md
- [x] T002 Review graph styling ownership in packages/graph-engine/src/transformer.ts
- [x] T003 Review existing graph context-menu behavior in apps/web/src/lib/components/graph/ContextMenu.svelte and apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared graph data/style contract used by all user stories.

**CRITICAL**: No user story should be considered complete until important-node graph data and visual styling are testable.

- [x] T004 [P] Add failing transformer test for deriving an important-node data flag from `labels: ["important"]` in packages/graph-engine/src/transformer.test.ts
- [x] T005 [P] Add failing graph style test proving important nodes get a non-text visual treatment in packages/graph-engine/src/transformer.test.ts
- [x] T006 Add derived important-node data flag in packages/graph-engine/src/transformer.ts
- [x] T007 Add important-node Cytoscape style that is visually distinct without using connection-count size as the only signal in packages/graph-engine/src/transformer.ts

**Checkpoint**: Graph engine can identify and style important entities independently of web UI.

---

## Phase 3: User Story 1 - Mark a Graph Entity Important (Priority: P1) MVP

**Goal**: A user can right-click one editable graph entity, mark it important, and see it become visually distinct in the graph.

**Independent Test**: Open the graph context menu for one editable entity, choose `Mark Important`, and verify the entity gains the `important` label and important graph treatment.

### Tests for User Story 1

- [x] T008 [P] [US1] Add controller test for marking a single selected node important in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts
- [x] T009 [P] [US1] Add controller test for no-change feedback when a single target is already important in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts
- [x] T010 [P] [US1] Add controller failure-path test for rejected label mutation in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts

### Implementation for User Story 1

- [x] T011 [US1] Add `handleMarkImportant` controller action using `vault.bulkAddLabel([id], "important")` in apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts
- [x] T012 [US1] Add `Mark Important` menu item for editable graph sessions in apps/web/src/lib/components/graph/ContextMenu.svelte
- [x] T013 [US1] Ensure success, already-important, and failure messages use plain language in apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts
- [x] T014 [US1] Verify single-node important label changes flow through graph elements and style refresh in apps/web/src/lib/components/GraphView.svelte

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Mark Selected Graph Entities Important (Priority: P2)

**Goal**: A user can mark all selected graph entities important from one context-menu action.

**Independent Test**: Select multiple editable graph entities, right-click one selected entity, choose `Mark Important`, and verify each selected entity gains the `important` label and distinct graph treatment.

### Tests for User Story 2

- [x] T015 [P] [US2] Add controller test for applying `important` to multiple selected node ids in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts
- [x] T016 [P] [US2] Add controller test for no-change feedback when all selected nodes are already important in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts
- [x] T017 [P] [US2] Add controller test for empty selection no-op in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts

### Implementation for User Story 2

- [x] T018 [US2] Ensure context-menu selection resolution preserves selected-node targets for the important action in apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts
- [x] T019 [US2] Ensure multi-select success and no-change copy reports selected-node outcomes in apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Respect Read-Only Graph Sessions (Priority: P3)

**Goal**: Guest or read-only graph sessions cannot mutate labels through the important action.

**Independent Test**: Open a graph context menu in a guest/read-only session and verify `Mark Important` is unavailable.

### Tests for User Story 3

- [x] T020 [P] [US3] Add component or controller-adjacent test coverage that the `Mark Important` menu item is not available when `vault.isGuest` is true in apps/web/src/lib/components/graph/ContextMenu.svelte or apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts

### Implementation for User Story 3

- [x] T021 [US3] Confirm the `Mark Important` menu item is rendered only inside the editable-session branch in apps/web/src/lib/components/graph/ContextMenu.svelte

**Checkpoint**: Read-only sessions provide no graph context-menu path to mutate importance labels.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation alignment, and PR hygiene.

- [x] T022 [P] Update specs/118-graph-important-label/quickstart.md if final user-facing behavior differs from the planned flow
- [x] T023 [P] Confirm no user-facing changelog entry is needed for implementation-only or planning-only changes in apps/web/src/lib/content/changelog/releases.json
- [x] T024 Run focused graph-engine tests for packages/graph-engine/src/transformer.test.ts
- [ ] T025 Run focused web graph context-menu tests for apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts
- [ ] T026 Run repository validation with `bun run lint` and `bun run test`
- [ ] T027 Update PR #891 summary if implementation scope or validation results change

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup; blocks completion of all user stories because visual distinction is shared
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational and can reuse the US1 controller action
- **User Story 3 (Phase 5)**: Depends on the context-menu implementation path
- **Polish (Phase 6)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: MVP; no dependency on US2 or US3 after Foundational
- **US2 (P2)**: Extends the same action to selected-node sets; can be implemented after or alongside US1 controller work
- **US3 (P3)**: Verifies rendering guard for guest/read-only sessions; can be checked once the menu item exists

### Parallel Opportunities

- T004 and T005 can be written in parallel because they cover different graph-engine assertions.
- T008, T009, and T010 can be written in parallel because they cover separate controller outcomes.
- T015, T016, and T017 can be written in parallel because they cover separate multi-select outcomes.
- T022 and T023 can be completed in parallel with final test runs.

## Parallel Example: User Story 1

```text
Task: "Add controller test for marking a single selected node important in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts"
Task: "Add controller test for no-change feedback when a single target is already important in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts"
Task: "Add controller failure-path test for rejected label mutation in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts"
```

## Parallel Example: User Story 2

```text
Task: "Add controller test for applying important to multiple selected node ids in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts"
Task: "Add controller test for no-change feedback when all selected nodes are already important in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts"
Task: "Add controller test for empty selection no-op in apps/web/src/lib/components/graph/graph-context-menu-controller.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete User Story 1.
3. Stop and validate: one editable graph entity can be marked important and becomes visually distinct.

### Incremental Delivery

1. Add graph-engine important data/style contract.
2. Add single-node context-menu action.
3. Add multi-select behavior and feedback.
4. Verify guest/read-only guard.
5. Run focused tests, then full repository validation.

## Notes

- Keep the persisted source of truth as the existing `important` label.
- Do not add a separate importance field or settings surface.
- Important-node visual styling must not rely only on node size, because node size already communicates connection count.
- Preserve existing category, image, draft, revealed, selected, and focus-mode styling behavior.
