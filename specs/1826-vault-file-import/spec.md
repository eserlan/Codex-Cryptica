# Feature Specification: Import Vault Files into Current Vault

**Feature Branch**: `1826-vault-file-import`  
**Created**: 2026-08-01  
**Status**: Draft  
**Input**: User description: "Import Codex Cryptica vault files from another vault into the current vault by drag and drop, with safe review before writing."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Add a Backup to the Current Vault (Priority: P1)

As a campaign creator, I can drag a Codex Cryptica portable backup from another vault onto the current vault's import area, review its contents, and add its safe-to-import files without leaving my current vault.

**Why this priority**: This is the requested workflow and lets users combine campaign material without recreating or switching vaults.

**Independent Test**: Drop a valid backup containing new files into a populated vault, approve the import, and verify that all source files are available in the current vault while its existing files remain unchanged.

**Acceptance Scenarios**:

1. **Given** an active editable vault and a valid Codex Cryptica portable backup containing files not in that vault, **When** the user drops the backup onto the current-vault import area and confirms the review, **Then** the new files are added to the current vault and the user remains in that vault.
2. **Given** an active editable vault, **When** the user uses the file picker instead of dragging a valid backup, **Then** they receive the same review and import outcome.
3. **Given** a valid backup, **When** the user cancels at review, **Then** no files are changed in the current vault.

---

### User Story 2 - Avoid Overwriting Existing Work (Priority: P1)

As a campaign creator, I can see which backup files conflict with files already in my current vault, so importing material from another vault cannot silently replace my work.

**Why this priority**: Protecting the target vault is essential when combining separately edited campaigns.

**Independent Test**: Import a backup that contains both a new file and a file with the same path as a target-vault file; verify that only the new file is added and the existing file remains byte-for-byte unchanged.

**Acceptance Scenarios**:

1. **Given** a backup containing paths already present in the current vault, **When** the review is shown, **Then** it reports the number of files that will be added and the number that will be skipped for conflicts.
2. **Given** a confirmed import with conflicts, **When** the import finishes, **Then** conflicting files are skipped and no existing target file is overwritten.
3. **Given** a backup whose every file conflicts, **When** the user reviews it, **Then** the import action is unavailable and the user is told that there are no new files to add.

---

### User Story 3 - Recover from Invalid or Failed Drops (Priority: P2)

As a campaign creator, I receive a clear explanation when a dropped file is not a valid backup or cannot be read, and the current vault remains intact.

**Why this priority**: Portable backups may be damaged, incomplete, or mistaken for another type of ZIP file.

**Independent Test**: Drop an invalid backup and verify that the user receives a clear error and no target files are added or changed.

**Acceptance Scenarios**:

1. **Given** an active vault, **When** the user drops a non-Codex ZIP or a corrupted backup, **Then** the system explains that a Codex Cryptica backup is required and makes no changes.
2. **Given** a backup that fails validation, **When** the validation error is shown, **Then** the user can dismiss it and select another file without refreshing the page.

### Edge Cases

- The current vault is unavailable, read-only, or is being initialized when a file is dropped: the operation is blocked with a clear message.
- The backup has no files that are new to the current vault: the review clearly reports that nothing can be added and prevents a no-op import.
- The backup contains unsafe paths, a manifest mismatch, or an unsupported newer format: the entire operation is rejected before any target file is written.
- A write fails after import begins: the outcome reports the failure and does not claim that all files were imported. The feature must not overwrite target files in an attempt to recover.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a current-vault import area in the portable backup settings, accepting drag-and-drop and file-picker selection of Codex Cryptica portable backup files.
- **FR-002**: The system MUST validate the selected backup completely before presenting it as ready to import or writing to the current vault.
- **FR-003**: The system MUST show the source vault name and counts of files that will be added and files that conflict with the current vault before the user confirms the import.
- **FR-004**: The system MUST require an explicit confirmation before adding any file to the current vault.
- **FR-005**: The system MUST add only files whose paths do not already exist in the current vault.
- **FR-006**: The system MUST never overwrite, delete, or modify an existing current-vault file during this import flow.
- **FR-007**: The system MUST keep the current vault active after a successful import and report added and skipped file counts.
- **FR-008**: The system MUST reject unsupported, malformed, incomplete, unsafe, or newer-format backups before modifying the current vault, with a clear user-facing error.
- **FR-009**: The system MUST prevent concurrent current-vault imports and allow the user to cancel before confirmation.
- **FR-010**: The system MUST include user-facing help explaining that this flow copies only new files, skips path conflicts, and does not merge or replace existing files.

### Key Entities _(include if feature involves data)_

- **Source backup**: A user-selected Codex Cryptica portable backup, including its source vault name and validated file list.
- **Current vault import review**: The proposed addition set, conflict set, and the user confirmation state for a particular source backup and current vault.
- **File conflict**: A source file whose relative path already exists in the current vault; it is reported and skipped rather than replaced.

## Assumptions

- The source is the existing portable Codex Cryptica backup format (`.codex.zip`), which is the supported, browser-portable way to move files from another vault.
- This release is a safe additive import, not a content-aware entity merge: it preserves existing target files and skips identical-path conflicts.
- Users import into their currently selected local vault; guest and demo sessions cannot use the flow.
- Existing "Import Backup" behavior continues to restore a backup as a separate new vault.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can add a valid backup containing up to 500 new files to the current vault in under two minutes, excluding the time required to choose the file.
- **SC-002**: In validation tests containing conflicting paths, 100% of pre-existing target files remain unchanged after the import.
- **SC-003**: In validation tests of malformed, unsafe, incomplete, and newer-format backups, 100% are rejected before any current-vault file is written.
- **SC-004**: Users can distinguish added files from skipped conflicts from the review and completion messages without opening another screen.
