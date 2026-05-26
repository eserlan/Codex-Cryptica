# Tasks: Vault Load/Save Confidence

**Input**: Design documents from `/specs/121-vault-load-save-confidence/`
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Includes exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and validation

- [ ] T001 Verify branch naming conventions and initialize git tracking for specs/121-vault-load-save-confidence/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Baseline verification

- [ ] T002 Verify project test baseline by running tests in packages/vault-engine and apps/web

---

## Phase 3: User Story 1 - Silent Vault Load on Missing Permission (Priority: P1)

**Goal**: Load OPFS cache silently without prompting or errors if linked folder permission is not yet granted.

**Independent Test**: Clear folder permission, load vault, verify no SecurityError or prompt appears and status is set to "needs-permission".

### Tests for User Story 1

- [ ] T003 [P] [US1] Add test cases for missing permission silent load in apps/web/src/lib/stores/vault/sync-store.test.ts

### Implementation for User Story 1

- [ ] T004 [US1] Implement silent permission checking in loadFiles in apps/web/src/lib/stores/vault/sync-store.svelte.ts (if localHandle exists but queryPermission is not granted, set status to needs-permission and skip directory pull, loading OPFS cache only)

---

## Phase 4: User Story 2 - User-Triggered Permission Grant and Save (Priority: P1)

**Goal**: Request read-write permission on manual load/save or grant clicks, then load/save and transition status.

**Independent Test**: Click "GRANT ACCESS", accept browser prompt, and verify folder load/save completes successfully.

### Tests for User Story 2

- [ ] T005 [P] [US2] Add test cases for user-triggered permission prompt on save in apps/web/src/lib/stores/vault/sync-store.test.ts

### Implementation for User Story 2

- [ ] T006 [US2] Implement user gesture permission check inside saveToFolder and loadFromFolder in apps/web/src/lib/stores/vault/sync-store.svelte.ts (calls requestPermission if queryPermission is not granted)
- [ ] T007 [US2] Modify syncWithLocalFolder in packages/vault-engine/src/sync-coordinator.ts to only query permission and not request it automatically, allowing the caller (SyncStore) to manage interactive prompts.

---

## Phase 5: User Story 3 - Transient "Saved" Success Feedback (Priority: P2)

**Goal**: Show "saved" status for 3 seconds after successful folder save.

**Independent Test**: Trigger save to folder, verify status is "saved", and after 3 seconds returns to "idle".

### Tests for User Story 3

- [ ] T008 [P] [US3] Add tests for saved status transitions in apps/web/src/lib/stores/vault/sync-store.test.ts

### Implementation for User Story 3

- [ ] T009 [US3] Update saveToFolder in apps/web/src/lib/stores/vault/sync-store.svelte.ts to set status to "saved" on success, reverting to "idle" via setTimeout

---

## Phase 6: User Story 4 - Non-blocking Vault Switch Timeout (Priority: P1)

**Goal**: Add a 5-second timeout when flushing pending saves during a vault switch.

**Independent Test**: Simulate stuck save queue, switch vault, check that switch completes after 5 seconds with a console warning.

### Tests for User Story 4

- [ ] T010 [P] [US4] Add tests for save-drain timeout in apps/web/src/lib/stores/vault/lifecycle.test.ts

### Implementation for User Story 4

- [ ] T011 [US4] Update switchVault in apps/web/src/lib/stores/vault/lifecycle.ts to wrap flushPendingSaves in a Promise.race with a 5000ms timeout

---

## Phase 7: Polish & UI Layout

**Purpose**: UI polishing, terminology alignment, and final validation

- [ ] T012 [P] Update user-facing text in packages/vault-engine/src/sync-coordinator.ts (e.g. notifier messages using save/load/link rather than sync)
- [ ] T013 Update VaultControls.svelte to handle "needs-permission" status with a "GRANT ACCESS" button and "saved" status with a success checkmark, replacing remaining "sync" references
- [ ] T014 Update VaultSwitcherModal.svelte to show needs-permission indicator next to active vault
- [ ] T015 Run quickstart.md validation checklist and all tests using bun run test

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) runs first.
- Foundational (Phase 2) runs next, verifying test baseline.
- User Stories (Phase 3+) all depend on Phase 2 completion, but can be developed in parallel or in sequential priority order.
- Polish (Phase 7) runs last, integrating all UI changes and running final test verification.

### Parallel Opportunities

- Setup (T001) and Foundational (T002) run sequentially.
- Test tasks (T003, T005, T008, T010) are parallelizable.
- UI elements (T013, T014) can be polished in parallel.
