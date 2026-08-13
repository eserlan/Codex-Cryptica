# Feature Specification: Import Files from the File System

**Feature Branch**: `151-vault-file-import`
**Created**: 2026-08-01
**Status**: Draft
**Input**: User description: "Select files (entities) directly from another existing vault and copy them into the currently active vault... If a selected file references an image asset, the referenced image (and its thumbnail) must be copied alongside it... After a successful copy, the target vault's entity index must be rebuilt." Refined: the source is the user's own file system (a saved/exported vault folder on disk), not an in-app list of other browser vaults — the user selects files via native drag-and-drop or the traditional file upload dialog, choosing exactly which files to bring in. Since dropped/uploaded files carry no folder path the app can follow on its own, a selected file's referenced image is included automatically only when it was part of the same drop/selection (including a dropped folder); when a needed image is missing from what was provided, the user is prompted to either add the image file directly or grant access to the source vault's folder so it can be resolved from there.

**Supersedes**: This specification replaces the original plan for this feature (previously tracked as `1826-vault-file-import`), which assumed import via a `.codex.zip` portable backup round-trip. It also replaces an intermediate in-app "pick another vault from a list, browse it in-app" design, which is not how a browser can access a vault living outside the app's own storage. The source is the user's real file system: drag-and-drop or the OS file picker, selecting individual files (or a folder) directly.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Bring Specific Files In From My File System (Priority: P1)

As a campaign creator, I can drag files from a vault folder on my computer (or use a standard file picker) and drop just the files I want into my current vault, without leaving it or switching vaults.

**Why this priority**: This is the core requested workflow — pulling specific material from a vault saved on disk into the one I'm working in, using the same drag-and-drop or upload gestures people already know from every other app.

**Independent Test**: With a vault folder available on disk (e.g. one previously saved via "Load from Folder" or exported), drag a handful of its files onto the import area (or choose them via the file picker), confirm, and verify those files now exist in the current vault while it stays active and its existing files are untouched.

**Acceptance Scenarios**:

1. **Given** the current vault is open, **When** the user opens "Import Files", **Then** they see a drop area that accepts dragged files (or a folder) and a button to open the traditional file upload dialog as an alternative.
2. **Given** the user drags one or more files (or a folder) onto the drop area, or selects them via the file upload dialog, **When** the files are accepted, **Then** the user sees exactly which files were picked up before confirming anything.
3. **Given** one or more files are selected, **When** the user reviews and confirms the import, **Then** the selected files are added to the current vault, the current vault remains active, and the newly added files are immediately visible/searchable.
4. **Given** the user is partway through selecting files, **When** they cancel before confirming, **Then** no files are changed in the current vault.

---

### User Story 2 - Avoid Overwriting Existing Work (Priority: P1)

As a campaign creator, I can see which of my selected files conflict with files already in my current vault, so bringing in files from disk can never silently replace my work.

**Why this priority**: Protecting the target vault is essential whenever outside content is being combined in.

**Independent Test**: Select a mix of files where some paths already exist in the current vault and some don't; confirm the import; verify only the non-conflicting files were added and every existing target file is byte-for-byte unchanged.

**Acceptance Scenarios**:

1. **Given** a selection containing paths already present in the current vault, **When** the user reaches the review step, **Then** it reports how many selected files will be added and how many will be skipped for conflicting.
2. **Given** a confirmed import with conflicts, **When** the import finishes, **Then** conflicting files are skipped and no existing target file is overwritten.
3. **Given** a selection where every file conflicts, **When** the user reviews it, **Then** the import action is unavailable and the user is told there is nothing new to add.

---

### User Story 3 - Bring Images Along With Their Files (Priority: P1)

As a campaign creator, when I import a file that has an attached image, the image comes with it automatically whenever it was part of what I dragged or selected, so the imported content isn't left with a broken or missing picture.

**Why this priority**: A file that references an image it can no longer show is a broken import, not a successful one — this is core to the feature being trustworthy, not a nice-to-have.

**Independent Test**: Drop a folder (or the entity file plus its image file together) where one file references an image, confirm the import, and verify the image (and its thumbnail, if one exists) is now present in the current vault and the imported file displays it correctly.

**Acceptance Scenarios**:

1. **Given** the user's drop or selection includes both a file and the image(s) it references (individually, or because a containing folder was dropped), **When** the import is confirmed, **Then** those images (and any thumbnails) are copied into the current vault alongside the file.
2. **Given** an image that the import would add already exists at the same path in the current vault, **When** the import runs, **Then** the existing image is treated the same as any other conflicting file (skipped, not overwritten) and the text file is still imported.
3. **Given** a selected file references an image that was not part of the user's drop or selection, **When** the review step is reached, **Then** the user is told which image(s) are missing and is offered the choice to add the missing image file(s) directly or grant access to the source folder so the app can resolve them automatically.
4. **Given** the user grants access to the source folder to resolve missing images, **When** the referenced image(s) are found there, **Then** they are added to the import automatically; if still not found, the file still imports and the image is reported as missing.

---

### User Story 4 - Recover from Unavailable or Failed Imports (Priority: P2)

As a campaign creator, I receive a clear explanation when a dropped/selected file can't be read or an import fails partway through, and my current vault remains intact.

**Why this priority**: Files can be moved, permissions can be denied, and writes can fail; failures need to be visible rather than silent.

**Independent Test**: Attempt an import with a file that can't be read (or simulate a write failing partway through) and verify the user gets a clear message and no partial, misleading success is reported.

**Acceptance Scenarios**:

1. **Given** a dropped or selected file that can't be read, **When** the user reaches the review step, **Then** the system explains that file couldn't be read and excludes it from what will be imported, without blocking the rest of the selection.
2. **Given** a write fails partway through a confirmed import, **When** the operation ends, **Then** the outcome reports exactly what was and wasn't added, and no existing target file was touched.

### Edge Cases

- The current vault is unavailable, read-only, or still initializing when the user opens the import flow: the import action is blocked with a clear message.
- The user drags in files or a folder that aren't valid vault content (e.g. unrelated documents): non-vault files are identified and excluded from the reviewable selection rather than silently imported as-is.
- The user selects zero files, or every selected file is excluded as unreadable/invalid: the confirm action is unavailable.
- The user's browser doesn't support folder access for the missing-image fallback (e.g. Firefox, Safari): the fallback still allows adding missing image files individually, even when granting folder access isn't available.
- The same image is referenced by more than one selected file: it is only copied once, and both files end up correctly referencing it.
- A large drop (many files): browsing and reviewing the selection remains responsive; the review step summarizes rather than lists every file when the count is large.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST let the user open an "Import Files" flow from within the current vault, without switching the active vault.
- **FR-002**: The system MUST accept files via drag-and-drop (including a dropped folder) and via the traditional file upload dialog.
- **FR-003**: The system MUST show the user exactly which files were picked up from their drop or selection before any write happens.
- **FR-004**: The system MUST show, before any write happens, how many selected files will be added and how many conflict with the current vault's existing paths.
- **FR-005**: The system MUST require an explicit confirmation before adding anything to the current vault.
- **FR-006**: The system MUST add only files whose paths do not already exist in the current vault.
- **FR-007**: The system MUST never overwrite, delete, or modify an existing current-vault file during this flow.
- **FR-008**: The system MUST identify image assets referenced by a selected file and include them automatically when those images were part of the same drop or selection (e.g. included individually or via a dropped folder), without requiring the user to pick images separately in that case.
- **FR-009**: The system MUST copy an image's thumbnail alongside its full image when both were provided.
- **FR-010**: The system MUST treat an image path conflict the same as a file path conflict (skip, don't overwrite) without blocking the rest of the import.
- **FR-011**: When a selected file references an image that was not part of the user's drop or selection, the system MUST tell the user which image(s) are missing and offer to either add the missing image file(s) directly or grant access to the source folder to resolve them automatically.
- **FR-012**: When the user grants folder access to resolve missing images, the system MUST locate and include any of the reported missing images found in that folder, and MUST still report any that remain unresolved.
- **FR-013**: The system MUST still import a selected file whose referenced image cannot be resolved by any of the above, and MUST report that image as missing rather than failing silently.
- **FR-014**: The system MUST keep the current vault active throughout and after the import, and MUST report added, skipped, and missing-image counts on completion.
- **FR-015**: The system MUST make newly imported files immediately visible and queryable in the current vault (e.g. in search, lists, and graph views) without requiring a manual refresh or vault reload.
- **FR-016**: The system MUST clearly report when a selected file can't be read or a write fails partway through, without claiming a false success.
- **FR-017**: The system MUST prevent starting a new import while one is already in progress, and MUST let the user cancel before confirmation.
- **FR-018**: The system MUST include user-facing help explaining that this flow copies only new files (and their images, when available) from what the user drops or selects, skips path conflicts, and does not merge or replace existing files.

### Key Entities _(include if feature involves data)_

- **Dropped/selected file**: A file the user dragged in or chose via the file upload dialog, to be considered for import.
- **Dropped folder**: A folder the user dragged in as a unit; its files (and any `images/` subfolder) are read the same as individually dropped files.
- **Missing image reference**: An image path referenced by a selected file that was not part of the user's drop or selection, pending resolution via added file or granted folder access.
- **Current vault import plan**: The proposed set of files and resolved images to add, the set that conflicts with the current vault, and the user's confirmation state for a given drop/selection.
- **File conflict**: A selected file or image whose relative path already exists in the current vault; it is reported and skipped rather than replaced.

## Assumptions

- "File system" means the user's local device storage, reached only through the browser's native file/folder selection and drag-and-drop — the app never reads arbitrary paths on its own and never receives a real file-system path back from a dropped/selected file.
- This release is a safe additive import, not a content-aware entity merge: it preserves existing target files and skips identical-path conflicts.
- Users import into their currently selected local vault; guest and demo sessions cannot use this flow, consistent with existing vault-management restrictions.
- The existing "restore a portable backup as a new vault" and "Load from Folder" actions are unaffected and remain available as separate, distinct workflows from this one.
- Image thumbnails are optional per image; when a thumbnail isn't part of the drop/selection or resolved folder, only the full image is copied.
- Granting folder access to resolve missing images is only available in browsers that support it (per the existing File System Access support detection); this is a fallback convenience, not a requirement for the core import to work.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can select and import 20 files (with associated images already included in the drop/selection) into the current vault in under two minutes, excluding time spent choosing files in their OS.
- **SC-002**: In validation tests containing conflicting paths, 100% of pre-existing target files (and images) remain unchanged after the import.
- **SC-003**: In validation tests where a selected file references an image that was included in the drop/selection, 100% of successful imports also include that file's image.
- **SC-004**: In validation tests where a referenced image was missing from the drop/selection, 100% surface a clear missing-image prompt offering both resolution options (where supported) before the import completes.
- **SC-005**: Imported files are queryable (appear in search/list/graph views) within the same session immediately after import completes, with no manual reload step.
- **SC-006**: Users can distinguish added files from skipped conflicts and missing images from the review and completion messages without opening another screen.
