# Tasks: Oracle Executor Decoupling

**Input**: Design documents from `/specs/097-oracle-executor-decoupling/`
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`

## Phase 1: Setup & Infrastructure (Shared)

**Purpose**: Shared infrastructure and event definitions.

- [x] T001 Define `OracleCommandExecutor` interface in `packages/oracle-engine/src/types.ts`
- [x] T002 Register new `ORACLE:*` events in `packages/oracle-engine/src/events.ts`
- [x] T003 Create `BaseExecutor` class in `packages/oracle-engine/src/executors/base-executor.ts`
- [x] T004 [P] Initialize `executors/` directory and basic test scaffold
- [x] T004b Design and implement circular dependency prevention mechanism in `BaseExecutor` (Edge Case)

---

## Phase 2: User Story 1 - Simple Command Modularization (P1) 🎯 MVP

**Goal**: Extract core stateless commands into handlers.

### Tests for User Story 1

- [x] T005 [P] [US1] Unit test for `/roll` in `packages/oracle-engine/src/executors/dice-executor.test.ts`
- [x] T006 [P] [US1] Unit test for `/help` and `/clear` in `packages/oracle-engine/src/executors/meta-executor.test.ts`

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement `DiceExecutor` in `packages/oracle-engine/src/executors/dice-executor.ts`
- [x] T008 [P] [US1] Implement `MetaExecutor` (/help, /clear) in `packages/oracle-engine/src/executors/meta-executor.ts`
- [x] T009 [US1] Update `OracleActionExecutor` dispatcher to delegate US1 commands

---

## Phase 3: User Story 2 - Event-Driven Side Effects (P2)

**Goal**: Decouple logic from UI and logging via events.

### Tests for User Story 2

- [x] T010 [P] [US2] Integration test for event-driven notifications in `tests/oracle-events.test.ts`

### Implementation for User Story 2

- [x] T011 [P] [US2] Update `DiceExecutor` and `MetaExecutor` to emit typed events
- [x] T012 [US2] Implement global event listeners in `apps/web/src/lib/listeners/oracle-events.ts`

---

## Phase 4: User Story 3 - Mutation & Visualization Decoupling (P3)

**Goal**: Extract stateful mutation commands and inject dependencies.

### Tests for User Story 3

- [x] T013 [P] [US3] Unit test for entity creation logic in `packages/oracle-engine/src/executors/create-executor.test.ts`
- [x] T014 [P] [US3] Unit test for connection/merge logic in `packages/oracle-engine/src/executors/connect-executor.test.ts`

### Implementation for User Story 3

- [x] T015 [P] [US3] Implement `CreateExecutor` in `packages/oracle-engine/src/executors/create-executor.ts`
- [x] T016 [P] [US3] Implement `ConnectExecutor` in `packages/oracle-engine/src/executors/connect-executor.ts`
- [x] T017 [P] [US3] Implement `MergeExecutor` in `packages/oracle-engine/src/executors/merge-executor.ts`
- [x] T018 [P] [US3] Implement `PlotExecutor` in `packages/oracle-engine/src/executors/plot-executor.ts`
- [x] T019 [P] [US3] Implement `VisualizationExecutor` (drawEntity, drawMessage) in `packages/oracle-engine/src/executors/visualization-executor.ts`

---

## Phase 5: User Story 4 - AI Orchestration Extraction (P4)

**Goal**: Extract complex AI multi-step logic.

### Tests for User Story 4

- [x] T020 [P] [US4] Unit test for chat orchestration in `packages/oracle-engine/src/executors/chat-executor.test.ts`
- [x] T021 [P] [US4] Unit test for regeneration logic in `packages/oracle-engine/src/executors/regenerate-executor.test.ts`

### Implementation for User Story 4

- [x] T022 [P] [US4] Implement `RegenerateExecutor` in `packages/oracle-engine/src/executors/regenerate-executor.ts`
- [x] T023 [P] [US4] Implement `ChatExecutor` (The core AI orchestrator) in `packages/oracle-engine/src/executors/chat-executor.ts`
- [x] T024 [US4] Sub-extract Discovery reactor from Chat logic

---

## Phase 6: Polish & Cleanup (Rule X & XI Alignment)

- [x] T025 [P] Finalize `OracleActionExecutor.ts` dispatcher reduction (Target: < 300 LOC)
- [x] T025b Audit `OracleActionExecutor.ts` to ensure `$state.snapshot` is applied correctly before passing context to async executors (Edge Case)
- [x] T026 [US5] Run coverage reports and verify `oracle-engine` coverage is >= 70% (Constitution Rule X)
- [x] T027 Code cleanup and documentation updates in `docs/refactoring/`
- [x] T028 Run existing Playwright and Vitest integration suites to verify zero regressions in guest mode and privacy parity
- [x] T029 Verify that all implemented handlers strictly adhere to **Constitution Rule XI (Agent Operational Protocol)** (Think First, Verify Everything)
