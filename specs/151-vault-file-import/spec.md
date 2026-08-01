# Feature Specification: Import Files from Another Vault

**Feature Branch**: `151-vault-file-import`
**Created**: 2026-08-01
**Status**: Draft
**Input**: User description: "Select files (entities) directly from another existing vault and copy them into the currently active vault, while both are accessible in the browser via OPFS — no ZIP backup round-trip. The user picks a source vault from the existing vault list, browses/selects specific files (entities) within it, reviews the selection (added vs. path conflicts with the current vault, same safety rules as before: never overwrite existing target files), and confirms. If a selected file references an image asset, the referenced image (and its thumbnail) must be copied alongside it into the target vault's images directory. After a successful copy, the target vault's entity index must be rebuilt so the new files are queryable immediately."

**Supersedes**: This specification replaces the original plan for this feature (previously tracked as `1826-vault-file-import`), which assumed import via a `.codex.zip` portable backup round-trip. That approach is no longer the design; files are now selected directly from another vault already known to the browser, with no export/download/re-upload step.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Bring Specific Files In From Another Vault (Priority: P1)

As a campaign creator with more than one vault in this browser, I can pick another vault I already have, choose specific files from it, and add just those files to my current vault without leaving it or switching vaults.

**Why this priority**: This is the core requested workflow — combining material from separate campaigns without a manual export/import detour.

**Independent Test**: With two vaults present, open the import picker, choose a source vault, select one or more of its files, confirm, and verify those files now exist in the current vault while the current vault stays active and its existing files are untouched.

**Acceptance Scenarios**:

1. **Given** at least one other vault exists in this browser, **When** the user opens the "import from another vault" picker, **Then** they see a list of the other available vaults to choose as the source.
2. **Given** a source vault is chosen, **When** the picker loads, **Then** the user sees the source vault's files and can select one, several, or all of them.
3. **Given** one or more files are selected, **When** the user reviews and confirms the import, **Then** the selected files are added to the current vault, the current vault remains active, and the newly added files are immediately visible/searchable.
4. **Given** the user is partway through selecting files, **When** they cancel before confirming, **Then** no files are changed in the current vault.

---

### User Story 2 - Avoid Overwriting Existing Work (Priority: P1)

As a campaign creator, I can see which of my selected files conflict with files already in my current vault, so pulling material from another vault can never silently replace my work.

**Why this priority**: Protecting the target vault is essential whenever content from a separately edited vault is being combined in.

**Independent Test**: Select a mix of files where some paths already exist in the current vault and some don't; confirm the import; verify only the non-conflicting files were added and every existing target file is byte-for-byte unchanged.

**Acceptance Scenarios**:

1. **Given** a selection containing paths already present in the current vault, **When** the user reaches the review step, **Then** it reports how many selected files will be added and how many will be skipped for conflicting.
2. **Given** a confirmed import with conflicts, **When** the import finishes, **Then** conflicting files are skipped and no existing target file is overwritten.
3. **Given** a selection where every file conflicts, **When** the user reviews it, **Then** the import action is unavailable and the user is told there is nothing new to add.

---

### User Story 3 - Bring Images Along With Their Files (Priority: P1)

As a campaign creator, when I import a file that has an attached image, the image comes with it automatically, so the imported content isn't left with a broken or missing picture.

**Why this priority**: A file that references an image it can no longer show is a broken import, not a successful one — this is core to the feature being trustworthy, not a nice-to-have.

**Independent Test**: Select a file known to reference an image in the source vault, confirm the import, and verify the image (and its thumbnail, if one exists) is now present in the current vault and the imported file displays it correctly.

**Acceptance Scenarios**:

1. **Given** a selected file references one or more images in the source vault, **When** the import is confirmed, **Then** those images (and any thumbnails) are copied into the current vault alongside the file.
2. **Given** an image that the import would add already exists at the same path in the current vault, **When** the import runs, **Then** the existing image is treated the same as any other conflicting file (skipped, not overwritten) and the text file is still imported.
3. **Given** a selected file's referenced image cannot be found in the source vault, **When** the import runs, **Then** the file itself still imports and the missing image is reported rather than silently ignored or blocking the entire import.

---

### User Story 4 - Recover from Unavailable or Failed Sources (Priority: P2)

As a campaign creator, I receive a clear explanation when a source vault or selected file can't be read, and my current vault remains intact.

**Why this priority**: Vault storage can be mid-migration, deleted, or briefly locked; failures need to be visible rather than silent.

**Independent Test**: Attempt an import where the source vault cannot be opened (or a write fails partway through) and verify the user gets a clear message and no partial, misleading success is reported.

**Acceptance Scenarios**:

1. **Given** a source vault that fails to open, **When** the user picks it, **Then** the system explains the vault could not be read and no import proceeds.
2. **Given** a write fails partway through a confirmed import, **When** the operation ends, **Then** the outcome reports exactly what was and wasn't added, and no existing target file was touched.

### Edge Cases

- The current vault is unavailable, read-only, or still initializing when the user opens the picker: the import action is blocked with a clear message.
- The source vault list has only the current vault (no other vaults exist): the import entry point communicates there's nothing to import from.
- The user selects zero files: the confirm action is unavailable.
- The same source file is referenced by images no other selected file uses, and vice versa: each selected file's images are resolved independently so no needed image is skipped.
- A very large source vault (many files): browsing and selecting remains responsive; the review step summarizes rather than lists every file when the count is large.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST let the user open an "import from another vault" flow from within the current vault, without switching the active vault.
- **FR-002**: The system MUST present a list of other vaults available in this browser as candidate sources.
- **FR-003**: The system MUST let the user browse the chosen source vault's files and select any subset of them (individually, or all at once).
- **FR-004**: The system MUST show, before any write happens, how many selected files will be added and how many conflict with the current vault's existing paths.
- **FR-005**: The system MUST require an explicit confirmation before adding anything to the current vault.
- **FR-006**: The system MUST add only files whose paths do not already exist in the current vault.
- **FR-007**: The system MUST never overwrite, delete, or modify an existing current-vault file during this flow.
- **FR-008**: The system MUST identify image assets referenced by a selected file and include them in the import automatically, without requiring the user to select images separately.
- **FR-009**: The system MUST copy an image's thumbnail alongside its full image when both exist in the source vault.
- **FR-010**: The system MUST treat an image path conflict the same as a file path conflict (skip, don't overwrite) without blocking the rest of the import.
- **FR-011**: The system MUST still import a selected file whose referenced image cannot be found in the source vault, and MUST report that image as missing rather than failing silently.
- **FR-012**: The system MUST keep the current vault active throughout and after the import, and MUST report added, skipped, and missing-image counts on completion.
- **FR-013**: The system MUST make newly imported files immediately visible and queryable in the current vault (e.g. in search, lists, and graph views) without requiring a manual refresh or vault reload.
- **FR-014**: The system MUST clearly report when a source vault cannot be opened or a write fails partway through, without claiming a false success.
- **FR-015**: The system MUST prevent starting a new current-vault import while one is already in progress, and MUST let the user cancel before confirmation.
- **FR-016**: The system MUST include user-facing help explaining that this flow copies only new files (and their images) from another vault, skips path conflicts, and does not merge or replace existing files.

### Key Entities _(include if feature involves data)_

- **Source vault**: Another vault already known to this browser, distinct from the currently active vault, whose files can be browsed and selected without making it active.
- **Selected file**: A file the user has chosen from the source vault to import, along with any image assets it references.
- **Current vault import plan**: The proposed set of files and their associated images to add, the set that conflicts with the current vault, and the user's confirmation state for a given source vault and selection.
- **File conflict**: A source file or image whose relative path already exists in the current vault; it is reported and skipped rather than replaced.
- **Missing image reference**: A file whose referenced image could not be located in the source vault at import time.

## Assumptions

- "Another existing vault" means any vault already registered to this browser profile other than the current one; the flow does not fetch or import vaults from other devices, accounts, or files.
- This release is a safe additive import, not a content-aware entity merge: it preserves existing target files and skips identical-path conflicts, matching the existing portable-backup import's conflict philosophy.
- Users import into their currently selected local vault; guest and demo sessions cannot use this flow, consistent with existing vault-management restrictions.
- The existing "restore a portable backup as a new vault" action is unaffected and remains available as a separate, distinct workflow from this one.
- Image thumbnails are optional per image; when a thumbnail doesn't exist for a copied image, only the full image is copied.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can select and import 20 files (with associated images) from another vault into the current vault in under two minutes, excluding time spent browsing/choosing files.
- **SC-002**: In validation tests containing conflicting paths, 100% of pre-existing target files (and images) remain unchanged after the import.
- **SC-003**: In validation tests where a selected file references an image, 100% of imports that succeed also include that file's image (or an explicit missing-image report if the image is absent from the source).
- **SC-004**: Imported files are queryable (appear in search/list/graph views) within the same session immediately after import completes, with no manual reload step.
- **SC-005**: Users can distinguish added files from skipped conflicts and missing images from the review and completion messages without opening another screen.
