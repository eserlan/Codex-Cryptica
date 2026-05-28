# Tasks: Data Integrity At Trust Boundaries

**Input**: Design documents from `/specs/122-data-integrity-boundaries/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included per the TDD requirement in the Constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create `packages/schema/src/entity.ts` and define core Zod schemas
- [x] T002 [P] Create `packages/vault-engine/tests/validation.test.ts` skeleton
- [x] T003 [P] Create `packages/vault-engine/tests/migrations.test.ts` skeleton

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement `idb` store setup for `migration_log` in `packages/vault-engine/src/migrations/store.ts`
- [x] T005 Update `packages/schema` exports to expose all validation logic in index files

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Graceful degradation on corrupted local data (Priority: P1) 🎯 MVP

**Goal**: Quarantine corrupted records during IndexedDB load to prevent graph injection of `undefined` or bad data.

**Independent Test**: Can be tested by manually injecting invalid records into IndexedDB and verifying the app loads successfully while logging the quarantined entities.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Integration test for quarantine logic in `packages/vault-engine/tests/validation.test.ts`

### Implementation for User Story 1

- [x] T007 [US1] Implement read-back schema validation in `packages/vault-engine/src/repository.svelte.ts`
- [x] T008 [US1] Implement quarantine logging in `packages/vault-engine/src/repository.svelte.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Safe file import with strict validation (Priority: P2)

**Goal**: Reject files with malformed or unsupported YAML frontmatter, skipping bad files in bulk imports.

**Independent Test**: Attempt to import a `.md` file with invalid YAML frontmatter types.

### Tests for User Story 2

- [x] T009 [P] [US2] Unit test for file extension validation in `packages/importer/tests/validation.test.ts`
- [x] T010 [P] [US2] Integration test for YAML frontmatter rejection in `packages/vault-engine/tests/validation.test.ts`

### Implementation for User Story 2

- [x] T011 [P] [US2] Implement file extension checks in `packages/importer/src/utils/validation.ts`
- [x] T012 [P] [US2] Implement markdown YAML validation in `packages/vault-engine/src/parser.ts`
- [x] T013 [US2] Update bulk import loop to silently skip and summarize invalid files in `apps/web/src/lib/components/settings/ImportSettings.svelte`
- [x] T014 [US2] Update UI to show rejected files in `apps/web/src/lib/components/ImportSettings.svelte`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Safe schema migrations with rollback path (Priority: P2)

**Goal**: System should log migrations and ensure there is a rollback path via pre-migration snapshots.

**Independent Test**: Simulate a version bump, run the migration, and verify `migration_log` store captures the event and a snapshot.

### Tests for User Story 3

- [x] T015 [P] [US3] Unit test for migration snapshot failure (storage limit) in `packages/vault-engine/tests/migrations.test.ts`
- [x] T016 [P] [US3] Unit test for log pruning in `packages/vault-engine/tests/migrations.test.ts`
- [x] T017 [P] [US3] Integration test for successful migration reversibility in `packages/vault-engine/tests/migrations.test.ts`

### Implementation for User Story 3

- [x] T018 [US3] Implement pre-migration OPFS snapshot logic in `packages/vault-engine/src/migrations/runner.ts`
- [x] T019 [US3] Implement snapshot storage failure abort logic in `packages/vault-engine/src/migrations/runner.ts`
- [x] T020 [US3] Implement `migration_log` retention policy (prune to last 5) in `packages/vault-engine/src/migrations/store.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T021 Code cleanup and refactoring in `packages/vault-engine`
- [ ] T022 Validate end-to-end user workflows manually
- [x] T023 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test for file extension validation in packages/importer/tests/validation.test.ts"
Task: "Integration test for YAML frontmatter rejection in packages/vault-engine/tests/validation.test.ts"

# Launch implementation for User Story 2 in parallel:
Task: "Implement file extension checks in packages/importer/src/utils/validation.ts"
Task: "Implement markdown YAML validation in packages/vault-engine/src/parser.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently
