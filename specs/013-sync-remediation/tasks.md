# Tasks: Path-Aware Binary Sync Remediation

## Phase 1: Setup & Foundational
- [x] T001 [P] Update `ICloudAdapter` interface to use `Blob | string` for content in `apps/web/src/lib/cloud-bridge/index.ts`
- [x] T002 [P] Update `RemoteFileMeta` to include `appProperties` in `apps/web/src/lib/cloud-bridge/index.ts`
- [x] T003 [P] Add unit tests for binary-safe diffing in `apps/web/src/lib/cloud-bridge/sync-engine/engine.test.ts`

## Phase 2: User Story 1 - Binary Lore Mirroring [US1]
- [x] T004 Refactor `FileSystemAdapter.readFile` to return `Blob` in `apps/web/src/lib/cloud-bridge/sync-engine/fs-adapter.ts`
- [x] T005 Refactor `FileSystemAdapter.writeFile` to accept `Blob | string` in `apps/web/src/lib/cloud-bridge/sync-engine/fs-adapter.ts`
- [x] T006 Update `WorkerDriveAdapter.uploadFile` to handle `Blob` and set correct `MimeType` in `apps/web/src/lib/cloud-bridge/google-drive/worker-adapter.ts`
- [x] T007 Update `WorkerDriveAdapter.downloadFile` to return `Blob` instead of `text` in `apps/web/src/lib/cloud-bridge/google-drive/worker-adapter.ts`
- [x] T008 Update `SyncEngine.applyPlan` to coordinate binary flow in `apps/web/src/lib/cloud-bridge/sync-engine/engine.ts`

## Phase 3: User Story 2 - Subdirectory Preservation [US2]
- [x] T009 Update `WorkerDriveAdapter.uploadFile` to include `vault_path` in `appProperties` in `apps/web/src/lib/cloud-bridge/google-drive/worker-adapter.ts`
- [x] T010 Update `WorkerDriveAdapter.listFiles` to extract `vault_path` from `appProperties` in `apps/web/src/lib/cloud-bridge/google-drive/worker-adapter.ts`
- [x] T011 Update `SyncEngine.calculateDiff` to use `vault_path` as the primary key instead of filename in `apps/web/src/lib/cloud-bridge/sync-engine/engine.ts`
- [x] T012 Implement recursive `getDirectoryHandle` logic in `FileSystemAdapter.getFileHandle` in `apps/web/src/lib/cloud-bridge/sync-engine/fs-adapter.ts`

## Phase 4: User Story 3 - Recursive Vault Scanning [US3]
- [x] T013 Update `FileSystemAdapter.scanDirectory` to properly flatten the local tree into relative paths in `apps/web/src/lib/cloud-bridge/sync-engine/fs-adapter.ts`
- [x] T014 Verify that `SyncEngine.scan` identifies files in all nested levels in `apps/web/src/lib/cloud-bridge/sync-engine/engine.ts`

## Phase 5: Polish & Validation
- [x] T015 Verify binary integrity of image files after sync in `apps/web/tests/sync-remediation.spec.ts`
- [x] T016 Verify folder structure restoration on a "fresh" simulated device in `apps/web/tests/sync-remediation.spec.ts`
- [x] T017 [P] Update `CloudStatus.svelte` to show binary sync progress if applicable in `apps/web/src/lib/components/settings/CloudStatus.svelte`
- [x] T018 Acceptance: Offline Functionality Verification (Principle VIII)

## Implementation Strategy
1. **Infrastructure**: Phase 1 (Interfaces and Tests).
2. **Binary Flow**: Phase 2 (Blob support throughout).
3. **Path Logic**: Phase 3-4 (Metadata and Recursion).
4. **Validation**: Phase 5 (E2E Tests).
