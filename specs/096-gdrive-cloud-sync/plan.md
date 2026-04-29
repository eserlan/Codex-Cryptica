# Implementation Plan: Google Drive Cloud Sync

**Branch**: `096-gdrive-cloud-sync` | **Date**: 2026-04-28 | **Spec**: [specs/096-gdrive-cloud-sync/spec.md](spec.md)
**Input**: Feature specification from `/specs/096-gdrive-cloud-sync/spec.md`

## Summary

Implement Google Drive as an optional second sync target that mirrors vault content alongside the existing local folder. OPFS remains the authoritative store. This implementation follows a decoupled, event-driven architecture: a dedicated `GDriveSyncService` listens for local sync completion events on the `AppEventBus` and triggers a corresponding push/pull to Drive using `GDriveBackend`. This ensures Drive sync never blocks the critical local save path and maintains a clear separation of concerns.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: Google Identity Services (`accounts.google.com/gsi/client`, loaded via script tag), Google Drive REST API v3 (direct `fetch` — no GAPI client)  
**Storage**: IndexedDB (`cloud_sync_metadata` table), in-memory token only  
**Testing**: Vitest (unit), Playwright (e2e)  
**Target Platform**: Browser (Web), online-only feature  
**Project Type**: Feature / Library Extension  
**Performance Goals**: Drive push/pull runs in parallel to UI activity after local save. Progress streamed to its own status indicator.  
**Constraints**: Zero vault data on project servers. `drive.file` scope only. OPFS is master — no Drive-side conflict resolution. Auth token in memory only.

- **Concurrency**: Use a `BroadcastChannel` tab-guard to ensure only one browser tab performs a Drive sync at a time, preventing race conditions and duplicate file creation.  
  **Scale/Scope**: Per-vault, opt-in. Decoupled from `SyncCoordinator` via events.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                       | Status  | Notes                                                                                                          |
| :------------------------------ | :------ | :------------------------------------------------------------------------------------------------------------- |
| **I. Library-First**            | ✅ PASS | `GDriveBackend` and `GDriveSyncService` live in `packages/sync-engine`. `GDriveAuthService` is web-layer only. |
| **II. TDD**                     | ✅ PASS | Backend and services tested with mocks. E2e test for full event cycle.                                         |
| **III. Simplicity & YAGNI**     | ✅ PASS | Event-driven model avoids complex imperative state threading. No real-time sync.                               |
| **IV. No User Data On Servers** | ✅ PASS | Direct Drive communication. No backend proxy.                                                                  |
| **VIII. Dependency Injection**  | ✅ PASS | Services are injectable. `GDriveSyncService` takes `GDriveBackend` and `AppEventBus`.                          |
| **X. Coverage Goals**           | ✅ PASS | Target 80% coverage for `GDriveBackend` and `GDriveSyncService`.                                               |

## Project Structure

### Source Code

```text
packages/
└── sync-engine/
    └── src/
        ├── GDriveBackend.ts       # Implements ISyncBackend against Drive REST v3
        ├── GDriveSyncService.ts   # Event-driven coordinator for Drive sync
        ├── CloudSyncMetadataService.ts # Manages cloud_sync_metadata IDB store
        ├── events.ts              # SYNC:LOCAL_*, SYNC:DRIVE_* event declarations
        └── index.ts               # Re-export services and backends

apps/web/src/lib/
├── services/
│   └── gdrive-auth.ts             # GDriveAuthService — GIS token management
└── stores/vault/
    └── sync-store.svelte.ts       # Emit SYNC:LOCAL_* events on save/load
```

## Phase Breakdown

### Phase 1: GDriveBackend + Auth

**Goal**: A fully-tested backend that can scan, upload, download, and delete Drive files, paired with an auth service that silently refreshes tokens.

- Define `DriveError`, `GDriveAuthService`, and `GDriveBackend`.
- Implement core Drive REST v3 operations.
- Declare `SYNC:LOCAL_PUSH_COMPLETE`, `SYNC:LOCAL_PULL_COMPLETE`, `SYNC:DRIVE_PUSH_COMPLETE`, `SYNC:DRIVE_PULL_COMPLETE`, and `SYNC:DRIVE_SYNC_FAILED` events.
- Unit tests for backend and auth service.

### Phase 2: Event-Driven Sync Wire-up

**Goal**: Decoupled Drive sync triggered by local vault activity.

- Implement `GDriveSyncService` to listen for `SYNC:LOCAL_PUSH_COMPLETE` and `SYNC:LOCAL_PULL_COMPLETE`.
- `GDriveSyncService` runs `SyncService` with `GDriveBackend` + `OpfsBackend`.
- Implement `CloudSyncMetadataService` for IDB persistence of folder IDs and timestamps.
- Update `SyncStore` to emit `SYNC:LOCAL_*` events after `SyncCoordinator` operations.
- Implement `BroadcastChannel` tab-guard to prevent concurrent syncs across tabs.

### Phase 3: UI — Independent Status & Settings

**Goal**: Independent Drive status tracking and connection management.

- `DriveSettings.svelte`: Connection management using `GDriveAuthService` and `CloudSyncMetadataService`.
- Independent `driveStatus` reactive state (idle/syncing/error) updated via `SYNC:DRIVE_*` events.
- Sidebar indicator subscribing directly to `AppEventBus`.

## Risk Register

| Risk                                             | Likelihood | Impact | Mitigation                                                                     |
| :----------------------------------------------- | :--------- | :----- | :----------------------------------------------------------------------------- |
| OAuth popup blocked by browser                   | Medium     | High   | Require a click event to trigger `requestAccessToken`. No silent auto-pop.     |
| `drive.file` scope can't discover shared folders | High       | Medium | Document manual folder ID entry. Surface prominently in UI.                    |
| Token expires during multi-file upload           | Medium     | Medium | Re-try with refreshed token on 401; rollback partial upload if retry fails.    |
| Drive folder deleted between sessions            | Low        | Medium | 404 on `connect()` → prompt "Reconnect Drive" rather than silent failure.      |
| Duplicate files from race condition              | Low        | High   | Store Drive file ID in `SyncEntry.remoteId` after first upload; always PATCH.  |
| Two tabs uploading simultaneously                | Low        | High   | `BroadcastChannel` tab guard — second tab skips Drive sync if first is active. |
