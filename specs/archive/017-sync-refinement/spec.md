# Feature Specification: Sync Refinement & Deletion Support

**Feature Branch**: `017-sync-refinement`  
**Created**: 2026-01-29  
**Status**: Draft  
**Input**: User description: "syncing is still not good"

## User Scenarios & Testing (mandatory)

### User Story 1 - Local Deletion Propagation (Priority: P1)

As a user, I want to delete a file in my local vault and have it automatically deleted from Google Drive during the next sync, so that my cloud backup stays clean and synchronized.

**Why this priority**: Preventing "zombie files" (deleted files returning on next sync) is critical for a functional sync experience.

**Independent Test**: Delete a local file, run sync, and verify the file is gone from the remote adapter (or Drive).

**Acceptance Scenarios**:

1. **Given** a file `note.md` exists locally and on Drive, **When** I delete it locally and run Sync, **Then** it should be deleted from Drive.
2. **Given** a file was deleted locally, **When** Sync runs, **Then** it should NOT be re-downloaded to the local device.

---

### User Story 2 - UI Refresh After Sync (Priority: P1)

As a user, I want the application UI (Graph and Vault) to automatically update when remote changes are downloaded, so that I can see my colleagues' or my own multi-device changes immediately.

**Why this priority**: Real-time feel and data consistency. Without this, sync feels broken even if the files were actually updated.

**Independent Test**: Manually simulate a remote download in the worker and verify `vault.refresh()` or similar is triggered in the main thread.

**Acceptance Scenarios**:

1. **Given** a sync completes with 1 download, **When** the message reaches the main thread, **Then** the Knowledge Graph should re-render with new data.

---

### User Story 3 - Detailed Sync Progress (Priority: P2)

As a user, I want to see how many files are currently being uploaded or downloaded during a sync session, so that I have confidence the system is working.

**Why this priority**: Improves transparency and user trust in the sync process.

**Independent Test**: Check `syncStats` store during a long sync and verify counters increment.

**Acceptance Scenarios**:

1. **Given** a sync is in progress, **When** a file is uploaded, **Then** `filesUploaded` should increment in the UI.

---

### User Story 4 - Remote Deduplication (Priority: P1)

As a user, I want the system to automatically handle duplicate files on Google Drive that share the same vault path, so that my cloud storage doesn't become cluttered and my sync remains predictable.

**Why this priority**: Directly addresses the observed issue of multiple copies of the same image/file appearing on Drive.

**Independent Test**: Manually create two files on Drive with the same `vault_path` app property, run sync, and verify only the newest one remains.

**Acceptance Scenarios**:

1. **Given** multiple remote files share the same `appProperties.vault_path`, **When** Sync runs, **Then** the engine should identify the newest version, keep it, and mark others for deletion/cleanup.

---

### User Story 5 - High-Fidelity Image Synchronization (Priority: P1)

As a user, I want my generated and attached images to be synced to Google Drive as actual image files (e.g., `.png`, `.jpg`) with their metadata preserved, so that they are correctly displayed across all my devices and appear as viewable images in the Google Drive UI.

**Why this priority**: Directly addresses the "not uploaded AS images" issue. Images are core to the application's worldbuilding value.

**Independent Test**: Upload an image via sync, open Google Drive in a browser, and verify the file is recognized as an image (previewable) and contains the correct `vault_path` metadata.

**Acceptance Scenarios**:

1. **Given** a new image `portrait.png` exists in the local `images/` directory, **When** Sync runs, **Then** it should be uploaded to Drive with `Content-Type: image/png`.
2. **Given** an image is synced, **When** I view it on another device, **Then** the binary content should be identical (no corruption) and the graph should display it immediately.

---

### Edge Cases

- **Concurrent Deletes**: What if a file is deleted locally but modified remotely? (Decision: Deletion wins if local timestamp is newer than metadata BASE).
- **Network Interruptions**: If sync is interrupted, metadata should remain in a consistent state.
- **Large Vaults**: Scanning 1000+ files should remain performant (utilize the existing chunking where possible).

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: System MUST track "last seen" state in `MetadataStore` to identify local deletions.
- **FR-002**: System MUST propagate local deletions to the remote cloud provider.
- **FR-003**: System MUST trigger a global vault refresh in the main thread when remote updates are downloaded.
- **FR-004**: System MUST emit incremental progress events from the Sync Worker.
- **FR-005**: System MUST NOT automatically delete local user files based on remote state in this iteration (Protects Local Sovereignty).
- **FR-006**: System MUST use `multipart/related` for GDrive uploads to ensure metadata (`vault_path`) and binary content are correctly processed.
- **FR-007**: System MUST automatically identify and merge/delete duplicate files on Google Drive that share the same `vault_path`.
- **FR-008**: System MUST ensure correct MIME types are applied during upload (e.g., `image/png` for images).

### Key Entities (include if feature involves data)

- **SyncMetadata**: (Updated) Include `deleted` flag or rely on absence in scan vs presence in metadata.
- **ProgressEvent**: Payload containing `type`, `current`, `total`.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: Deleted local files are removed from Drive within 1 sync cycle.
- **SC-002**: The UI refreshes within 500ms of a successful download completion.
- **SC-003**: User sees real-time increments of sync counters in the Settings/Status menu.
