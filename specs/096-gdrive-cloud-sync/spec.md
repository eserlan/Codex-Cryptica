# Feature Specification: Google Drive Cloud Sync

**Feature Branch**: `096-gdrive-cloud-sync`
**Created**: 2026-04-28
**Status**: Implemented
**Input**: User description: "Restore Google Drive integration so vaults can be saved to and loaded from the user's own Google Drive, mirroring the existing local folder save/load model."

## Clarifications

### Session 2026-04-28

- Q: Where is user data stored? → A: Exclusively in the user's own Google Drive. Project servers never receive or store vault data.
- Q: How does Drive fit into the existing save model? → A: When a Drive folder is connected, every save/load/switch that touches the local folder also mirrors to Drive. OPFS remains the master. Drive is a push/pull mirror, identical to the local folder backend.
- Q: How does the app discover Drive files across sessions/devices? → A: The app uses the `drive.file` OAuth scope, which limits visibility to files the app itself created. The Drive folder ID for each vault is persisted in IndexedDB so the app can reconnect across page reloads and devices.
- Q: Is real-time background polling required? → A: No. Sync happens at the same moments as local folder sync: on explicit save, on load, and on vault switch. No background polling or webhooks.
- Q: How are conflicts handled? → A: OPFS is the single source of truth. The same OPFS-master directional model used for local folder sync applies — Drive receives pushes or provides pulls but never "wins" a conflict against OPFS.
- Q: What happens when the OAuth token expires mid-session? → A: The service silently refreshes via Google Identity Services. If refresh fails, it notifies the user and pauses Drive sync without interrupting local-only operation.

## User Scenarios & Testing

### User Story 1 - Cloud Backup (Priority: P1)

As a campaign organiser, I want my vault to automatically back up to my Google Drive whenever I save, so that my work is safe even if my local device is lost or fails.

**Why this priority**: The single most-requested feature. Provides disaster recovery without requiring technical knowledge of manual backups.

**Independent Test**: Can be tested by connecting a Drive folder, saving an entity change, then verifying the updated entity JSON file appears in the Drive folder via the Drive API.

**Acceptance Scenarios**:

1. **Given** a vault with a connected Drive folder, **When** the user saves a change, **Then** the changed entity file is uploaded to the Drive folder within the same save operation.
2. **Given** a vault with a connected Drive folder and an active internet connection, **When** the Drive upload fails, **Then** the save still completes locally, an error notification is shown, and no data is lost.
3. **Given** no connected Drive folder, **When** the user saves, **Then** only local sync runs and Drive is not mentioned.

---

### User Story 2 - Cross-Device Continuation (Priority: P1)

As a campaign organiser who works on multiple computers, I want to open my Drive-backed vault on a different device and load the latest content, so that I can seamlessly continue where I left off.

**Why this priority**: Equal priority to backup — enables the cloud-first workflow the feature is designed to support.

**Independent Test**: Can be tested by uploading a vault to Drive from device A, then connecting the same Drive folder on device B and verifying the entity list matches.

**Acceptance Scenarios**:

1. **Given** a vault backed up to Drive from another device, **When** the user opens the vault on a new device and connects the Drive folder, **Then** a "Pull from Drive" action downloads all entity files and updates the local vault.
2. **Given** a connected Drive folder, **When** the user switches vaults, **Then** the Drive connection for the new vault (if set) is loaded from IndexedDB and ready without re-authentication.

---

### User Story 3 - Multi-Host Collaboration (Priority: P2)

As a game master, I want to share my Drive folder with a co-host so they can load the same campaign, so that we can divide worldbuilding duties without emailing JSON files back and forth.

**Why this priority**: Important but derivative — it relies on Google Drive's own folder-sharing mechanism. The app does not manage collaboration permissions.

**Independent Test**: Can be tested by sharing a Drive folder with a second Google account, connecting from that account using the folder ID, and verifying the vault loads correctly.

**Acceptance Scenarios**:

1. **Given** a user shares a Drive folder manually via Google Drive, **When** a collaborator enters the folder ID in the connect dialog, **Then** the collaborator can pull the vault content into their local instance.
2. **Given** two users both have write access to a shared Drive folder, **When** both save changes independently, **Then** each local vault receives the other's changes on the next pull; conflicts are surfaced as standard "OPFS wins" merges.

---

### Edge Cases

- **Token Expiry Mid-Sync**: Access token expires while a multi-file upload is in progress. The operation should retry with a refreshed token; if refresh fails, the partial upload is rolled back and the error is surfaced.
- **First-Time Auth Popup Blocked**: Browser blocks the OAuth popup. The UI should surface a "Grant Drive access" button that the user must click, not rely on a silent popup.
- **Folder Deleted from Drive**: The stored folder ID no longer exists. On next sync attempt the error should trigger a "re-connect Drive" prompt rather than silently failing.
- **Scope Limitation**: `drive.file` scope does not allow discovering folders created by other apps. Users must supply a folder ID when connecting a folder not created by this app (e.g., a folder shared by a co-host).
- **Large Vaults**: Vaults with hundreds of entity files should use batch API calls where possible, and upload progress should be streamed to the existing progress indicator.
- **Offline Mode**: When the browser is offline, Drive sync is silently skipped. The vault continues to operate locally. A sync-needed badge appears when connectivity is restored.
- **Multiple Open Tabs**: Two tabs should not attempt a Drive sync simultaneously. A lightweight tab-local lock prevents double-upload.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST support connecting a Google Drive folder to a vault, storing the association in local IndexedDB so it persists across sessions and devices.
- **FR-002**: When a Drive folder is connected, the user MUST be able to manually push changed entity files to Drive via a dedicated action.
- **FR-003**: When a Drive folder is connected, the user MUST be able to manually pull entity files from Drive via a dedicated action.
- **FR-004**: The system MUST use the `drive.file` OAuth scope so that the app only accesses files it created, and the user's other Drive content is never visible to the app.
- **FR-005**: The system MUST silently refresh the OAuth access token using Google Identity Services without requiring the user to re-authenticate, unless the refresh fails.
- **FR-006**: When Drive sync fails at any point, the local-only operation MUST still succeed. Drive failures MUST NOT block local reads or writes.
- **FR-007**: The user MUST be able to disconnect the Drive integration from vault settings, which removes the folder association from IndexedDB without deleting data from Drive or OPFS.
- **FR-008**: The system MUST emit directional app events (`SYNC:DRIVE_CONNECTED`, `SYNC:DRIVE_PUSH_COMPLETE`, `SYNC:DRIVE_PULL_COMPLETE`, `SYNC:DRIVE_SYNC_FAILED`) so other components can react without coupling to the Drive service directly.
- **FR-009**: The system MUST auto-create a `CodexCryptica/{vaultName}` folder hierarchy in Drive on first connect if no existing folder is supplied.
- **FR-010**: The system MUST allow a user to supply an existing Drive folder ID (e.g., one shared by a co-host) instead of auto-creating a new folder.

### Non-Functional Requirements

- **NFR-001**: Drive uploads and downloads MUST NOT block the UI thread. All API interactions MUST be asynchronous. Processing of large vaults (>100 entities) SHOULD be profiled to ensure main-thread scripting time remains below 50ms per frame.
- **NFR-002**: Auth token MUST be kept in memory only; it MUST NOT be written to `localStorage` or IndexedDB.
- **NFR-003**: The feature MUST be disabled/hidden when the app is in Guest/Demo mode.
- **NFR-004**: The feature MUST be disabled when `navigator.onLine` is `false`, with no error thrown.

## Success Criteria

- **SC-001**: A user can complete the full connect-save-reload cycle from a fresh page load with no manual token management.
- **SC-002**: An entity change saved locally in one browser session is retrievable from Drive in a new session (after a pull) within 5 seconds of saving.
- **SC-003**: A Drive sync failure does not prevent local vault operations from completing.
- **SC-004**: Connecting a Drive folder requires at most two user actions: clicking "Connect Drive" and approving the Google OAuth consent screen.
- **SC-005**: Zero vault data is transmitted to, stored by, or processed by project infrastructure.

## Out of Scope

- Real-time collaborative editing (simultaneous multi-user write merging).
- Drive-to-Drive migration between Google accounts.
- Selective entity-level sync (always syncs the entire vault).
- Automated conflict resolution beyond "OPFS wins".
- Push notifications or webhooks from Drive.
- Support for Google Workspace Shared Drives.
