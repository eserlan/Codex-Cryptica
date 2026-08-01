# Data Model: Import Files from Another Vault

## SourceVaultEntry

One candidate source vault, drawn from the existing vault registry (excludes the current vault).

| Field          | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `vaultId`      | The source vault's id, used to resolve its OPFS directory.            |
| `vaultName`    | Human-readable name shown in the source picker.                       |
| `lastOpenedAt` | Used to order the source vault list, matching existing vault listing. |

## SourceVaultFile

One file within the chosen source vault, as browsed/selected by the user.

| Field       | Description                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `path`      | Vault-relative path (e.g. `entities/npc-thistle.md`).                                                              |
| `kind`      | Entity file, or other vault content file, per the source vault's file tree.                                        |
| `imageRefs` | Vault-relative image paths this file references (resolved from its content), each with an optional thumbnail path. |

## CurrentVaultImportSelection

The user's in-progress choice; transient, never persisted.

| Field           | Description                                              |
| --------------- | -------------------------------------------------------- |
| `sourceVaultId` | The chosen source vault.                                 |
| `selectedPaths` | The `SourceVaultFile.path`s the user checked for import. |

## CurrentVaultImportPlan

Computed from a `CurrentVaultImportSelection` before any write; the review model.

| Field              | Description                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `sourceVaultName`  | Source name shown in the review prompt.                                                                   |
| `filesToAdd`       | Selected files whose paths are absent in the current vault.                                               |
| `imagesToAdd`      | Resolved images/thumbnails (from `filesToAdd`'s `imageRefs`) whose paths are absent in the current vault. |
| `conflictingPaths` | Selected file or image paths that already exist in the current vault and must be skipped.                 |
| `missingImageRefs` | Image paths referenced by a selected file but not found in the source vault.                              |

## CurrentVaultImportResult

Reported after a write attempt, successful or not.

| Field              | Description                                                                             |
| ------------------ | --------------------------------------------------------------------------------------- |
| `addedFiles`       | Paths actually written to the current vault.                                            |
| `addedImages`      | Image/thumbnail paths actually written to the current vault.                            |
| `skippedConflicts` | Paths skipped because they already existed in the current vault.                        |
| `missingImages`    | Image paths that could not be found in the source vault (reported, not blocking).       |
| `failure`          | Present only if a write failed partway through; describes what did and didn't complete. |

## State transitions

`idle` → `choosing source vault` → `browsing/selecting files` → `planning` → `ready for confirmation` → `writing` → `complete` or `failed`

Cancellation from "browsing/selecting files" or "ready for confirmation" returns to `idle` without writes. A source vault that fails to open returns to "choosing source vault" with a message. An all-conflict plan (nothing to add) reaches "ready for confirmation" with the confirm action disabled, per FR: the user must be told there's nothing new rather than being silently blocked earlier. After `complete` or `failed`, the current vault's entity index is rebuilt (`entityStore.rebuildIndexes()`) so any files that were added are immediately queryable, regardless of whether some images were reported missing.
