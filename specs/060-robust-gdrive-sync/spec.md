# Feature Specification: Robust GDrive Sync

**Feature Branch**: `060-robust-gdrive-sync`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "more robust gdrive sync https://github.com/eserlan/Codex-Cryptica/issues/262"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Fault-Tolerant Cloud Synchronization (Priority: P1)

As a user, I want my campaign data to sync reliably with cloud storage even when my internet connection is spotty or when my session expires, so I don't lose progress or see "Sync Failed" errors constantly.

**Why this priority**: Core reliability. Users rely on cloud storage for cross-device access; if it's brittle, the app becomes untrustworthy for long-term lore building.

**Independent Test**: Simulate a network disconnection during a synchronization operation, then reconnect and verify that the sync resumes and completes correctly without duplicating or corrupting data.

**Acceptance Scenarios**:

1. **Given** an active cloud synchronization, **When** the network is lost mid-transfer, **Then** the system queues the operation and retries automatically when connectivity returns.
2. **Given** an expired authentication session, **When** a sync is triggered, **Then** the system transparently refreshes the access (if possible) or prompts the user to re-authenticate without losing current changes.
3. **Given** service rate-limit errors, **When** syncing many files, **Then** the system implements exponential backoff to complete the task successfully.

---

### User Story 2 - Cross-Device Parity (Priority: P1)

As a user, I want to work on my campaign on my laptop and then see those changes immediately on my tablet when I open the app, ensuring the cloud storage acts as a single source of truth.

**Why this priority**: Cross-device usage is a primary reason for cloud sync.

**Independent Test**: Update an entity on Device A, wait for sync to the cloud, then open Device B and verify the entity is updated automatically (or upon manual sync) with the same content.

**Acceptance Scenarios**:

1. **Given** a newer version of a file exists in the cloud (modified by another device), **When** the app performs a sync check, **Then** it pulls the newer version into the local workspace.
2. **Given** a file was deleted in the cloud, **When** the app syncs, **Then** the corresponding local entity is removed (or moved to a 'deleted' state).

---

### User Story 3 - Smart Differential Sync & Conflict Handling (Priority: P2)

As a user, I want the sync process to be fast and handle "dirty" files (modified in both places) safely using a predictable strategy.

**Why this priority**: Performance and data integrity.

**Independent Test**: Modify the same file on two devices before either has synced, then verify the conflict resolution logic (e.g., newest timestamp wins) is applied.

**Acceptance Scenarios**:

1. **Given** a vault with 1000 files, **When** only 2 files are changed, **Then** the sync process only transfers those 2 files, avoiding a full re-upload/download.
2. **Given** a conflict where a file was modified locally and in the cloud since the last sync, **When** sync occurs, **Then** the version with the most recent modification time is automatically kept ("Newest Wins").

---

### Edge Cases

- **Cloud Folder Missing**: What if the user deletes the storage folder in the cloud manually? (Assumed: System prompts user to re-link or re-create the folder).
- **Storage Quota Full**: What happens if the user's cloud storage is full? (Assumed: System displays a clear "Storage Full" warning and pauses sync).
- **Binary vs Text**: How are images handled if they are large? (Assumed: Standard cloud upload/download; large files may have progress bars).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST expand the existing `sync-engine` to support cloud backends, reusing the `DiffAlgorithm` and `SyncRegistry` established for local sync.
- **FR-002**: System MUST maintain a local registry mapping cloud file identifiers to local workspace paths and content fingerprints, consistent with the `SyncEntry` schema.
- **FR-003**: System MUST use efficient change detection (via cloud "changes" feeds or metadata comparison) to identify files needing sync, avoiding unnecessary data transfer.
- **FR-004**: System MUST implement automatic retry logic with progressive delays for transient network and service errors.
- **FR-005**: System MUST handle authentication refresh flows silently in the background when possible.
- **FR-006**: System MUST perform a bidirectional synchronization (Push local changes, Pull remote changes), using the "Newest Wins" conflict resolution strategy.
- **FR-007**: System MUST provide a synchronization dashboard or status indicator showing progress and any errors.
- **FR-008**: System MUST support syncing subdirectories and non-text assets (e.g., images).

### Key Entities

- **Sync Registry Record**: Tracks metadata for synchronized files (Identifiers, paths, fingerprints, modification times), shared across sync types.
- **Cloud Connector (Backend)**: The implementation-specific service managing cloud communication (e.g., Google Drive API).
- **Generalized Sync Service**: Orchestrates the sync cycle using a specific backend and the core `DiffAlgorithm`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Synchronization success rate remains above 99% even in unstable network conditions.
- **SC-002**: Time to detect and start syncing a single file change is under 5 seconds after manual trigger or auto-save.
- **SC-003**: Zero data loss (no files truncated or overwritten by older versions) across 100 simulated conflict scenarios.
- **SC-004**: User is notified within 10 seconds if manual intervention (like re-authentication) is required.

## Assumptions

- **AS-001**: The user has a valid cloud storage account with sufficient space.
- **AS-002**: "Newest wins" is the default conflict resolution strategy unless otherwise specified.
- **AS-003**: The app uses standard cloud storage APIs.
