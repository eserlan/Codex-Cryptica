# Tasks: Directional Vault Synchronization

## Phase 1: Setup

- [x] T001 Initialize feature branch `feat/093-directional-vault-sync`
- [x] T002 [P] Create task checklist in `specs/093-directional-vault-sync/tasks.md`

## Phase 2: Foundational Engine & Store Changes

- [x] T003 Update `packages/schema` to include `SyncDirection` type in `packages/schema/src/sync.ts`
- [x] T004 Update `DiffAlgorithm` to support directional filtering in `packages/sync-engine/src/DiffAlgorithm.ts`
- [x] T005 Update `SyncPlanner` to accept and apply `SyncDirection` in `packages/sync-engine/src/SyncPlanner.ts`
- [x] T006 Update `SyncService` to expose directional sync in `packages/sync-engine/src/SyncService.ts`
- [x] T007 [P] Add unit tests for directional filtering in `packages/sync-engine/src/SyncPlanner.test.ts`
- [x] T008 Update `SyncCoordinator` to expose `push()` and `pull()` methods in `packages/vault-engine/src/sync-coordinator.ts`
- [x] T009 Update `VaultRegistryStore` to track `lastInternalChange` and `lastSavedToFolder` in `apps/web/src/lib/stores/vault/registry.svelte.ts`
- [x] T010 Implement Vault ID Guard in `EntityStore._persistEntity` to prevent cross-vault corruption in `apps/web/src/lib/stores/vault/entity-store.svelte.ts`

## Phase 3: [US1] Manual Backup to Folder (Priority: P1)

**Goal**: Enable users to explicitly push internal changes to a local folder with visual feedback.

**Independent Test**: Edit an entity, verify "SAVE TO FOLDER" button enables, click it, and verify changes appear in the linked local folder.

- [x] T011 [US1] Implement `isDirty` derived state in `SyncStore` based on vault metadata in `apps/web/src/lib/stores/vault/sync-store.svelte.ts`
- [x] T012 [US1] Implement `push()` method in `SyncStore` to trigger directional push in `apps/web/src/lib/stores/vault/sync-store.svelte.ts`
- [x] T013 [US1] Replace "SYNC" button with "SAVE TO FOLDER" in `apps/web/src/lib/components/VaultControls.svelte`
- [x] T014 [US1] Connect `SAVE TO FOLDER` button to `SyncStore.push()` and disable based on `isDirty` in `apps/web/src/lib/components/VaultControls.svelte`
- [x] T015 [US1] Update `lastSavedToFolder` timestamp upon successful push in `apps/web/src/lib/stores/vault/sync-store.svelte.ts`
- [x] T016 [P] [US1] Add unit test for `isDirty` logic (including Entities, Maps, and Canvases) in `apps/web/src/lib/stores/vault/sync-store.test.ts`

## Phase 4: [US2] Refresh from External Edits (Priority: P2)

**Goal**: Enable users to pull changes from a local folder into the app with a safety confirmation gate.

**Independent Test**: Edit a file externally, trigger "LOAD FROM FOLDER" in the vault selector, and verify internal state updates after confirmation.

- [x] T017 [US2] Implement `pull()` method in `SyncStore` to trigger directional pull in `apps/web/src/lib/stores/vault/sync-store.svelte.ts`
- [x] T018 [US2] Implement "Safety Gate" confirmation dialog in `SyncStore.pull()` if `isDirty` is true in `apps/web/src/lib/stores/vault/sync-store.svelte.ts`
- [x] T019 [US2] Add "LOAD FROM FOLDER" action icon next to active vault in `apps/web/src/lib/components/vaults/VaultSwitcherModal.svelte`
- [x] T020 [US2] Trigger `SyncStore.pull()` from the new action icon in `apps/web/src/lib/components/vaults/VaultSwitcherModal.svelte`
- [x] T021 [P] [US2] Add unit test for `pull()` and Safety Gate in `apps/web/src/lib/stores/vault/sync-store.test.ts`

## Phase 5: [US3] Instant Vault Switching (Priority: P3)

**Goal**: Remove filesystem sync from the vault switch flow to enable near-instant switching.

**Independent Test**: Measure switch time between two vaults; verify no filesystem I/O occurs during the transition.

- [x] T022 [US3] Remove `syncWithLocalFolder()` call from `VaultLifecycleManager.switchVault` in `apps/web/src/lib/stores/vault/lifecycle.ts`
- [x] T023 [US3] Ensure `flushPendingSaves()` completes before clearing state in `VaultLifecycleManager.switchVault` in `apps/web/src/lib/stores/vault/lifecycle.ts`
- [x] T024 [P] [US3] Implement parallel loading of Maps and Canvases in `SyncStore.loadFiles` in `apps/web/src/lib/stores/vault/sync-store.svelte.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T025 [P] Implement per-vault Lore Oracle chat history persistence in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T026 [P] Update `status` to `idle` only after Maps and Canvases finish loading in `apps/web/src/lib/stores/vault/sync-store.svelte.ts`
- [x] T027 [P] Implement UI for reporting partial Load/Save errors (e.g., error detail tooltip or modal) in `apps/web/src/lib/components/VaultControls.svelte`
- [x] T028 [P] Update user-facing help documentation in `apps/web/src/lib/config/help-content.ts`
- [x] T029 [P] Add E2E tests for Save/Load and Safety Gate flows in `apps/web/tests/sync.e2e.ts`
- [x] T030 Remove remaining `window.dispatchEvent` for vault switches in favor of `vaultEventBus` in `apps/web/src/lib/stores/vault/lifecycle.ts`
- [x] T031 Final verification of all success criteria in `specs/093-directional-vault-sync/spec.md`
- [x] T032 Run full test suite: `npm test` and `npm run lint`

## Dependencies

- Phase 2 (Foundational) MUST be completed before User Stories.
- US1 (Push) is the primary MVP target.
- US2 (Pull) depends on the directional filtering implemented in Phase 2.
- US3 (Switching) relies on the removal of bidirectional logic from Phase 2.

## Parallel Execution

- T007 (Engine Tests) can run alongside store updates.
- T016 (Dirty Logic Tests) can run alongside UI implementation.
- T021 (Pull Tests) can run alongside Switcher UI updates.
- T024 (Parallel Loading) can be implemented independently of US1/US2 UI.

## Implementation Strategy

- **MVP**: Complete Phase 2 and Phase 3 (Push/Save) first. This establishes the primary backup flow.
- **Incremental**: Add Phase 4 (Pull/Load) once Push is stable.
- **Optimization**: Complete Phase 5 and 6 to maximize performance and consistency.
