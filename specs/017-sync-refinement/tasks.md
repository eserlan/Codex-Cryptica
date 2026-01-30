# Tasks: Sync Refinement & Deletion Support

**Input**: Design documents from `/specs/017-sync-refinement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Setup & Foundations

- [x] T001 Consolidate `SKEW_MS` into `SYNC_SKEW_MS` in `apps/web/src/lib/cloud-bridge/sync-engine/conflict.ts`
- [x] T002 Refine `SyncPlan` interface to include paths for metadata cleanup in `apps/web/src/lib/cloud-bridge/sync-engine/engine.ts`
- [x] T003 Refactor `WorkerDriveAdapter.uploadFile` to use `multipart/related` for binary integrity in `apps/web/src/lib/cloud-bridge/google-drive/worker-adapter.ts`

---

## Phase 2: User Story 1 & 4 - Deletions & Deduplication (P1)

**Goal**: Propagate local deletions to remote and clean up duplicate remote files.

**Independent Test**: Delete a local file and verify it's removed from Drive. Create duplicates on Drive and verify they are merged.

### Implementation for US1 & US4

- [x] T004 Update `SyncEngine.calculateDiff` to detect local deletions using metadata in `apps/web/src/lib/cloud-bridge/sync-engine/engine.ts`
- [x] T005 Implement remote deduplication logic in `SyncEngine.scan` or `calculateDiff` to keep only the newest file per `vault_path`
- [x] T006 Update `SyncEngine.applyPlan` to execute `deletes` via the cloud adapter
- [x] T007 Implement metadata cleanup for deleted files in `SyncEngine.applyPlan`
- [x] T008 [P] Add unit tests for deletion and deduplication scenarios in `apps/web/src/lib/cloud-bridge/sync-engine/engine.test.ts`

---

## Phase 3: User Story 2 - UI Refresh After Sync (P1)

**Goal**: Ensure the Graph and Vault update automatically when remote changes are downloaded.

**Independent Test**: Perform a sync that downloads 1 file and verify the Graph re-renders.

### Implementation for US2

- [x] T009 Update `SyncWorker` to emit a specific `REMOTE_UPDATES_DOWNLOADED` signal in `apps/web/src/workers/sync.ts`
- [x] T010 Update `WorkerBridge` to listen for the update signal and trigger `vault.refresh()` in `apps/web/src/lib/cloud-bridge/worker-bridge.ts`

---

## Phase 4: User Story 3 - Detailed Sync Progress (P2)

**Goal**: Show incremental "X/Y" progress in the UI.

**Independent Test**: Start a multi-file sync and watch the counters increment in the settings menu.

### Implementation for US3

- [x] T011 Update `SyncEngine.applyPlan` to accept a progress callback
- [x] T012 Emit `SYNC_PROGRESS` messages from the `sync.ts` worker during plan execution
- [x] T013 Handle `SYNC_PROGRESS` in `WorkerBridge.ts` and update the `syncStats` store in `apps/web/src/stores/sync-stats.ts`

---

## Phase 5: User Story 5 - High-Fidelity Image Synchronization (P1)

**Goal**: Ensure images are synced with correct MIME types and no corruption.

**Independent Test**: Sync a `.png` and verify it is previewable in Google Drive.

### Implementation for US5

- [x] T014 Verify `getMimeType` logic in `worker-adapter.ts` correctly handles images (Completed via T003)
- [x] T015 [P] Add E2E test for image synchronization in `apps/web/tests/sync-fidelity.spec.ts`

---

## Phase 6: Polish & Verification

- [x] T016 **Offline Functionality Verification**: Verify sync properly aborts when offline and resumes when online.
- [x] T017 Final pass on error handling in `SyncEngine.applyPlan` to ensure metadata isn't corrupted on partial failure.
- [x] T018 Update `research.md` with final implementation notes.

---

## Dependencies & Execution Order

1. **Phase 1** (Foundational) MUST be completed first.
2. **Phase 2** (Deletions) and **Phase 5** (Images) are the highest priority for data integrity.
3. **Phase 3** (UI Refresh) and **Phase 4** (Progress) improve UX and should follow.

## Implementation Strategy

### MVP First
Complete **Phase 1** and **Phase 2** to solve the "Zombie File" and duplication issues. This provides immediate value for data consistency.