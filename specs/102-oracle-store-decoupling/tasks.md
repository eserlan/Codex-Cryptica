# Tasks: Oracle Store Decomposition

**Input**: Design documents from `/specs/102-oracle-store-decoupling/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD approach is mandated by SC-002 and SC-004. Tests MUST be written for each manager.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create directory `apps/web/src/lib/stores/oracle/`
- [x] T002 [P] Create manager test directory `apps/web/src/lib/stores/oracle/tests/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Define `IOracleStore` interface and shared types in `apps/web/src/lib/stores/oracle/types.ts` to prevent circular dependencies
- [x] T004 Prepare `OracleStore` facade constructor for dependency injection in `apps/web/src/lib/stores/oracle.svelte.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 2 - Consistent Settings Management (Priority: P2)

**Goal**: Isolate API keys, models, and tier settings into a dedicated manager while preserving persistence.

**Independent Test**: Update API key in `OracleSettingsManager` and verify it persists to IndexedDB and reactive getters.

### Tests for User Story 2

- [x] T005 [P] [US2] Create unit test `apps/web/src/lib/stores/oracle/tests/settings-manager.test.ts`

### Implementation for User Story 2

- [x] T006 [P] [US2] Implement `OracleSettingsManager` in `apps/web/src/lib/stores/oracle/settings-manager.svelte.ts`
- [x] T007 [US2] Integrate `SettingsManager` into `OracleStore` facade and delegate `apiKey`, `modelName`, `tier` properties

**Checkpoint**: Settings management is fully decomposed and testable.

---

## Phase 4: User Story 1 - Seamless AI Interaction (Priority: P1) 🎯 MVP

**Goal**: Migrate UI state, context assembly, chat history, and core actions to specialized managers.

**Independent Test**: Perform chat command and visualization "Draw" action; verify identical behavior to monolith.

### Tests for User Story 1

- [x] T008 [P] [US1] Create unit test `apps/web/src/lib/stores/oracle/tests/ui-manager.test.ts`
- [x] T009 [P] [US1] Create unit test `apps/web/src/lib/stores/oracle/tests/context-manager.test.ts`
- [x] T010 [P] [US1] Create unit test `apps/web/src/lib/stores/oracle/tests/chat-manager.test.ts`
- [x] T011 [P] [US1] Create unit test `apps/web/src/lib/stores/oracle/tests/action-manager.test.ts`

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement `OracleUiManager` in `apps/web/src/lib/stores/oracle/ui-manager.svelte.ts`
- [x] T013 [P] [US1] Implement `OracleContextManager` in `apps/web/src/lib/stores/oracle/context-manager.ts`
- [x] T014 [P] [US1] Implement `OracleChatManager` in `apps/web/src/lib/stores/oracle/chat-manager.svelte.ts`
- [x] T015 [P] [US1] Implement `OracleActionManager` in `apps/web/src/lib/stores/oracle/action-manager.svelte.ts`
- [x] T016 [US1] Integrate UI, Context, Chat, and Action managers into `OracleStore` facade and delegate core properties/methods
- [x] T017 [US1] Move `BroadcastChannel` event routing logic to `OracleStore` facade

**Checkpoint**: Core AI interaction is decomposed. MVP functionality is verified.

---

## Phase 5: User Story 3 - Transparent Draft Reconciliation (Priority: P2)

**Goal**: Isolate complex "Smart Apply" and discovery logic into a dedicated manager.

**Independent Test**: Apply an AI-generated discovery proposal and verify correct entity merging.

### Tests for User Story 3

- [x] T018 [P] [US3] Create unit test `apps/web/src/lib/stores/oracle/tests/reconciliation-manager.test.ts`

### Implementation for User Story 3

- [x] T019 [P] [US3] Implement `OracleReconciliationManager` in `apps/web/src/lib/stores/oracle/reconciliation-manager.svelte.ts`
- [x] T020 [US3] Integrate `ReconciliationManager` into `OracleStore` facade and delegate reconciliation methods

**Checkpoint**: All 6 managers are implemented and integrated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and comprehensive verification.

- [x] T021 Final cleanup of `apps/web/src/lib/stores/oracle.svelte.ts` facade (remove all legacy implementation logic)
- [x] T022 Verify SC-002: Run 40+ existing regression tests in `apps/web/src/lib/stores/oracle.svelte.test.ts`
- [x] T023 Verify SC-004: Ensure 80% coverage for all new managers using `pnpm test:coverage`
- [x] T024 [P] Update internal documentation in `AGENTS.md` and `docs/ARCH_ORACLE.md`
- [x] T025 Run full project lint and type check: `pnpm run lint && pnpm run lint:types`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all user stories.
- **User Stories (Phase 3-5)**: Depend on Phase 2 completion.
  - US1 (Phase 4) is P1 (MVP) and should be prioritized.
  - US2 (Phase 3) and US3 (Phase 5) are P2 and can run in parallel with or after US1.
- **Polish (Phase 6)**: Depends on all stories (3, 4, 5) completion.

### Parallel Opportunities

- T001 and T002 in Setup.
- All Manager creation ([P] tasks) once Phase 2 is complete.
- All Unit tests ([P] tasks) within their respective phases.
- User Story 2 and User Story 3 can proceed in parallel once Foundation is ready.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Setup and Foundational.
2. Complete User Story 1 (Core AI Interaction).
3. **STOP and VALIDATE**: Ensure chat, visualization, and thinking state work as before.

### Incremental Delivery

1. Foundation ready (Phase 2).
2. Settings Manager (US2) -> Test & Integrate.
3. Core managers (US1) -> Test & Integrate -> **MVP Delivery**.
4. Reconciliation Manager (US3) -> Test & Integrate.
5. Final Polish & Regression Testing.
