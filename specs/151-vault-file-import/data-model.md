# Data Model: Import Files from the File System

## DroppedItem

A single file the user dragged in or chose via the file upload dialog, before any interpretation.

| Field          | Description                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| `relativePath` | Path relative to the drop root: the bare filename for a loose file, or the folder-relative path (`webkitRelativePath` / walked `FileSystemDirectoryEntry` path) when part of a dropped folder. |
| `file`         | The underlying `File`/`Blob` content.                                        |

## SourceSelection

The full set of items the user provided in one drop/selection.

| Field           | Description                                                          |
| --------------- | ---------------------------------------------------------------------- |
| `items`         | The `DroppedItem`s gathered from drag-and-drop and/or the file upload dialog. |
| `unreadable`    | Items that could not be read (e.g. permission denied, I/O error), excluded from the plan and reported. |

## SourceVaultFile

An item from `SourceSelection` interpreted as vault content (entity markdown, or another recognized vault file type).

| Field       | Description                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `path`      | Vault-relative target path this file would occupy in the current vault (e.g. `entities/npc-thistle.md`).            |
| `imageRefs` | Vault-relative image paths this file's content references (e.g. from `image`/`imageArtDirection` fields), each with an optional thumbnail path. |

## MissingImageReference

An image path a `SourceVaultFile` references that was not present in `SourceSelection`.

| Field       | Description                                                                 |
| ----------- | ------------------------------------------------------------------------------ |
| `path`      | The referenced image's vault-relative path.                                    |
| `referencedBy` | The `SourceVaultFile.path`(s) that reference it.                            |
| `resolution`   | `unresolved` \| `added-directly` (user supplied the file) \| `resolved-from-folder` (found via granted folder access) \| `still-missing` (not found even after folder access). |

## CurrentVaultImportPlan

Computed from a `SourceSelection` (plus any resolved `MissingImageReference`s) before any write; the review model.

| Field              | Description                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `filesToAdd`       | `SourceVaultFile`s whose target paths are absent in the current vault.                           |
| `imagesToAdd`      | Resolved images/thumbnails whose target paths are absent in the current vault.                   |
| `conflictingPaths` | File or image paths that already exist in the current vault and must be skipped.                 |
| `missingImageRefs` | `MissingImageReference`s not yet resolved (`unresolved` or `still-missing`).                      |
| `unreadableCount`  | Count of items excluded because they couldn't be read.                                            |

## CurrentVaultImportResult

Reported after a write attempt, successful or not.

| Field              | Description                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `addedFiles`       | Paths actually written to the current vault.                                                |
| `addedImages`      | Image/thumbnail paths actually written to the current vault.                                |
| `skippedConflicts` | Paths skipped because they already existed in the current vault.                            |
| `missingImages`    | Image paths that remained unresolved (reported, not blocking).                              |
| `failure`          | Present only if a write failed partway through; describes what did and didn't complete.     |

## State transitions

`idle` → `collecting selection` (drag-and-drop and/or file upload, can repeat/add to) → `planning` → (if `missingImageRefs` non-empty) `resolving missing images` → `ready for confirmation` → `writing` → `complete` or `failed`

Cancellation from any pre-confirmation state returns to `idle` without writes. "Resolving missing images" can be skipped by the user (proceed with images reported missing) or looped through multiple times as they add files / grant folder access. An all-conflict plan (nothing to add) reaches "ready for confirmation" with the confirm action disabled. After `complete` or `failed`, the current vault's entity index is rebuilt (`entityStore.rebuildIndexes()`) so any files that were added are immediately queryable, regardless of whether some images were reported missing.
