# Tasks: Central Node Orbit Layout

**Feature Branch**: `032-central-node-orbit`
**Spec**: [specs/032-central-node-orbit/spec.md](spec.md)

## Phase 1: Setup
**Goal**: Initialize project structure and ensure dependencies are ready.

- [x] T001 Create directory for graph engine logic in packages/graph-engine/src/layouts/
- [x] T002 Create placeholder test file in packages/graph-engine/tests/orbit.test.ts

## Phase 2: Foundational
**Goal**: Implement the core graph logic for orbit layout (BFS calculation and Cytoscape configuration).
**Blocking**: These tasks must be completed before UI integration.

- [x] T003 [P] Implement BFS distance calculation helper in packages/graph-engine/src/layouts/orbit.ts
- [x] T004 [P] Implement `setCentralNode` function wrapping Cytoscape `concentric` layout (with animation config) in packages/graph-engine/src/layouts/orbit.ts
- [x] T005 [P] Implement `clearOrbit` function to restore previous state in packages/graph-engine/src/layouts/orbit.ts
- [x] T006 Integrate orbit functions into main Graph class in packages/graph-engine/src/graph.ts
- [x] T007 Verify BFS and layout logic with unit tests in packages/graph-engine/tests/orbit.test.ts

## Phase 3: User Story 1 (Activate Orbit Layout)
**Goal**: Allow users to select a node and see the graph rearrange into an orbit layout.
**Story**: [US1] Activate Orbit Layout

- [x] T008 [US1] Add `orbitMode` state to graph store in apps/web/src/lib/stores/graphStore.ts
- [x] T009 [US1] Create `OrbitControls.svelte` component (initially empty or simple status) in apps/web/src/lib/components/graph/OrbitControls.svelte
- [x] T010 [US1] Add "Set as Central Node" option to Context Menu in apps/web/src/lib/components/graph/ContextMenu.svelte
- [x] T011 [US1] Connect Context Menu action to graph engine `setCentralNode` in apps/web/src/lib/components/graph/GraphWrapper.svelte

## Phase 4: User Story 2 (Switch Center)
**Goal**: Allow users to click another node while in orbit mode to switch the center.
**Story**: [US2] Switch Center

- [x] T012 [US2] Update graph interaction handler to detect clicks in orbit mode in apps/web/src/lib/components/graph/GraphWrapper.svelte
- [x] T013 [US2] Wire node click to trigger `setCentralNode` when orbit mode is active in apps/web/src/lib/components/graph/GraphWrapper.svelte

## Phase 5: User Story 3 (Return to Default Layout)
**Goal**: Allow users to exit orbit mode and return to the previous layout.
**Story**: [US3] Return to Default Layout

- [x] T014 [US3] Add "Exit Orbit View" button to apps/web/src/lib/components/graph/OrbitControls.svelte
- [x] T015 [US3] Wire "Exit" button to `clearOrbit` and reset store state in apps/web/src/lib/components/graph/GraphWrapper.svelte

## Phase 6: Polish & Cross-Cutting
**Goal**: Handle edge cases (disconnected nodes), animations, and final verification.

- [x] T016 [P] Ensure disconnected nodes are placed in the outermost orbit (logic check) in packages/graph-engine/src/layouts/orbit.ts
- [x] T017 Create E2E test for full orbit lifecycle (including Offline Functionality Verification) in apps/web/tests/orbit.spec.ts
- [x] T018 Run full test suite and verify no regressions in packages/graph-engine/tests/

## Dependencies

- Phase 2 (Logic) blocks Phase 3 (UI)
- Phase 3 blocks Phase 4 and Phase 5
- Phase 4 and Phase 5 can be implemented in parallel after Phase 3

## Implementation Strategy

1.  **MVP Scope**: Complete Phases 1, 2, and 3. This allows activating the mode.
2.  **Full Feature**: Complete Phases 4 and 5 to allow navigation and exiting.
3.  **Quality**: Finalize with Phase 6.
