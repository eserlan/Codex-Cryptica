# Tasks: Oracle Executor Decoupling

**Input**: Design documents from `/specs/097-oracle-executor-decoupling/`
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`

## Phase 1: Setup & Infrastructure (Shared)

- [x] T001 Define `OracleCommandExecutor` interface in `packages/oracle-engine/src/types.ts`
- [ ] T002 Register new `ORACLE:*` events in `packages/oracle-engine/src/events.ts`
- [ ] T003 Create `BaseExecutor` class in `packages/oracle-engine/src/executors/base-executor.ts`
- [ ] T004 [P] Initialize `executors/` directory and basic test scaffold

---

## Phase 2: User Story 1 - Command Modularization (P1) 🎯 MVP

**Goal**: Extract core commands into specialized handlers.

### Tests for User Story 1

- [ ] T005 [P] [US1] Unit test for `/roll` in `packages/oracle-engine/src/executors/dice-executor.test.ts`
- [ ] T006 [P] [US1] Unit test for `/help` and `/clear` in `packages/oracle-engine/src/executors/meta-executor.test.ts`

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement `DiceExecutor` in `packages/oracle-engine/src/executors/dice-executor.ts`
- [ ] T008 [P] [US1] Implement `MetaExecutor` (/help, /clear) in `packages/oracle-engine/src/executors/meta-executor.ts`
- [ ] T009 [US1] Update `OracleActionExecutor` dispatcher to delegate US1 commands

**Checkpoint**: MVP Ready - Basic commands are decoupled and tested.

---

## Phase 3: User Story 2 - Event-Driven Side Effects (P2)

**Goal**: Decouple business logic from side effects using AppEventBus.

### Tests for User Story 2

- [ ] T010 [P] [US2] Integration test for event emission in `tests/oracle-events.test.ts`

### Implementation for User Story 2

- [ ] T011 [P] [US2] Implement `CreateExecutor` with event emission in `packages/oracle-engine/src/executors/create-executor.ts`
- [ ] T012 [P] [US2] Implement `ConnectExecutor` with event emission in `packages/oracle-engine/src/executors/connect-executor.ts`
- [ ] T013 [P] [US2] Implement `MergeExecutor` with event emission in `packages/oracle-engine/src/executors/merge-executor.ts`
- [ ] T014 [US2] Refactor `OracleActionExecutor` dispatcher to use event bus for UI notifications

**Checkpoint**: Foundation ready - Side effects are decoupled from execution.

---

## Phase 4: User Story 3 - Comprehensive AI Orchestration (P3)

**Goal**: Extract complex AI logic while maintaining security and performance.

### Tests for User Story 3

- [ ] T015 [P] [US3] Unit test for AI orchestration in `packages/oracle-engine/src/executors/chat-executor.test.ts`

### Implementation for User Story 3

- [ ] T016 [P] [US3] Implement `RegenerateExecutor` in `packages/oracle-engine/src/executors/regenerate-executor.ts`
- [ ] T017 [P] [US3] Implement `ChatExecutor` (The core AI orchestrator) in `packages/oracle-engine/src/executors/chat-executor.ts`
- [ ] T018 [US3] Sub-extract Discovery reactor from Chat logic

---

## Phase 5: Polish & Cleanup

- [ ] T019 [P] Finalize `OracleActionExecutor.ts` dispatcher reduction (Target: < 300 LOC)
- [ ] T020 Code cleanup and documentation updates in `docs/refactoring/`
- [ ] T021 Run all engine tests and verify zero regressions in guest mode/privacy
