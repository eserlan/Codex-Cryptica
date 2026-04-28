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
- [ ] T009 Add `SYNC:DRIVE_CONNECTED`, `SYNC:DRIVE_DISCONNECTED`, `SYNC:DRIVE_SYNC_COMPLETE`, `SYNC:DRIVE_SYNC_FAILED` to `packages/sync-engine/src/events.ts` via module augmentation on `AppEventRegistry`
- [ ] T010 Re-export `GDriveBackend` and `DriveError` from `packages/sync-engine/src/index.ts`
- [ ] T011 [P] Unit tests for `GDriveBackend` in `packages/sync-engine/tests/unit/GDriveBackend.test.ts` — happy paths for scan/upload/download/delete, 401 refresh, 404 reconnect, 500 retry, network failure, duplicate-prevention via `remoteId`
- [ ] T012 [P] Unit tests for `GDriveAuthService` in `apps/web/src/tests/gdrive-auth.test.ts` — silent refresh, popup fallback, sign-out

## Phase 2: [US1] [US2] Wire Drive into Save/Load/Switch

**Story Goals**:

- US1 (Cloud Backup): Saving pushes changes to Drive automatically.
- US2 (Cross-Device): Loading pulls from Drive when a Drive folder is connected.

**Independent Test**: Connect Drive, modify entity, reload from scratch — entity reflects Drive state.

- [ ] T013 [US1] [US2] Add optional `driveBackend` parameter to `SyncCoordinator` (or `sync-store.svelte.ts` `getSyncCoordinator` factory) so Drive is wired in when `CloudSyncMetadata.remoteFolderId` exists
- [ ] T014 [US1] On vault save: after local `FileSystemBackend` sync succeeds, run `SyncService.sync()` with `GDriveBackend` as `fsBackend` and `OpfsBackend` as `opfsBackend`, direction `push`; catch `DriveError` and notify user without blocking local save
- [ ] T015 [US2] On vault load/switch: if Drive folder is connected, run `SyncService.sync()` direction `pull` before loading from OPFS; Drive errors are non-blocking
- [ ] T016 [US1] [US2] Persist `CloudSyncMetadata` (`remoteFolderId`, `remoteFolderName`, `lastSyncTime`) to IndexedDB in `packages/sync-engine/src/SyncPersistence.ts` after each successful Drive sync
- [ ] T017 [US1] [US2] Load `CloudSyncMetadata` from IndexedDB on vault init; if present, construct `GDriveBackend` and wire into the coordinator
- [ ] T018 [US1] Emit `SYNC:DRIVE_SYNC_COMPLETE` on successful Drive push with `{ vaultId, uploaded, downloaded }` counts
- [ ] T019 [US1] Emit `SYNC:DRIVE_SYNC_FAILED` on Drive push/pull failure with `{ vaultId, error }` message
- [ ] T020 [P] Add `BroadcastChannel` tab guard in `gdrive-auth.ts` or `sync-store.svelte.ts`: skip Drive sync if another tab broadcasts it is already syncing, reschedule a re-check
- [ ] T021 Disable Drive sync path when `navigator.onLine === false`; no error thrown

## Phase 3: [US3] Connect / Disconnect UI

**Story Goal**: A user can connect their Google Drive account from vault settings in at most two actions.

**Independent Test**: Navigate to vault settings, click Connect Drive, approve OAuth, verify Drive folder name appears in settings.

- [ ] T022 [US3] Create `apps/web/src/lib/components/settings/DriveSettings.svelte`:
  - Disconnected state: "Connect to Google Drive" button
  - Connected state: folder name, last sync time, "Disconnect" button
  - Error/expired state: "Reconnect Drive" button
  - "Use existing folder ID" text input for co-host/shared folder scenario
- [ ] T023 [US3] Implement "Connect" flow: `GDriveAuthService.getAccessToken()` → Drive `files.create` to make `CodexCryptica/{vaultName}` hierarchy → save `remoteFolderId` to `CloudSyncMetadata`
- [ ] T024 [US3] Implement "Disconnect" flow: clear `CloudSyncMetadata` from IndexedDB, call `GDriveAuthService.signOut()`, remove `driveBackend` from coordinator
- [ ] T025 [US3] Implement "Use existing folder ID" flow: accept manual folder ID, call `GDriveBackend.connect()` to validate access, save to `CloudSyncMetadata` if valid
- [ ] T026 [US3] Add cloud status indicator to the main toolbar or sidebar: idle / syncing / error icons, clicking opens `DriveSettings.svelte`
- [ ] T027 [US3] Hide Drive settings section in Guest mode and Demo mode
- [ ] T028 [US3] Disable / grey-out Drive controls when `navigator.onLine === false` with a tooltip explaining why

## Phase 4: Polish & Cross-Cutting

- [ ] T029 Run `npm run lint` across `packages/sync-engine` and `apps/web`; fix any issues
- [ ] T030 Run `npm test` across `packages/sync-engine` and `apps/web`; maintain ≥80% coverage on `GDriveBackend.ts`
- [ ] T031 [P] Create Playwright e2e test in `apps/web/tests/e2e/gdrive-sync.test.ts`: connect (with MSW-stubbed Drive API) → save entity → reload vault → verify entity present
- [ ] T032 [P] Update `GEMINI.md` with Drive integration notes for feature `096-gdrive-cloud-sync`
- [ ] T033 Verify SC-001 through SC-005 from the spec manually in the browser
- [ ] T034 Update speckit artifacts if any implementation decisions deviated from the plan
