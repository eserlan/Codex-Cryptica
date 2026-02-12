# Tasks: Multi-Campaign Switch

**Input**: Design documents from `/specs/039-multi-campaign-switch/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/vault-service.ts

**Organization**: Tasks are grouped by phase and user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 0: OPFS Refactoring (Architecture Transition)

**Purpose**: Transition primary storage from FSA to OPFS. The current `main` uses `showDirectoryPicker()` and `walkDirectory()` — this phase moves I/O to OPFS.

- [x] T000 Create `apps/web/src/lib/utils/opfs.ts` with OPFS directory utilities: `getOpfsRoot()`, `getOrCreateDir()`, `walkOpfsDirectory()`, `readFileAsText()`, `writeFile()`, `deleteEntry()`
- [x] T000.1 [P] Refactor `apps/web/src/lib/stores/vault.svelte.ts` to use OPFS utilities from `opfs.ts` instead of FSA-based `rootHandle`
- [x] T000.2 Verify vault init, entity CRUD, and image resolution work end-to-end with OPFS storage
- [x] T000.3 Update any components that directly reference FSA handle types (e.g., `FileSystemDirectoryHandle` props)

---

## Phase 1: Setup (Multi-Vault Infrastructure)

**Purpose**: Update storage utilities and database schema for multi-vault support.

- [x] T001 Update `apps/web/src/lib/utils/idb.ts` to include `vaults` object store in the database schema (v5)
- [x] T002 Update `apps/web/src/lib/utils/opfs.ts` to add vault-specific directory operations: `getVaultDir(id)`, `createVaultDir(id)`, `deleteVaultDir(id)`
- [x] T003 Implement migration logic in `apps/web/src/lib/stores/vault.svelte.ts` to move root-level `.md` files and `/images` to `vaults/default/` on first run if no `vaults/` directory exists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logic for listing and switching vaults without UI.

- [x] T004 Define `VaultRecord` type and update `VaultStore` state per `contracts/vault-service.ts`
- [x] T005 Implement `listVaults()` to fetch available vaults from IndexedDB in `vault.svelte.ts`
- [x] T006 Implement `switchVault(id)` logic: call `closeVault()`, update `activeVaultId` in IDB, load from new OPFS subdirectory
- [x] T007 Add unit tests for `switchVault`, `listVaults`, `createVault` in `apps/web/src/lib/stores/vault.test.ts`
- [x] T007.1 [P] Implement logic to persist `activeVaultId` to IDB `settings` store on every switch
- [x] T007.2 Update `VaultStore.init()` to retrieve `activeVaultId` from IDB and load the corresponding vault

---

## Phase 3: User Story 1 - List and Switch Vaults (Priority: P1)

**Goal**: Provide a UI to see and switch between existing vaults.

**Independent Test**: Create two vaults via the store; verify both appear in the modal and selecting one loads its data.

### Implementation for User Story 1

- [x] T008 [US1] Create `apps/web/src/lib/components/vaults/VaultSwitcherModal.svelte` with vault list (name, entity count, last opened)
- [x] T009 [P] [US1] Add a "Switch Vault" button/trigger in the header to open the modal in `apps/web/src/lib/components/VaultControls.svelte`
- [x] T010 [US1] Connect `VaultSwitcherModal.svelte` to `vault.switchVault()` action
- [x] T011 [US1] Create E2E test for listing and switching vaults in `apps/web/tests/vault-switch.spec.ts`

---

## Phase 4: User Story 2 - Create New Vault (Priority: P1)

**Goal**: Allow users to create a fresh, empty vault.

**Independent Test**: Use the "New Vault" button and verify a new empty workspace is initialized.

### Implementation for User Story 2

- [x] T012 [US2] Add "New Vault" form/button to `VaultSwitcherModal.svelte`
- [x] T013 [US2] Implement `createVault(name)` in `vault.svelte.ts`: create OPFS subdirectory, register in IDB, switch to it
- [x] T014 [US2] Update E2E test in `apps/web/tests/vault-switch.spec.ts` to include vault creation flow

---

## Phase 5: User Story 3 - Manage Vault Metadata (Priority: P2)

**Goal**: Support renaming and deleting vaults.

**Independent Test**: Rename a vault and verify the change; delete a vault and verify files are gone from OPFS.

### Implementation for User Story 3

- [x] T015 [US3] Add "Rename" and "Delete" actions to vault items in `VaultSwitcherModal.svelte`
- [x] T016 [US3] Implement `renameVault(id, newName)` in `vault.svelte.ts` (updates IDB metadata)
- [x] T017 [US3] Implement `deleteVault(id)` in `vault.svelte.ts` (removes OPFS directory and IDB entry)
- [x] T018 [US3] Add confirmation dialog for vault deletion in `VaultSwitcherModal.svelte`
- [x] T019 [US3] Create E2E test for rename and delete operations in `apps/web/tests/vault-management.spec.ts`

---

## Phase 6: User Story 4 - Sync to Filesystem (Priority: P3)

**Goal**: Optional export/import between OPFS vault and a local folder.

**Independent Test**: Sync a vault with 5 entities to a local folder; verify all files appear. Edit one file, import back, verify changes.

### Implementation for User Story 4

- [x] T024 [US4] Implement `syncToFolder()` in `vault.svelte.ts`: `showDirectoryPicker()`, write all OPFS files to FSA directory
- [x] T025 [US4] Implement `importFromFolder()` in `vault.svelte.ts`: read FSA directory, write files into current OPFS vault
- [x] T026 [US4] Add "Sync to Folder" and "Import from Folder" buttons to vault settings or switcher modal
- [x] T027 [US4] Add progress indicator and error handling for sync operations

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and UI refinements.

- [x] T020 Ensure active vault name is displayed in the main header in `VaultControls.svelte`
- [x] T021 Add loading states to `VaultSwitcherModal.svelte` while switching vaults
- [x] T022 Final run of `npm run check` and `npm test` to ensure no regressions
- [x] T023 Verify `SC-001` (switch time < 500ms) using Chrome DevTools Performance tab
- [x] T028 Update broken E2E tests that expect the old "OPEN VAULT" button to use the new vault picker flow

---

## Dependencies & Execution Order

1. **OPFS Refactoring (Phase 0)** → All subsequent phases depend on OPFS as primary storage.
2. **Setup (Phase 1)** → **Foundational (Phase 2)**: Core storage logic must be updated before vault switching.
3. **Foundational (Phase 2)** → **US1 (Phase 3)**: Switching logic must exist before the UI can trigger it.
4. **US1 (Phase 3)** → **US2 (Phase 4)**: The modal created in US1 is the host for the "New Vault" UI.
5. **US1/US2** → **US3 (Phase 5)**: Management actions are additions to the switcher UI.
6. **Any phase** → **US4 (Phase 6)**: Sync is independent; can be built at any time after Phase 1.

## Parallel Opportunities

- T000 and T000.1 can be done in parallel initially (utility file vs store refactor), but T000.1 depends on T000 completing.
- T001 and T002 can be done in parallel (IDB schema vs OPFS utilities).
- T009 can be done in parallel with T008 (UI trigger vs Modal implementation).
- T024-T027 (US4) can be done independently from US3.

## Implementation Strategy

- **Phase 0 (MVP-0)**: Get OPFS working as primary storage. This validates the architecture shift.
- **MVP**: Complete Phase 1, 2, and 3. Core ability to list and switch vaults.
- **Incremental**: Add US2 (Creation), US3 (Management), then US4 (Sync) after switching is stable.
