# Tasks: Robust Local File Syncing

## Implementation Strategy

We will implement the synchronization engine as a standalone library in `packages/sync-engine` to adhere to the project constitution. We follow a TDD approach for the diffing logic to ensure all 16 state permutations (add/modify/delete/sync) are handled correctly before integrating with the live filesystem.

## Dependencies

- US1 depends on Phase 1 & 2
- US2 depends on US1
- US3 depends on US1

## Phase 1: Setup

- [x] T001 [P] Scaffold new workspace package in `packages/sync-engine/package.json`
- [x] T002 Define `SyncEntry` schema and update IndexedDB initialization in `apps/web/src/lib/utils/idb.ts`
- [x] T003 [P] Create `ILocalSyncService` interface in `packages/sync-engine/src/types.ts`

## Phase 2: Foundational

- [x] T004 Implement `SyncRegistry` wrapper for IndexedDB in `packages/sync-engine/src/SyncRegistry.ts`
- [x] T005 [P] Implement stateless `DiffAlgorithm` logic in `packages/sync-engine/src/DiffAlgorithm.ts`
- [x] T006 Write unit tests for `DiffAlgorithm` covering all state transitions in `packages/sync-engine/tests/diff.test.ts`

## Phase 3: User Story 1 - Bidirectional Smart Sync (Priority: P1)

**Goal**: Sync modified files between OPFS and Local folder based on timestamps.
**Test**: Modify file locally -> verify OPFS update. Modify in app -> verify local update.

- [x] T007 [US1] Implement `LocalSyncService.sync()` core loop in `packages/sync-engine/src/LocalSyncService.ts`
- [x] T008 [US1] Integrate `walkDirectory` for parallel tree traversal in `packages/sync-engine/src/LocalSyncService.ts`
- [x] T009 [US1] Implement file transfer logic (read/write) in `packages/sync-engine/src/LocalSyncService.ts`
- [x] T010 [US1] Add `syncToLocal` trigger and progress tracking to `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T011 [US1] Update `VaultControls.svelte` to call `packages/sync-engine`

## Phase 4: User Story 2 - Synchronization of New and Deleted Files (Priority: P2)

**Goal**: Sync additions and deletions bidirectionally using the registry.
**Test**: Delete local file -> verify OPFS deletion. Add local file -> verify OPFS creation.

- [x] T012 [US2] Update `DiffAlgorithm.ts` to detect additions and deletions using the `SyncRegistry`
- [x] T013 [US2] Implement deletion execution logic in `LocalSyncService.ts`
- [x] T014 [US2] Update unit tests in `diff.test.ts` to cover deletion and addition scenarios

## Phase 5: User Story 3 - Conflict Resolution (Priority: P2)

**Goal**: Automatically resolve conflicts using "newest wins".
**Test**: Modify both versions -> verify the one with the latest timestamp is kept.

- [x] T015 [US3] Implement "newest wins" resolution in `DiffAlgorithm.ts`
- [x] T016 [US3] Add conflict detection logging and summary reporting in `LocalSyncService.ts`
- [x] T017 [US3] Verify conflict scenarios in `diff.test.ts`

## Phase 6: Polish & Cross-Cutting

- [x] T018 Implement atomic write/commit logic to handle "Interrupted Transfer" edge case in `LocalSyncService.ts`
- [x] T019 Implement "Minimum Valid Entity" validation (id/title check) for invalid markdown in `DiffAlgorithm.ts`
- [x] T020 Update user documentation and help guides in `apps/web/src/lib/config/help-content.ts`
- [x] T021 [P] Conduct final performance audit with 1000+ files to verify < 2s scan target

## Parallel Execution Examples

- **Registry & Interface**: T003 and T004 can be done in parallel.
- **Diff Logic & UI Hooks**: T005 and T010 can be done in parallel once T001 is ready.
- **Documentation & Performance**: T020 and T021 can be done in parallel.
