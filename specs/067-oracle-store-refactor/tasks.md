---
description: "Task list for Oracle Store Refactor implementation"
---

# Tasks: Oracle Store Refactor

**Input**: Design documents from `/specs/067-oracle-store-refactor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included per SC-002, SC-003 and Constitution Principle II (TDD).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Library**: `packages/oracle-engine/src/`
- **Web app**: `apps/web/src/lib/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize `packages/oracle-engine` package with `package.json` and `tsconfig.json`
- [x] T002 [P] Verify baseline tests pass in `apps/web/src/lib/stores/oracle.test.ts`
- [x] T003 Configure workspace dependencies so `apps/web` can import `@codex/oracle-engine`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Implement `OracleCommandParser` utility in `packages/oracle-engine/src/oracle-parser.ts`
- [x] T005 [P] Create unit tests for `OracleCommandParser` in `packages/oracle-engine/src/oracle-parser.test.ts`
- [x] T006 [P] Implement `ChatHistoryService` in `packages/oracle-engine/src/chat-history.svelte.ts`
- [x] T007 [P] Create unit tests for `ChatHistoryService` in `packages/oracle-engine/src/chat-history.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Uninterrupted Chat Experience (Priority: P1) 🎯 MVP

**Goal**: Core Oracle chat functionality continues to work using the new `oracle-engine` package.

**Independent Test**: Run Vitest on `apps/web/src/lib/stores/oracle.test.ts` and verify all chat-related tests pass.

### Implementation for User Story 1

- [x] T008 [P] [US1] Implement `OracleActionExecutor` in `packages/oracle-engine/src/oracle-executor.ts`
- [x] T009 [P] [US1] Create unit tests for `OracleActionExecutor` in `packages/oracle-engine/src/oracle-executor.test.ts`
- [x] T010 [P] [US1] Extract AI generation logic into `OracleGenerator` in `packages/oracle-engine/src/oracle-generator.ts`
- [x] T011 [US1] Integrate `ChatHistoryService` from `@codex/oracle-engine` into `OracleStore` in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T012 [US1] Refactor `OracleStore.ask()` to use `OracleCommandParser`, `OracleActionExecutor`, and `OracleGenerator`
- [x] T013 [US1] Refactor `OracleStore.drawEntity()` and `drawMessage()` to use `OracleGenerator` via Executor
- [x] T014 [US1] Remove redundant chat persistence logic from `OracleStore`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Reliable Undo/Redo System (Priority: P2)

**Goal**: Undo/Redo functionality reverses and re-applies vault actions reliably using the extracted `UndoRedoService` in the library.

**Independent Test**: Execute a `/create` command in the Oracle chat, click "Undo", verify the entity is removed, then click "Redo" and verify it is restored.

### Implementation for User Story 2

- [x] T015 [P] [US2] Implement `UndoRedoService` in `packages/oracle-engine/src/undo-redo.svelte.ts`
- [x] T016 [P] [US2] Create unit tests for `UndoRedoService` in `packages/oracle-engine/src/undo-redo.test.ts`
- [x] T017 [US2] Refactor `OracleStore.undo()`, `OracleStore.redo()`, and `pushUndoAction()` to use `UndoRedoService` from `@codex/oracle-engine`
- [x] T018 [US2] Remove redundant undo/redo stack state from `OracleStore`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Finalizing the refactor and ensuring quality standards.

- [x] T019 [P] Verify `apps/web/src/lib/stores/oracle.svelte.ts` is under 400 lines (SC-001)
- [x] T020 [P] Update user documentation in `apps/web/src/lib/config/help-content.ts` (Constitution Principle VII)
- [x] T021 [P] Documentation updates in `quickstart.md`
- [x] T022 Final code cleanup and removal of unused imports in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T023 Run full Playwright E2E test suite with `--reporter=list` to ensure no regressions

---

## Phase 6: Ultra-Thin Controller Refinement (Final Pass)

**Goal**: Bring `OracleStore` under 150 LOC by moving all domain mutations and environment logic to services.

- [x] T024 [P] Implement `OracleSettingsService` in `packages/oracle-engine/src/oracle-settings.svelte.ts`
- [x] T025 [P] Move domain mutations (`startWizard`, `updateMessageEntity`) to `ChatHistoryService`
- [x] T026 [P] Implement `OracleSyncService` or unify `BroadcastChannel` logic in `oracle-settings`
- [x] T027 Refactor `OracleStore` to use new services and remove boilerplate
- [x] T028 Verify `apps/web/src/lib/stores/oracle.svelte.ts` is under 150 lines (FR-009)
- [x] T029 Final regression test run

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all user stories being complete.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3 (User Story 1).
3. **STOP and VALIDATE**: Verify core chat works and tests pass.
