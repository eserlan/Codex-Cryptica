# Feature Specification: Robust Local File Syncing

**Feature Branch**: `059-robust-local-sync`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: User description: "more robust local file syncing https://github.com/eserlan/Codex-Cryptica/issues/250"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Bidirectional Smart Sync (Priority: P1)

As a user, I want to sync my local folder with the browser's internal storage (OPFS) so that my campaign data is identical in both places. I only want files that have actually changed to be copied to save time.

**Why this priority**: Core value of the feature. Without bidirectional sync, users have to manually track which files are newer and import/export them individually.

**Independent Test**: Can be tested by modifying a file locally and a different file in the app, then triggering sync and verifying both now have the latest versions.

**Acceptance Scenarios**:

1. **Given** a local folder and an OPFS vault are linked, **When** a file is updated locally and sync is triggered, **Then** the newer local file replaces the version in OPFS.
2. **Given** a local folder and an OPFS vault are linked, **When** an entity is updated in the app and sync is triggered, **Then** the newer OPFS file replaces the version in the local folder.
3. **Given** both versions of a file are identical, **When** sync is triggered, **Then** no file transfer occurs for that file.

---

### User Story 2 - Synchronization of New and Deleted Files (Priority: P2)

As a user, I want new files created in one location to appear in the other, and files deleted in one location to be removed from the other to maintain a perfect mirror.

**Why this priority**: Ensures the file structures remain consistent. Without this, the local folder and OPFS would slowly drift apart as files are added or removed.

**Independent Test**: Create a new file locally, delete an existing file in the app, trigger sync, and verify the new file exists in both and the deleted file is gone from both.

**Acceptance Scenarios**:

1. **Given** a new markdown file is added to the local folder, **When** sync is triggered, **Then** it is imported as a new entity in the app.
2. **Given** an entity is deleted in the app, **When** sync is triggered, **Then** the corresponding file is removed from the local folder.
3. **Given** a file is removed from the local folder, **When** sync is triggered, **Then** the corresponding entity is deleted in the app.

---

### User Story 3 - Conflict Resolution (Priority: P2)

As a user, I want the system to handle situations where the same file was modified in both the app and the local folder since the last sync.

**Why this priority**: Critical for data integrity. Prevents accidental overwrites of valuable work.

**Independent Test**: Modify the same entity in the app and its corresponding file locally, then trigger sync and verify the system follows the conflict resolution policy.

**Acceptance Scenarios**:

1. **Given** a file has been modified in both locations since the last sync, **When** sync is triggered, **Then** the system automatically applies the "newest version wins" policy, keeping the version with the most recent timestamp.

---

### Edge Cases

- **System Clock Skew**: How does the system handle small discrepancies (e.g. < 2 seconds) between the browser's clock and the local filesystem's clock? (Assumed: Use a 2s skew tolerance).
- **Interrupted Transfer**: What happens if the browser is closed or the folder permission is revoked during a large sync? (Assumed: Next sync will resume based on timestamps and metadata).
- **Invalid Markdown**: How does the system handle files that are modified locally but contain invalid YAML or formatting? (Assumed: A file MUST have a valid YAML header containing at least an 'id' or 'title' to be synced as an entity. Files failing this are reported as 'Skipped (Invalid Format)' in the sync summary).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST perform a bidirectional scan of the linked local folder and the active OPFS vault.
- **FR-002**: System MUST compare files based on `lastModified` timestamps and file size.
- **FR-003**: System MUST identify "dirty" files (those modified in only one location since last sync) and transfer them to the other location.
- **FR-004**: System MUST automatically resolve conflicts using a "newest timestamp wins" strategy.
- **FR-005**: System MUST support recursive syncing of subdirectories (e.g. `images/` folder).
- **FR-006**: System MUST sync file deletions bidirectionally to maintain full structure parity.
- **FR-007**: System MUST provide clear status feedback during the sync process (e.g. "Scanning...", "Syncing 5 files...", "Up to date").

### Key Entities

- **Sync Metadata**: Tracks the state of files at the time of the last successful synchronization (Path, Remote ID, Local Timestamp, Remote Timestamp, Hash).
- **Vault Entity**: The markdown representation of a campaign node, including frontmatter and content.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of files with newer timestamps in one location are successfully mirrored to the other after a sync cycle.
- **SC-002**: Syncing a vault with 500 files and 1 change takes less than 2 seconds (excluding user interaction time).
- **SC-003**: Zero "lost updates" (cases where work is overwritten by an older version) occur during a standard sync cycle.
- **SC-004**: Users receive a clear summary of changes made after each sync (e.g. "2 files updated, 1 new file added").
