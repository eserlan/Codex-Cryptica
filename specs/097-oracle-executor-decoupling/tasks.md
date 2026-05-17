# Tasks: Oracle Executor Decoupling

**Input**: Design documents from `/specs/097-oracle-executor-decoupling/`
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`

## Phase 1: Setup & Infrastructure (Shared)

**Purpose**: Shared infrastructure and event definitions.

- [x] T001 Define `OracleCommandExecutor` interface in `packages/oracle-engine/src/types.ts`
- [ ] T002 Register new `ORACLE:*` events in `packages/oracle-engine/src/events.ts`
- [ ] T003 Create `BaseExecutor` class in `packages/oracle-engine/src/executors/base-executor.ts`
- [ ] T004 [P] Initialize `executors/` directory and basic test scaffold
- [ ] T004b Design and implement circular dependency prevention mechanism in `BaseExecutor` (Edge Case)

---

## Phase 2: User Story 1 - Simple Command Modularization (P1) 🎯 MVP

**Goal**: Extract core stateless commands into handlers.

### Tests for User Story 1

- [ ] T005 [P] [US1] Unit test for `/roll` in `packages/oracle-engine/src/executors/dice-executor.test.ts`
- [ ] T006 [P] [US1] Unit test for `/help` and `/clear` in `packages/oracle-engine/src/executors/meta-executor.test.ts`

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement `DiceExecutor` in `packages/oracle-engine/src/executors/dice-executor.ts`
- [ ] T008 [P] [US1] Implement `MetaExecutor` (/help, /clear) in `packages/oracle-engine/src/executors/meta-executor.ts`
- [ ] T009 [US1] Update `OracleActionExecutor` dispatcher to delegate US1 commands

---

## Phase 3: User Story 2 - Event-Driven Side Effects (P2)

**Goal**: Decouple logic from UI and logging via events.

### Tests for User Story 2

- [ ] T010 [P] [US2] Integration test for event-driven notifications in `tests/oracle-events.test.ts`

### Implementation for User Story 2

- [ ] T011 [P] [US2] Update `DiceExecutor` and `MetaExecutor` to emit typed events
- [ ] T012 [US2] Implement global event listeners in `apps/web/src/lib/listeners/oracle-events.ts`

---

## Phase 4: User Story 3 - Mutation Command Decoupling (P3)

**Goal**: Extract stateful mutation commands and inject dependencies.

### Tests for User Story 3

- [ ] T013 [P] [US3] Unit test for entity creation logic in `packages/oracle-engine/src/executors/create-executor.test.ts`
- [ ] T014 [P] [US3] Unit test for connection/merge logic in `packages/oracle-engine/src/executors/connect-executor.test.ts`

### Implementation for User Story 3

- [ ] T015 [P] [US3] Implement `CreateExecutor` in `packages/oracle-engine/src/executors/create-executor.ts`
- [ ] T016 [P] [US3] Implement `ConnectExecutor` in `packages/oracle-engine/src/executors/connect-executor.ts`
- [ ] T017 [P] [US3] Implement `MergeExecutor` in `packages/oracle-engine/src/executors/merge-executor.ts`
- [ ] T018 [P] [US3] Implement `PlotExecutor` in `packages/oracle-engine/src/executors/plot-executor.ts`
- [ ] T019 [P] [US3] Implement `VisualizationExecutor` (drawEntity, drawMessage) in `packages/oracle-engine/src/executors/visualization-executor.ts`

---

## Phase 5: User Story 4 - AI Orchestration Extraction (P4)

**Goal**: Extract complex AI multi-step logic.

### Tests for User Story 4

- [ ] T020 [P] [US4] Unit test for chat orchestration in `packages/oracle-engine/src/executors/chat-executor.test.ts`
- [ ] T021 [P] [US4] Unit test for regeneration logic in `packages/oracle-engine/src/executors/regenerate-executor.test.ts`

### Implementation for User Story 4

- [ ] T022 [P] [US4] Implement `RegenerateExecutor` in `packages/oracle-engine/src/executors/regenerate-executor.ts`
- [ ] T023 [P] [US4] Implement `ChatExecutor` (The core AI orchestrator) in `packages/oracle-engine/src/executors/chat-executor.ts`
- [ ] T024 [US4] Sub-extract Discovery reactor from Chat logic

---

## Phase 6: Polish & Cleanup (Rule X & XI Alignment)

- [ ] T025 [P] Finalize `OracleActionExecutor.ts` dispatcher reduction (Target: < 300 LOC)
- [ ] T025b Audit `OracleActionExecutor.ts` to ensure `$state.snapshot` is applied correctly before passing context to async executors (Edge Case)
- [ ] T026 [US5] Run coverage reports and verify `oracle-engine` coverage is >= 70% (Constitution Rule X)
- [ ] T027 Code cleanup and documentation updates in `docs/refactoring/`
- [ ] T028 Run existing Playwright and Vitest integration suites to verify zero regressions in guest mode and privacy parity
- [ ] T029 Verify that all implemented handlers strictly adhere to **Constitution Rule XI (Agent Operational Protocol)** (Think First, Verify Everything)
