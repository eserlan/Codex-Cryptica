# Tasks: Vault Detachment and Switching

**Feature**: Vault Detachment and Switching
**Branch**: `023-switch-vaults`
**Status**: Ready

## Implementation Strategy

We will follow an incremental delivery strategy, starting with the core `close()` method in the `VaultStore` to ensure all campaign data can be reliably cleared. Once the foundation is in place, we will integrate the UI controls and verify the full workflow with E2E tests.

## Dependencies

- **Foundational Logic** (Phase 2) must be completed before any User Story.
- **User Story 1** (Phase 3) provides the primary value and is the MVP scope.
- **User Story 2 & 3** (Phases 4 & 5) build upon the MVP to complete the switching workflow.

---

## Phase 1: Setup

**Purpose**: Project initialization and prerequisite checks.

- [x] T001 Ensure `apps/web/src/lib/utils/idb.ts` has a method to remove the persisted vault handle

## Phase 2: Foundational

**Purpose**: Implementing the core cleanup logic in the store layer.

- [x] T002 Implement `close()` method in `apps/web/src/lib/stores/vault.svelte.ts` to reset memory state (`entities`, `rootHandle`, `isAuthorized`, `inboundConnections`)
- [x] T003 Update `close()` in `apps/web/src/lib/stores/vault.svelte.ts` to call `searchService.clear()`
- [x] T004 Update `close()` in `apps/web/src/lib/stores/vault.svelte.ts` to call `oracle.clearMessages()`
- [x] T005 Update `close()` in `apps/web/src/lib/stores/vault.svelte.ts` to call `workerBridge.destroy()`
- [x] T006 Update `close()` in `apps/web/src/lib/stores/vault.svelte.ts` to remove the directory handle from persistent storage (IndexedDB)

## Phase 3: User Story 1 - Detach and Clear Active Vault (Priority: P1) 🎯 MVP

**Goal**: Allow users to explicitly close the current campaign.

**Independent Test**: Click "Close Vault" and verify the entity count drops to zero and the graph is empty.

- [x] T007 [US1] Add "Close Vault" button to `apps/web/src/lib/components/VaultControls.svelte` visible only when authorized
- [x] T008 [US1] Bind "Close Vault" button click to `vault.close()` in `apps/web/src/lib/components/VaultControls.svelte`
- [x] T009 [US1] Add E2E test `apps/web/tests/vault-switch.spec.ts` to verify the detachment flow clears all data

## Phase 4: User Story 2 - Mount a Different Campaign (Priority: P2)

**Goal**: Seamlessly transition to a new vault after closing the previous one.

**Independent Test**: Open Folder A, close it, then open Folder B and verify Folder B's content appears.

- [x] T010 [US2] Verify that "OPEN VAULT" button correctly reappears in `apps/web/src/lib/components/VaultControls.svelte` after detachment
- [x] T011 [US2] Add E2E test case to `apps/web/tests/vault-switch.spec.ts` for switching between two mock directories

## Phase 5: User Story 3 - Persistence of "Empty" State (Priority: P3)

**Goal**: Ensure the app respects the "detached" state on reload.

**Independent Test**: Detach a vault, reload the page, and verify the app remains in the "No Vault" state.

- [x] T012 [US3] Add E2E test case to `apps/web/tests/vault-switch.spec.ts` to verify "No Vault" state persists after page reload

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refinement and final verification.

- [x] T013 Ensure "Close Vault" button has an appropriate Lucide icon and matches existing UI style
- [x] T014 [P] Add a confirmation prompt before closing the vault if the save queue is not empty in `apps/web/src/lib/components/VaultControls.svelte`
- [x] T015 Offline Functionality Verification: Confirm detachment works without internet access
