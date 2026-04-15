# Tasks: Progressive Node Sizing

**Input**: Design documents from `/specs/082-progressive-node-size/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: Unit tests are REQUIRED per project constitution (TDD).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment verification

- [x] T001 Verify `packages/graph-engine` development environment and run baseline tests using `npm test -w packages/graph-engine`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logic verification

- [x] T002 [P] Create unit tests for `weight` calculation in `packages/graph-engine/tests/transformer.test.ts`, covering inbound links and filtered targets
- [x] T003 Verify `GraphNode` interface in `packages/graph-engine/src/transformer.ts` includes `weight: number`

**Checkpoint**: Foundation ready - rendered connectivity weights are verified in the transformer output.

---

## Phase 3: User Story 1 - Visual Hub Identification (Priority: P1) 🎯 MVP

**Goal**: Most connected nodes grow visually larger to identify hubs.

**Independent Test**: Create a node with 3 connections and verify its size is 64px (Tier 1).

### Tests for User Story 1

- [x] T004 [P] [US1] Create test for tier-based styling in `packages/graph-engine/src/GraphStyles.test.ts` verifying `width` for weights 0, 3, 7, and 12.

### Implementation for User Story 1

- [x] T005 [US1] Implement discrete size tiers (Tiers 0, 1, 2) using Cytoscape data selectors in `packages/graph-engine/src/transformer.ts` (specifically in `getGraphStyle`).
- [x] T006 [US1] Update node `transition-property` to include `width` and `height` in `packages/graph-engine/src/transformer.ts` to enable smooth tier transitions.

**Checkpoint**: Hub identification works - nodes grow as connections are added.

---

## Phase 4: User Story 2 - Progressive Scaling Limits (Priority: P2)

**Goal**: Capped scaling so large nodes don't obscure the graph.

**Independent Test**: Create a node with 20 connections and verify its size does not exceed 128px (Tier 3).

### Tests for User Story 2

- [x] T007 [P] [US2] Add test cases to `packages/graph-engine/src/GraphStyles.test.ts` verifying that weight 15 and weight 50 both result in 128px size.

### Implementation for User Story 2

- [x] T008 [US2] Implement Tier 3 selector (`node[weight >= 11]`) with 128px cap in `packages/graph-engine/src/transformer.ts`.
- [x] T009 [US2] Verify Tier 0 (`node[weight <= 1]`) maintains minimum 48px size in `packages/graph-engine/src/transformer.ts`.

**Checkpoint**: Scaling is safely capped at Hub level (128px).

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final validation

- [x] T010 [P] Add user-facing documentation for node connectivity sizing to `apps/web/src/lib/config/help-content.ts`
- [x] T011 Run final manual validation using `quickstart.md` in a live environment.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS US1.
- **User Story 1 (Phase 3)**: Depends on Foundational - BLOCKS US2 (for logical progression).
- **User Story 2 (Phase 4)**: Depends on US1 completion.
- **Polish (Final Phase)**: Depends on US1 and US2.

### Parallel Opportunities

- T002 (Foundational) can run in parallel with T003.
- T010 (Documentation) can start as soon as US1 implementation is defined.
- T004 and T007 (Tests) can be developed together.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational.
2. Implement Tiers 0-2 in US1.
3. Validate hub identification in graph view.

### Incremental Delivery

1. Foundation: Weight verification.
2. US1: Basic hub identification (Tier 0-2).
3. US2: Hub capping (Tier 3).
4. Polish: Help documentation.

### Review Follow-up

- [x] T012 Recalculate `weight` from the rendered graph degree instead of raw outbound connection counts in `packages/graph-engine/src/transformer.ts`.
- [x] T013 Add regression coverage for one-way hubs and hidden or missing targets in `packages/graph-engine/tests/transformer.test.ts`.
