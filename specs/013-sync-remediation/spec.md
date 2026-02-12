# Feature Specification: Path-Aware Binary Sync Remediation

**Feature Branch**: `013-sync-remediation`  
**Created**: 2026-01-29  
**Status**: Draft  
**Input**: User description: "Path-aware binary synchronization remediation"

## User Scenarios & Testing

### User Story 1 - Binary Lore Mirroring (Priority: P1)

As a creator using images in my lore, I want my PNG/JPG visuals to sync to Google Drive without corruption so that I can see them on all my devices.

**Why this priority**: Essential for the 011-oracle-image-gen feature. Currently, binary data is corrupted by text-encoding during sync.

**Independent Test**: Upload an image to the local vault; trigger sync; verify the image in GDrive is valid; delete local image; sync back; verify the restored image opens correctly.

**Acceptance Scenarios**:

1. **Given** a valid PNG image in the local vault, **When** synced to Google Drive, **Then** the file size and checksum in GDrive must match the local original.
2. **Given** an image file on Google Drive, **When** downloaded during sync, **Then** it must be written to the local OPFS as a binary Blob without UTF-8 re-encoding.

---

### User Story 2 - Subdirectory Preservation (Priority: P1)

As a user with organized vault folders (like `/images`), I want my folder structure preserved in Google Drive so that my lore references (e.g., `./images/hero.png`) remain valid across devices.

**Why this priority**: The app currently flattens all files into the root GDrive folder, breaking relative path links in Markdown files.

**Independent Test**: Create a file in a subfolder; sync; verify it is stored with path metadata in GDrive; sync to a fresh device; verify it is restored to the correct subfolder.

**Acceptance Scenarios**:

1. **Given** a file at `images/portrait.png`, **When** uploaded, **Then** it must be associated with the relative path "images/portrait.png" in GDrive metadata.
2. **Given** a remote file with path metadata "folder/file.md", **When** downloaded, **Then** the system must ensure the "folder/" directory exists locally before writing.

---

### User Story 3 - Recursive Vault Scanning (Priority: P2)

As a power user with deeply nested lore folders, I want the sync engine to find all my files regardless of depth.

**Why this priority**: Ensures total vault coverage. Current implementation only lists files in the root folder.

**Independent Test**: Create a 3-level deep folder structure; sync; verify all files appear in GDrive.

**Acceptance Scenarios**:

1. **Given** a vault with nested directories, **When** scanning for remote changes, **Then** the system must identify files at all directory levels.

---

### Edge Cases

- **Filename Collisions**: What if two files have the same name in different folders? The system must use full relative paths as keys.
- **Deep Directory Creation**: Handling `getDirectoryHandle` recursively for missing local folders during download.
- **MimeType Detection**: Correctly identifying `image/png` vs `text/markdown` vs `application/octet-stream`.

## Requirements

### Functional Requirements

- **FR-001**: System MUST use `Blob` or `ArrayBuffer` for all file read/write operations in the sync pipeline.
- **FR-002**: System MUST store the relative path of each file in Google Drive `appProperties` metadata field.
- **FR-003**: System MUST use the full relative path (e.g., `images/foo.png`) as the primary key for diffing local and remote states.
- **FR-004**: System MUST scan the flat remote Google Drive folder and build a complete file map using metadata `vault_path`.
- **FR-005**: System MUST automatically create local subdirectories in OPFS when downloading files from nested remote paths.
- **FR-006**: System MUST correctly detect and set `Content-Type` headers for uploads based on file extension.

### Key Entities

- **Binary Sync Payload**: A non-stringified representation of file data (Blob).
- **Remote Path Metadata**: Persistent mapping between a GDrive File ID and its relative path in the vault.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of binary files (PNG/JPG) remain byte-identical after a round-trip sync (Local -> Cloud -> Local).
- **SC-002**: 100% of files in subdirectories are restored to their original relative locations.
- **SC-003**: Sync engine identifies 100% of files in a vault with up to 5 levels of directory nesting.
- **SC-004**: No performance degradation (>10%) compared to the current text-only sync for standard Markdown vaults.
