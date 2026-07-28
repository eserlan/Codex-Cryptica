# Tasks: Dungeon & Delve Structural Builder (#145 / #1843)

**Feature Branch**: `145-dungeon-structural-builder`  
**Input**: Design artifacts from `/specs/1843-dungeon-structural-builder/`

## Phase 1: Setup & Data Schemas

- [x] T001 Create Delve structural builder types (`DelveRoomNodeData`, `DelveEdgeData`, `DungeonSectorFrameData`, `DelveCanvasDocument`) in `packages/generator-engine/src/dungeon/delve-builder-types.ts`
- [x] T002 Export delve structural types from `packages/generator-engine/src/dungeon/index.ts`

## Phase 2: Foundational Algorithms (TDD)

- [x] T003 [P] Write unit tests for procedural topology generator in `packages/generator-engine/src/dungeon/delve-topology-generator.test.ts`
- [x] T004 Implement procedural topology generator `DelveTopologyGenerator` in `packages/generator-engine/src/dungeon/delve-topology-generator.ts`
- [x] T005 [P] Write unit tests for sector-aware hierarchical flow layout algorithm in `packages/generator-engine/src/dungeon/delve-flow-layout.test.ts`
- [x] T006 Implement hierarchical flow layout engine `DelveFlowLayout` in `packages/generator-engine/src/dungeon/delve-flow-layout.ts`

## Phase 3: User Story 1 - Build Delve on Canvas & Service Integration (Priority: P1)

- [x] T007 [US1] [P] Write unit tests for `DungeonDelveService` concept-to-canvas conversion in `apps/web/src/lib/services/dungeon-delve-service.test.ts`
- [x] T008 [US1] Implement `DungeonDelveService` converting Dungeon Concept entities to `.canvas` documents in `apps/web/src/lib/services/dungeon-delve-service.ts`
- [x] T009 [US1] Add "Build Delve on Canvas" action button to Dungeon Concept entity header / view

## Phase 4: User Story 2 - Canvas Components & Custom Edges (Priority: P2)

- [x] T010 [US2] [P] Write unit tests for canvas node & edge helper functions in `apps/web/src/lib/components/canvas/delve-components.test.ts`
- [x] T011 [US2] Implement specialized canvas node component `apps/web/src/lib/components/canvas/DelveRoomNode.svelte` with role badges, sector tag, stocking chips, and action buttons
- [x] T012 [US2] Implement custom canvas edge component `apps/web/src/lib/components/canvas/DelveEdge.svelte` rendering standard, hidden (dashed 👁️), conditional (locked 🔒), vertical (ladder 🪜), and directional styles
- [x] T013 [US2] Implement passage attribute editor modal `apps/web/src/lib/components/canvas/EdgeAttributeModal.svelte`
- [x] T014 [US2] Register `delveRoom` node and `delveEdge` custom types in `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte`

## Phase 5: User Story 3 - Context-Aware Room Stocking & Single-Room AI Regeneration (Priority: P3)

- [x] T015 [US3] [P] Write unit tests for context-aware room stocking and single-room AI regeneration in `packages/generator-engine/src/dungeon/delve-stocking-service.test.ts`
- [x] T016 [US3] Implement `DelveStockingService` in `packages/generator-engine/src/dungeon/delve-stocking-service.ts`
- [x] T017 [US3] Implement room stocking inspector drawer `apps/web/src/lib/components/canvas/RoomStockingDrawer.svelte`
- [x] T018 [US3] Connect "Regenerate Room (AI)" context menu action on `DelveRoomNode`

## Phase 6: User Story 4 - Canvas Persistence, Connectivity & User Documentation (Priority: P4)

- [x] T019 [US4] [P] Write unit tests for graph connectivity validation in `packages/generator-engine/src/dungeon/delve-connectivity-validator.test.ts`
- [x] T020 [US4] Implement graph connectivity validator `delve-connectivity-validator.ts` and highlight orphaned nodes on canvas
- [x] T021 [US4] Add user-facing help documentation guide for the Delve Spatial Canvas Builder in `apps/web/src/lib/config/help-content.ts`

## Phase 7: Verification & Quality Assurance

- [x] T022 Run complete unit test suite (`bun run test`)
- [x] T023 Run linter (`bun run lint`) to ensure zero errors or warnings
