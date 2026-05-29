# Tasks: Map Session Store Decomposition

**Input**: Design documents from `/specs/099-map-session-decomposition/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/map-session-boundaries.md`, `quickstart.md`

**Tests**: Required by the feature spec and constitution. Test tasks must be completed before their matching implementation tasks.

**Organization**: Tasks are grouped by user story so each increment can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[Story]**: User story label for traceability
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the branch artifacts and baseline measurements before code movement.

- [x] T001 Record the current `apps/web/src/lib/stores/map-session.svelte.ts` line count and public method inventory in `specs/099-map-session-decomposition/quickstart.md`
- [x] T002 Review current map-session consumers and document candidate low-risk migrations in `specs/099-map-session-decomposition/contracts/map-session-boundaries.md`
- [x] T003 [P] Verify current map-session tests are runnable before refactor in `apps/web/src/lib/stores/map-session.test.ts`
- [x] T004 [P] Verify current P2P-dependent tests are runnable before refactor in `apps/web/src/lib/cloud-bridge/p2p/p2p.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared test fixtures and interfaces required before moving behavior.

**Critical**: No user story implementation should begin until this phase is complete.

- [x] T005 Create reusable map-session test factory helpers in `apps/web/src/lib/stores/vtt/map-session-test-helpers.ts`
- [x] T006 [P] Add baseline snapshot fixture data for full, legacy, and partial `EncounterSession` payloads in `apps/web/src/lib/stores/vtt/map-session-test-fixtures.ts`
- [x] T007 Define `VTTSessionSnapshotManagerDependencies` and exported class skeleton in `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.ts`
- [x] T008 Define `VTTSessionLifecycleManagerDependencies` and exported class skeleton in `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.svelte.ts`
- [x] T009 Wire placeholder snapshot and lifecycle managers into `apps/web/src/lib/stores/map-session.svelte.ts` without moving behavior yet

**Checkpoint**: New files exist, compile with no behavior changes, and user-story tests can target stable collaborator names.

---

## Phase 3: User Story 1 - Preserve VTT Play Behavior (Priority: P1) MVP

**Goal**: Preserve token, initiative, chat, measurement, grid, snapshot, persistence, and P2P behavior while extraction begins.

**Independent Test**: Existing `MapSessionStore` tests and P2P-dependent map-session tests pass after moving snapshot behavior.

### Tests for User Story 1

- [x] T010 [P] [US1] Add snapshot creation tests for tokens, initiative, chat, measurement, grid, fog, and map metadata in `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts`
- [x] T011 [P] [US1] Add snapshot application tests for full `EncounterSession` payloads in `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts`
- [x] T012 [P] [US1] Add legacy and partial snapshot compatibility tests in `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts`
- [x] T013 [P] [US1] Add P2P snapshot contract assertions for map-session payload compatibility in `apps/web/src/lib/cloud-bridge/p2p/p2p.test.ts`

### Implementation for User Story 1

- [x] T014 [US1] Move `createSnapshot()` translation logic from `apps/web/src/lib/stores/map-session.svelte.ts` to `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.ts`
- [x] T015 [US1] Move `applySnapshot()` translation logic from `apps/web/src/lib/stores/map-session.svelte.ts` to `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.ts`
- [x] T016 [US1] Delegate `MapSessionStore.createSnapshot()` and `MapSessionStore.applySnapshot()` to `VTTSessionSnapshotManager` in `apps/web/src/lib/stores/map-session.svelte.ts`
- [x] T017 [US1] Update `VTTPersistenceManager` and `VTTEncounterManager` dependency wiring to call the delegated snapshot manager through `apps/web/src/lib/stores/map-session.svelte.ts`
- [x] T018 [US1] Run and fix failures for `apps/web/src/lib/stores/map-session.test.ts`
- [x] T019 [US1] Run and fix failures for `apps/web/src/lib/cloud-bridge/p2p/p2p.test.ts`

**Checkpoint**: Snapshot behavior is extracted and current VTT/P2P behavior remains compatible.

---

## Phase 4: User Story 2 - Reduce Map Session Facade Responsibility (Priority: P2)

**Goal**: Move active-map binding, hydration, draft restoration, reset, and clear-session orchestration out of `map-session.svelte.ts`.

**Independent Test**: Lifecycle manager tests pass and `map-session.svelte.ts` primarily wires dependencies plus compatibility methods.

### Tests for User Story 2

- [x] T020 [P] [US2] Add active-map bind and draft restore tests in `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.test.ts`
- [x] T021 [P] [US2] Add no-active-map-after-hydration and clear-session tests in `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.test.ts`
- [x] T022 [P] [US2] Add malformed and unrelated popout storage tests in `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.test.ts`
- [x] T023 [P] [US2] Add facade line-count and responsibility boundary checklist notes in `specs/099-map-session-decomposition/quickstart.md`

### Implementation for User Story 2

- [x] T024 [US2] Move `handleActiveMapChange()` behavior from `apps/web/src/lib/stores/map-session.svelte.ts` to `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.svelte.ts`
- [x] T025 [US2] Move `bindToMap()` behavior from `apps/web/src/lib/stores/map-session.svelte.ts` to `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.svelte.ts`
- [x] T026 [US2] Move `resetSessionState()` behavior from `apps/web/src/lib/stores/map-session.svelte.ts` to `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.svelte.ts`
- [x] T027 [US2] Move `clearSession()` orchestration from `apps/web/src/lib/stores/map-session.svelte.ts` to `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.svelte.ts`
- [x] T028 [US2] Delegate lifecycle compatibility methods through `VTTSessionLifecycleManager` in `apps/web/src/lib/stores/map-session.svelte.ts`
- [x] T029 [US2] Update storage event synchronization wiring to use lifecycle and network boundaries in `apps/web/src/lib/stores/map-session.svelte.ts`
- [x] T030 [US2] Verify `apps/web/src/lib/stores/map-session.svelte.ts` is below 500 lines and record the final count in `specs/099-map-session-decomposition/quickstart.md`

**Checkpoint**: Lifecycle behavior is extracted and the facade is materially smaller.

---

## Phase 5: User Story 3 - Improve Testability Through Dependency Injection (Priority: P3)

**Goal**: Ensure extracted collaborators are independently testable and migrate selected low-risk consumers only where the manager API is cleaner.

**Independent Test**: Manager tests construct collaborators with mocks, and any migrated consumer has behavior-equivalence coverage.

### Tests for User Story 3

- [x] T031 [P] [US3] Add constructor dependency tests for snapshot manager mocks in `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts`
- [x] T032 [P] [US3] Add constructor dependency tests for lifecycle manager mocks in `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.test.ts`
- [x] T033 [P] [US3] Add behavior-equivalence tests for candidate dice roll chat migration in `apps/web/src/lib/components/dice/DiceVault.test.ts` (not applicable: no consumer migration selected in `specs/099-map-session-decomposition/contracts/map-session-boundaries.md`)

### Implementation for User Story 3

- [x] T034 [US3] Replace broad dependency objects with narrow dependency interfaces in `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.ts`
- [x] T035 [US3] Replace broad dependency objects with narrow dependency interfaces in `apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.svelte.ts`
- [x] T036 [US3] Migrate dice roll chat emission in `apps/web/src/lib/components/dice/DiceVault.svelte` if approved by `specs/099-map-session-decomposition/contracts/map-session-boundaries.md`; otherwise record "no consumer migration selected" in `specs/099-map-session-decomposition/contracts/map-session-boundaries.md`
- [x] T037 [US3] Keep backward-compatible `MapSessionStore` methods for unmigrated consumers in `apps/web/src/lib/stores/map-session.svelte.ts`
- [x] T038 [US3] Update boundary documentation with final migrated consumer list in `specs/099-map-session-decomposition/contracts/map-session-boundaries.md`

**Checkpoint**: New collaborators are independently injectable and selected consumer migrations are covered.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full refactor and update documentation.

- [x] T039 [P] Run focused VTT store tests from quickstart and record results in `specs/099-map-session-decomposition/quickstart.md`
- [x] T040 [P] Run focused P2P-dependent tests from quickstart and record results in `specs/099-map-session-decomposition/quickstart.md`
- [x] T041 Run `pnpm --filter=web run lint:types` and record warnings/errors in `specs/099-map-session-decomposition/quickstart.md`
- [x] T042 Run `pnpm run lint` or record the environment/CI blocker and required CI validation in `specs/099-map-session-decomposition/quickstart.md`
- [x] T043 Run `pnpm test` or record the environment/CI blocker and required CI validation in `specs/099-map-session-decomposition/quickstart.md`
- [x] T044 Run relevant coverage for new manager files or inspect current coverage floor impact, then record results in `specs/099-map-session-decomposition/quickstart.md`
- [x] T045 Update `docs/GOD_FILES_ANALYSIS.md` with final `map-session.svelte.ts` line count after implementation
- [x] T046 Remove obsolete inline comments or duplicated delegation code from `apps/web/src/lib/stores/map-session.svelte.ts`
- [x] T047 Review all new files for constructor-based DI and no direct singleton imports in `apps/web/src/lib/stores/vtt/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1; blocks all story implementation.
- **Phase 3 US1**: Depends on Phase 2; MVP scope.
- **Phase 4 US2**: Depends on Phase 2 and should follow US1 if lifecycle code needs delegated snapshot behavior.
- **Phase 5 US3**: Depends on US1 and US2 because consumer migration should target stable extracted managers.
- **Phase 6 Polish**: Depends on selected user-story phases being complete.

### User Story Dependencies

- **US1 Preserve VTT Play Behavior**: MVP and first implementation target.
- **US2 Reduce Facade Responsibility**: Can start after foundational setup, but should integrate after snapshot extraction to avoid duplicated lifecycle/snapshot edits.
- **US3 Improve Testability Through DI**: Should follow US1 and US2 so the final manager APIs are known before consumer migration.

### Within Each User Story

- Write tests first and confirm they fail or characterize existing behavior.
- Implement the manager behavior.
- Delegate through `MapSessionStore`.
- Run focused tests before moving to the next story.

## Parallel Opportunities

- T003 and T004 can run in parallel.
- T005 and T006 can run in parallel after setup.
- T010, T011, T012, and T013 can run in parallel because they touch distinct test concerns.
- T020, T021, and T022 can run in parallel within lifecycle tests.
- T031, T032, and T033 can run in parallel after extracted managers exist.
- T039 and T040 can run in parallel during polish.

## Parallel Example: User Story 1

```text
Task: "T010 Add snapshot creation tests in apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts"
Task: "T011 Add snapshot application tests in apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts"
Task: "T012 Add legacy and partial snapshot compatibility tests in apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts"
Task: "T013 Add P2P snapshot contract assertions in apps/web/src/lib/cloud-bridge/p2p/p2p.test.ts"
```

## Parallel Example: User Story 2

```text
Task: "T020 Add active-map bind and draft restore tests in apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.test.ts"
Task: "T021 Add no-active-map-after-hydration and clear-session tests in apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.test.ts"
Task: "T022 Add malformed and unrelated popout storage tests in apps/web/src/lib/stores/vtt/vtt-session-lifecycle-manager.test.ts"
```

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 by extracting snapshot creation/application.
3. Validate `map-session.test.ts`, P2P-dependent tests, and snapshot manager tests.
4. Stop if behavior compatibility is not proven.

### Incremental Delivery

1. Extract snapshot manager and preserve behavior.
2. Extract lifecycle manager and slim the facade.
3. Apply selected consumer migrations only after manager APIs are stable.
4. Run type checks and focused tests after each phase.

### Scope Control

- Do not add gameplay behavior.
- Do not change `EncounterSession` schema unless a compatibility bug is found and explicitly handled.
- Do not migrate consumers merely for style; migrate only when coupling is reduced and tests cover equivalence.
