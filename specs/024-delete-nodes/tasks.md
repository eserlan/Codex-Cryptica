# Tasks: Delete Nodes and Entities

**Input**: Design documents from `/specs/024-delete-nodes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/vault-store.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup

**Purpose**: Verify environment and prepare for implementation

- [x] T001 Verify 024-delete-nodes branch status and file availability in specs/024-delete-nodes/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core store updates that affect all deletion scenarios

- [x] T002 Update `deleteEntity` in `apps/web/src/lib/stores/vault.svelte.ts` to clear `selectedEntityId` if it matches the deleted ID
- [x] T003 Ensure `deleteEntity` in `apps/web/src/lib/stores/vault.svelte.ts` resets UI state (tabs, loading indicators) appropriately

---

## Phase 3: User Story 1 - Basic Node Deletion (Priority: P1) 🎯 MVP

**Goal**: Enable users to delete an entity and its file from the vault

**Independent Test**: Create a node, delete it via store call, verify file is gone and node disappears from UI.

### Tests for User Story 1

- [x] T004 [P] [US1] Implement unit test for file deletion in `apps/web/src/lib/stores/vault.test.ts`
- [x] T005 [P] [US1] Add basic Playwright E2E test for node deletion in `apps/web/tests/vault-delete.spec.ts`

### Implementation for User Story 1

- [x] T006 [US1] Add "Delete" button with basic styling to `apps/web/src/lib/components/EntityDetailPanel.svelte`
- [x] T007 [US1] Implement `handleDelete` logic in `apps/web/src/lib/components/EntityDetailPanel.svelte` to call `vault.deleteEntity`
- [x] T008 [US1] Implement deletion of associated image and thumbnail files in `deleteEntity` in `apps/web/src/lib/stores/vault.svelte.ts`

**Checkpoint**: Basic deletion including media is functional from the UI.

---

## Phase 4: User Story 2 - Safe Deletion with Confirmation (Priority: P2)

**Goal**: Prevent accidental deletion via confirmation prompt

**Independent Test**: Click Delete, click Cancel, verify node remains. Click Delete, click OK, verify node is gone.

### Tests for User Story 2

- [x] T009 [P] [US2] Update E2E test in `apps/web/tests/vault-delete.spec.ts` to handle and verify confirmation dialog

### Implementation for User Story 2

- [x] T010 [US2] Add browser `confirm()` prompt to `handleDelete` in `apps/web/src/lib/components/EntityDetailPanel.svelte`

---

## Phase 5: User Story 3 - Cleanup of Orphaned Edges (Priority: P3)

**Goal**: Ensure data integrity by removing stale connections in other entities

**Independent Test**: Connect A to B. Delete B. Verify A's file and state no longer contain the connection to B.

### Tests for User Story 3

- [x] T011 [P] [US3] Add integration test for cross-entity connection cleanup in `apps/web/src/lib/stores/vault.test.ts`

### Implementation for User Story 3

- [x] T012 [US3] Implement global reference scan and connection removal in `deleteEntity` in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T013 [US3] Ensure modified entities are scheduled for save (`scheduleSave`) in `apps/web/src/lib/stores/vault.svelte.ts` after connection removal

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance, UX, and consistency improvements

- [x] T014 [P] Refactor `saveImageToVault` in `apps/web/src/lib/stores/vault.svelte.ts` to delete old image/thumbnail files when replaced
- [x] T015 [P] Ensure graph refit is requested after node deletion in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T016 Add error notification using `uiStore.setGlobalError` in `apps/web/src/lib/stores/vault.svelte.ts` if file system deletion fails
- [x] T017 Run `npm test` and `npm run lint` to verify project stability
- [x] T018 **Offline Functionality Verification** (Verify deletion works with OPFS/Local handles without network)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup & Foundational**: Must complete before User Story 1.
- **User Story 1**: Provides the core button and store hook.
- **User Story 2 & 3**: Can be implemented in parallel after US1 is functional.
- **Polish**: Final verification.

### Parallel Opportunities

- T004, T005 (US1 Tests)
- T009 (US2 Tests)
- T011 (US3 Tests)
- T014, T015 (Polish)

---

## Implementation Strategy

### MVP First (User Story 1)

1. Implement basic `deleteEntity` improvements.
2. Add the UI button and verify the file is actually deleted.

### Incremental Delivery

1. Add safety prompt (US2).
2. Add deep relational cleanup (US3) to ensure long-term vault health.
