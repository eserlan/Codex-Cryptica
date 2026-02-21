---
description: "Task list template for feature implementation"
---

# Tasks: GDrive Multi-Vault Support

**Input**: Design documents from `/specs/053-gdrive-multi-vault/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD is required per the Constitution. Unit tests and E2E tests are included and must be written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure verification

- [x] T001 Verify monorepo structure and Svelte 5 / Vitest / Playwright configuration in `apps/web/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Update `VaultMetadata` schema to include `gdriveSyncEnabled`, `gdriveFolderId`, and `syncState` in `packages/schema/src/vault.ts`
- [x] T003 Update IndexedDB registry store schema/types to support new fields in `packages/editor-core/src/storage/registry.ts`
- [x] T004 Define `SyncEngineContext` and update `SyncEngine` interface in `packages/editor-core/src/sync/engine.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Linking Multiple Vaults to Google Drive (Priority: P1) 🎯 MVP

**Goal**: Allow users to link each of their campaigns to distinct Google Drive folders.

**Independent Test**: Can be tested by creating two local vaults and successfully enabling Google Drive sync for both, verifying that each maps to a distinct folder/ID on GDrive.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Create unit tests for `linkVaultToDrive` and `unlinkVaultFromDrive` in `packages/editor-core/tests/sync/engine.test.ts`
- [x] T006 [P] [US1] Create E2E test for linking a vault to GDrive in `apps/web/tests/gdrive-multi-vault.spec.ts`

### Implementation for User Story 1

- [x] T007 [US1] Implement `linkVaultToDrive` and `unlinkVaultFromDrive` methods in `packages/editor-core/src/sync/engine.ts`
- [x] T008 [US1] Update Settings Panel UI for per-vault GDrive authentication and folder selection in `apps/web/src/lib/components/settings/GDriveSettings.svelte`
- [x] T009 [US1] Add GDrive sync status indicator to Vault Manager UI in `apps/web/src/lib/components/vault/VaultList.svelte`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Automated Sync Switching (Priority: P2)

**Goal**: Automatically target the correct remote folder whenever a user switches their active vault.

**Independent Test**: Can be tested by switching from Vault A to Vault B and performing a sync operation, verifying that it uses Vault B's specific GDrive metadata.

### Tests for User Story 2 ⚠️

- [x] T010 [P] [US2] Create unit tests for `synchronize` using `SyncEngineContext` in `packages/editor-core/tests/sync/engine.test.ts`
- [x] T011 [P] [US2] Create E2E test for automated sync folder switching (including <2s performance assertion for switching) in `apps/web/tests/gdrive-multi-vault.spec.ts`

### Implementation for User Story 2

- [x] T012 [US2] Implement `synchronize` operation isolated to the active `gdriveFolderId` in `packages/editor-core/src/sync/engine.ts`
- [x] T013 [US2] Update app sync orchestration to pass the active vault's context to the sync engine in `apps/web/src/lib/stores/sync.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Conflict Detection Across Vaults (Priority: P3)

**Goal**: Warn users and block linking if a local vault tries to connect to a GDrive folder already used by another local vault.

**Independent Test**: Can be tested by attempting to point a new local vault to an existing GDrive "Codex" folder that is already bound to another local vault ID.

### Tests for User Story 3 ⚠️

- [x] T014 [P] [US3] Create unit test for duplicate `gdriveFolderId` conflict detection in `packages/editor-core/tests/sync/engine.test.ts`

### Implementation for User Story 3

- [x] T015 [US3] Update `linkVaultToDrive` to query local registry and throw `ConflictError` in `packages/editor-core/src/sync/engine.ts`
- [x] T016 [US3] Implement conflict warning UI in the GDrive settings panel in `apps/web/src/lib/components/settings/GDriveSettings.svelte`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Edge Cases & Polish

**Purpose**: Improvements that affect multiple user stories and edge case coverage

- [x] T017 [P] Add user-facing help description for multi-vault sync in `apps/web/src/lib/config/help-content.ts`
- [x] T018 Handle GDrive 401/403 errors across all active vault contexts and trigger re-authorization UI flow in `apps/web/src/lib/stores/sync.ts` and `apps/web/src/lib/components/settings/GDriveSettings.svelte`
- [x] T019 Implement GDrive metadata cleanup upon local vault deletion in `packages/editor-core/src/storage/registry.ts`
- [x] T020 Run all Vitest and Playwright test suites (e.g., `npm run test` in repository root) to ensure full coverage and no regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Should be tested with US1 UI flow.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Should be tested with US1 UI flow.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD).
- Core engine implementation before UI integration.
- Story complete before moving to next priority.

### Parallel Opportunities

- All tasks marked [P] can run in parallel
- Once Foundational phase completes, unit/E2E test creation across user stories can start in parallel.
- Different user stories can be worked on in parallel by different team members.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "T005 Create unit tests for linkVaultToDrive and unlinkVaultFromDrive"
Task: "T006 Create E2E test for linking a vault to GDrive"
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
