# Implementation Plan: Google Drive Cloud Sync

**Branch**: `096-gdrive-cloud-sync` | **Date**: 2026-04-28 | **Spec**: [specs/096-gdrive-cloud-sync/spec.md](spec.md)
**Input**: Feature specification from `/specs/096-gdrive-cloud-sync/spec.md`

## Summary

Implement Google Drive as an optional second sync target that mirrors vault content alongside the existing local folder. OPFS remains the authoritative store. When Drive is connected, every save pushes to Drive and every load optionally pulls from Drive, using the same `ISyncBackend` interface already implemented by `FileSystemBackend` and `OpfsBackend`. Three phases: backend + auth, wire into existing save/load flows, then UI polish.

## Technical Context

**Language/Version**: TypeScript 6.x  
**Primary Dependencies**: Google Identity Services (`accounts.google.com/gsi/client`, loaded via script tag), Google Drive REST API v3 (direct `fetch` — no GAPI client)  
**Storage**: IndexedDB (`cloud_sync_metadata` table — existing), in-memory token only  
**Testing**: Vitest (unit), Playwright (e2e)  
**Target Platform**: Browser (Web), online-only feature  
**Project Type**: Feature / Library Extension  
**Performance Goals**: Drive push/pull adds at most 3 s to a save cycle for a 200-entity vault over a typical broadband connection. Progress streamed to existing progress indicator.  
**Constraints**: Zero vault data on project servers. `drive.file` scope only. OPFS is master — no Drive-side conflict resolution. Auth token in memory only.  
**Scale/Scope**: Per-vault, opt-in. Affects `SyncCoordinator` save/load paths and vault settings UI.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                       | Status  | Notes                                                                                                                   |
| :------------------------------ | :------ | :---------------------------------------------------------------------------------------------------------------------- |
| **I. Library-First**            | ✅ PASS | `GDriveBackend` lives in `packages/sync-engine`. `GDriveAuthService` is web-layer only because GIS is browser-specific. |
| **II. TDD**                     | ✅ PASS | Backend tested with mocked `fetch`. Auth service tested with mocked GIS. E2e test for connect-save-reload cycle.        |
| **III. Simplicity & YAGNI**     | ✅ PASS | No real-time sync, no conflict resolution UI, no resumable uploads. Multipart only; assets deferred.                    |
| **IV. No User Data On Servers** | ✅ PASS | All vault data goes directly to the user's own Drive. No backend proxy.                                                 |
| **VIII. Dependency Injection**  | ✅ PASS | `GDriveBackend` is injectable into `SyncService`. `GDriveAuthService` is injectable into `GDriveBackend`.               |
| **X. Coverage Goals**           | ✅ PASS | Target 80% coverage for `GDriveBackend` (scan/upload/download/delete/connect paths including error branches).           |

## Project Structure

### Documentation (this feature)

```text
specs/096-gdrive-cloud-sync/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Architecture decisions and rationale
├── data-model.md        # Data entities and validation rules
├── contracts/
│   └── IGDriveBackend.md  # TypeScript interface + behavioural contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase-by-phase task list
```

### Source Code

```text
packages/
└── sync-engine/
    └── src/
        ├── GDriveBackend.ts       # Implements ISyncBackend against Drive REST v3
        ├── events.ts              # SYNC:DRIVE_* event declarations (module augmentation)
        └── index.ts               # Re-export GDriveBackend and DriveError

apps/web/src/lib/
├── services/
│   └── gdrive-auth.ts             # GDriveAuthService — GIS token management
└── stores/vault/
    └── sync-store.svelte.ts       # Wire Drive sync into save/load/switch paths

apps/web/src/lib/components/settings/
└── DriveSettings.svelte           # Connect / disconnect Drive UI (vault settings)
```

### Tests

```text
packages/sync-engine/
└── tests/
    └── unit/
        └── GDriveBackend.test.ts  # Unit tests with mocked fetch

apps/web/src/
└── tests/
    └── gdrive-auth.test.ts        # Unit tests with mocked GIS

apps/web/tests/e2e/
└── gdrive-sync.test.ts            # E2e: connect → save → reload (stubbed Drive API)
```

## Phase Breakdown

### Phase 1: GDriveBackend + Auth

**Goal**: A fully-tested backend that can scan, upload, download, and delete Drive files, paired with an auth service that silently refreshes tokens.

- Define `DriveError`, `GDriveAuthService` interface, and `GDriveBackend` class.
- Implement `connect()`, `scan()`, `upload()`, `download()`, `delete()` against Drive REST v3.
- Declare `SYNC:DRIVE_*` events in `packages/sync-engine/src/events.ts`.
- Unit tests: happy paths, 401 refresh, 404 reconnect prompt, 500 retry, network failure.

**Exit criteria**: `npm test` in `packages/sync-engine` passes with ≥80% coverage on `GDriveBackend.ts`.

### Phase 2: Wire into Save/Load/Switch

**Goal**: When a Drive folder is connected, every vault save pushes to Drive and every load pulls from Drive.

- Extend `SyncCoordinator` (or `sync-store.svelte.ts`) to accept an optional `IDriveBackend` alongside the existing `ISyncBackend`.
- On save: after local `FileSystemBackend` sync, run `SyncService` with `GDriveBackend` as `fsBackend` and `OpfsBackend` as `opfsBackend`, direction `push`.
- On load/switch: if Drive folder is connected, run `SyncService` direction `pull` before loading from OPFS.
- Persist `remoteFolderId` to `cloud_sync_metadata` on first connect. Load on init.
- Emit `SYNC:DRIVE_SYNC_COMPLETE` / `SYNC:DRIVE_SYNC_FAILED` events.
- Drive failures must not block local operations (try/catch, notify user).

**Exit criteria**: Manual test: connect Drive, save an entity, delete it locally, reload vault — entity reappears from Drive.

### Phase 3: UI — Connect / Status / Disconnect

**Goal**: The user can connect, check status, and disconnect Drive from vault settings without developer tooling.

- `DriveSettings.svelte` component in vault settings:
  - "Connect to Google Drive" button → triggers `GDriveAuthService.getAccessToken()` → auto-creates folder → saves `remoteFolderId`.
  - Connected state: shows folder name, last sync time, "Disconnect" button.
  - Disconnected/failed state: shows error and "Reconnect" button.
  - "Supply existing folder ID" text input for co-host scenario.
- Status indicator in sidebar or toolbar: cloud icon with sync/error/idle states.
- Offline guard: Drive UI hidden/disabled when `navigator.onLine` is false.
- Demo/guest mode guard: Drive section hidden.

**Exit criteria**: Full connect-save-reload flow works end-to-end in the browser without console errors. E2e test passes with stubbed Drive API.

## Risk Register

| Risk                                             | Likelihood | Impact | Mitigation                                                                     |
| :----------------------------------------------- | :--------- | :----- | :----------------------------------------------------------------------------- |
| OAuth popup blocked by browser                   | Medium     | High   | Require a click event to trigger `requestAccessToken`. No silent auto-pop.     |
| `drive.file` scope can't discover shared folders | High       | Medium | Document manual folder ID entry. Surface prominently in UI.                    |
| Token expires during multi-file upload           | Medium     | Medium | Re-try with refreshed token on 401; rollback partial upload if retry fails.    |
| Drive folder deleted between sessions            | Low        | Medium | 404 on `connect()` → prompt "Reconnect Drive" rather than silent failure.      |
| Duplicate files from race condition              | Low        | High   | Store Drive file ID in `SyncEntry.remoteId` after first upload; always PATCH.  |
| Two tabs uploading simultaneously                | Low        | High   | `BroadcastChannel` tab guard — second tab skips Drive sync if first is active. |
