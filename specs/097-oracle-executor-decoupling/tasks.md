# Tasks: Oracle Executor Decoupling

**Input**: Design documents from `/specs/097-oracle-executor-decoupling/`
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`

## Phase 1: Setup & Infrastructure (Shared)

**Purpose**: Shared infrastructure and event definitions.

- [x] T001 Define `OracleCommandExecutor` interface in `packages/oracle-engine/src/types.ts`
- [ ] T002 Register new `ORACLE:*` events in `packages/oracle-engine/src/events.ts`
- [ ] T003 Create `BaseExecutor` class in `packages/oracle-engine/src/executors/base-executor.ts`
- [ ] T004 [P] Initialize `executors/` directory and basic test scaffold

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

**Checkpoint**: MVP Ready - Basic commands are decoupled and tested.

---

## Phase 3: User Story 2 - Mutation Command Decoupling (P2)

**Goal**: Extract stateful mutation commands and inject dependencies.

### Tests for User Story 2

- [ ] T010 [P] [US2] Unit test for entity creation logic in `packages/oracle-engine/src/executors/create-executor.test.ts`
- [ ] T011 [P] [US2] Unit test for connection/merge logic in `packages/oracle-engine/src/executors/connect-executor.test.ts`

### Implementation for User Story 2

- [ ] T012 [P] [US2] Implement `CreateExecutor` in `packages/oracle-engine/src/executors/create-executor.ts`
- [ ] T013 [P] [US2] Implement `ConnectExecutor` in `packages/oracle-engine/src/executors/connect-executor.ts`
- [ ] T014 [P] [US2] Implement `MergeExecutor` in `packages/oracle-engine/src/executors/merge-executor.ts`
- [ ] T015 [P] [US2] Implement `PlotExecutor` in `packages/oracle-engine/src/executors/plot-executor.ts`

---

## Phase 4: User Story 3 - AI Orchestration Extraction (P3)

**Goal**: Extract complex AI multi-step logic.

### Tests for User Story 3

- [ ] T016 [P] [US3] Unit test for chat orchestration in `packages/oracle-engine/src/executors/chat-executor.test.ts`
- [ ] T017 [P] [US3] Unit test for regeneration logic in `packages/oracle-engine/src/executors/regenerate-executor.test.ts`

### Implementation for User Story 3

- [ ] T018 [P] [US3] Implement `RegenerateExecutor` in `packages/oracle-engine/src/executors/regenerate-executor.ts`
- [ ] T019 [P] [US3] Implement `ChatExecutor` in `packages/oracle-engine/src/executors/chat-executor.ts`
- [ ] T020 [US3] Sub-extract Discovery reactor from Chat logic

---

## Phase 5: User Story 4 - Event-Driven Side Effects (P4)

**Goal**: Decouple logic from UI and logging via events.

### Tests for User Story 4

- [ ] T021 [P] [US4] Integration test for event-driven notifications in `tests/oracle-events.test.ts`

### Implementation for User Story 4

- [ ] T022 [P] [US4] Update all executors to emit typed events (`ORACLE:COMMAND_COMPLETED`, etc.)
- [ ] T023 [US4] Implement global event listeners in the Web layer to replace direct callbacks

---

## Phase 6: Polish & Cleanup

- [ ] T024 [P] Finalize `OracleActionExecutor.ts` dispatcher reduction (Target: < 300 LOC)
- [ ] T025 Run full integration suite and verify zero regressions in guest mode/privacy
