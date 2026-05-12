# Tasks: Google Drive Cloud Sync

## Phase 1: GDriveBackend + Auth

**Goal**: A fully-tested `GDriveBackend` and `GDriveAuthService` that handle the complete Drive API lifecycle.

- [ ] T001 Create `packages/sync-engine/src/GDriveBackend.ts` with `DriveError` class and `GDriveBackend` skeleton implementing `ISyncBackend`
- [ ] T002 [P] Create `apps/web/src/lib/services/gdrive-auth.ts` with `GDriveAuthService` implementing `IGDriveAuthService` (GIS `initTokenClient`, in-memory token)
- [ ] T003 Implement `GDriveBackend.connect()` — validate folder access via Drive `files.get`, throw typed `DriveError` for 401/403/404
- [ ] T004 [P] Implement `GDriveBackend.scan()` — list files in folder via Drive `files.list`, map to `FileMetadata` with `handle = driveFileId`
- [ ] T005 [P] Implement `GDriveBackend.download()` — fetch file content via Drive `files.get?alt=media`, return `Blob`
- [ ] T006 Implement `GDriveBackend.upload()` — multipart POST for new files, PATCH for existing (`remoteId` present); return `FileMetadata` with Drive file ID in `handle`
- [ ] T007 [P] Implement `GDriveBackend.delete()` — call Drive `files.delete` by file ID
- [ ] T008 [P] Add 401-refresh retry and 500/503 single-retry with 500 ms backoff to all Drive fetch calls
- [ ] T009 Add `SYNC:LOCAL_PUSH_COMPLETE`, `SYNC:LOCAL_PULL_COMPLETE`, `SYNC:DRIVE_CONNECTED`, `SYNC:DRIVE_DISCONNECTED`, `SYNC:DRIVE_PUSH_COMPLETE`, `SYNC:DRIVE_PULL_COMPLETE`, `SYNC:DRIVE_SYNC_FAILED` to `packages/sync-engine/src/events.ts` via module augmentation on `AppEventRegistry`
- [ ] T010 Re-export `GDriveBackend` and `DriveError` from `packages/sync-engine/src/index.ts`
- [ ] T011 [P] Unit tests for `GDriveBackend` in `packages/sync-engine/tests/unit/GDriveBackend.test.ts` — happy paths for scan/upload/download/delete, 401 refresh, 404 reconnect, 500 retry, network failure, duplicate-prevention via `remoteId`
- [ ] T012 [P] Unit tests for `GDriveAuthService` in `apps/web/src/tests/gdrive-auth.test.ts` — silent refresh, popup fallback, sign-out

## Phase 2: [US1] [US2] Event-Driven Sync Wire-up

**Story Goals**:

- US1 (Cloud Backup): Saving pushes changes to Drive automatically via event trigger.
- US2 (Cross-Device): Loading pulls from Drive when local pull completes.

- [ ] T013 [US1] [US2] Create `packages/sync-engine/src/GDriveSyncService.ts`: listens on `AppEventBus` for `SYNC:LOCAL_PUSH_COMPLETE` and `SYNC:LOCAL_PULL_COMPLETE`
- [ ] T014 [US1] Implement `GDriveSyncService.onLocalPushComplete()`: triggers `SyncService.sync()` with `GDriveBackend` and `OpfsBackend` (push direction)
- [ ] T015 [US2] Implement `GDriveSyncService.onLocalPullComplete()`: triggers `SyncService.sync()` (pull direction) to ensure Drive content is mirrored to OPFS
- [ ] T016 [US1] [US2] Create `packages/sync-engine/src/CloudSyncMetadataService.ts` to manage the `cloud_sync_metadata` IndexedDB store (folder IDs, sync timestamps)
- [ ] T017 [US1] [US2] Update `apps/web/src/lib/stores/vault/sync-store.svelte.ts` to emit `SYNC:LOCAL_PUSH_COMPLETE` and `SYNC:LOCAL_PULL_COMPLETE` after `SyncCoordinator` operations
- [ ] T018 [US1] Emit `SYNC:DRIVE_PUSH_COMPLETE` from `GDriveSyncService` on success with `{ vaultId, uploaded, downloaded }`
- [ ] T019 [US1] Emit `SYNC:DRIVE_SYNC_FAILED` from `GDriveSyncService` on failure with `{ vaultId, error }`
- [ ] T020 [P] Implement `BroadcastChannel` tab-guard in `GDriveSyncService`: skip Drive sync if another tab is active
- [ ] T021 [P] Unit tests for `GDriveSyncService` and `CloudSyncMetadataService` — verify event reactions, IDB persistence, and tab-locking logic

## Phase 3: [US3] Connect / Disconnect UI

**Story Goal**: A user can connect their Google Drive account and see independent sync status.

- [ ] T022 [US3] Create `apps/web/src/lib/components/settings/DriveSettings.svelte` using `GDriveAuthService` and `CloudSyncMetadataService`
- [ ] T023 [US3] Implement "Connect" flow: `GDriveAuthService.getAccessToken()` → create folder → save metadata via `CloudSyncMetadataService`
- [ ] T024 [US3] Implement "Disconnect" flow: clear metadata, sign out, stop `GDriveSyncService` listeners for that vault
- [ ] T025 [US3] Implement "Use existing folder ID" flow: validate folder ID via `GDriveBackend.connect()`, then save metadata
- [ ] T026 [US3] Add cloud status indicator to toolbar: reactive `driveStatus` state derived from `SYNC:DRIVE_PUSH_COMPLETE`, `SYNC:DRIVE_PULL_COMPLETE`, and `SYNC:DRIVE_SYNC_FAILED` events via `AppEventBus`
- [ ] T027 [US3] Hide Drive settings/indicator in Guest/Demo mode
- [ ] T028 [US3] Disable / grey-out Drive controls when `navigator.onLine === false`

## Phase 4: Polish & Cross-Cutting

- [ ] T029 Run `pnpm run lint` across `packages/sync-engine` and `apps/web`; fix any issues
- [ ] T030 Run `pnpm test` across `packages/sync-engine` and `apps/web`; maintain ≥80% coverage on `GDriveBackend.ts`
- [ ] T031 [P] Create Playwright e2e test in `apps/web/tests/e2e/gdrive-sync.test.ts`: connect (with MSW-stubbed Drive API) → save entity → reload vault → verify entity present
- [ ] T032 [P] Update `GEMINI.md` with Drive integration notes for feature `096-gdrive-cloud-sync`
- [ ] T033 Verify SC-001 through SC-005 from the spec manually in the browser
- [ ] T034 Update speckit artifacts if any implementation decisions deviated from the plan
