# Data Model: Import Files from the File System

This feature reuses `packages/importer`'s existing `CCImportPackage`/`ImportEngine` model rather than introducing a parallel one. Only the pieces genuinely new to this feature are modeled below; everything else (`EntityDraft`, `AssetDraft`, `CCImportPackage`, `PreviewItem`, `PreviewAsset`, `CCImportSession`, `ImportReport`) already exists in `packages/importer/src/cc/package.ts` and `packages/importer/src/cc/session.ts`/`report.ts`.

## DroppedItem

A single file the user dragged in or chose via the file upload dialog, before any interpretation. Input to the new mechanical converter.

| Field          | Description                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| `relativePath` | Path relative to the drop root: the bare filename for a loose file, or the folder-relative path (`webkitRelativePath` / walked `FileSystemDirectoryEntry` path) when part of a dropped folder. |
| `file`         | The underlying `File`/`Blob` content.                                        |

## SourceSelection

The full set of items the user provided in one drop/selection.

| Field        | Description                                                                          |
| ------------ | --------------------------------------------------------------------------------------- |
| `items`      | The `DroppedItem`s gathered from drag-and-drop and/or the file upload dialog.           |
| `unreadable` | Items that could not be read (e.g. permission denied, I/O error); excluded from the resulting `CCImportPackage` and reported. |

## Mapping DroppedItem → CCImportPackage (new mechanical converter output)

The converter (new, in `packages/importer`) walks `SourceSelection.items`, and for each recognized entity markdown file:

- Produces one `EntityDraft` with `sourcePath` set to the file's `relativePath` (this is what `ImportEngine` uses, via `sourceRefBuilder`, as the match/dedupe identity — see `buildEntitySourceRef`, `packages/importer/src/cc/source-ref.ts`), and `image`/`thumbnail` populated from the entity's frontmatter references.
- For each `image`/`thumbnail` reference, looks for a `DroppedItem` whose `relativePath` matches; if found, adds an `AssetDraft` with `placementRef` pointing at the entity's `sourcePath` (or its resolved `sourceRef`, per existing CIF asset-resolution conventions in `packages/importer/src/cif/assets.ts`).
- Files that aren't recognized as vault entity content are excluded and reported (`ImportWarning`), not silently imported as-is (per spec edge case).

## MissingImageReference

An image path an `EntityDraft` references that had no matching `DroppedItem` — new to this feature, surfaced as an extension of the existing `PreviewAsset.eligible: false` shape (`engine.ts:148-162`) with a distinct `skipReason` so the review UI can offer resolution rather than just reporting a skip.

| Field          | Description                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| `path`         | The referenced image's relative path, as written in the entity's frontmatter. |
| `referencedBy` | The `EntityDraft.sourcePath`(s) that reference it.                            |
| `resolution`   | `unresolved` \| `added-directly` (user supplied the file, becomes a new `AssetDraft`) \| `resolved-from-folder` (found via granted folder access, becomes a new `AssetDraft`) \| `still-missing` (not found even after folder access). |

## Review & write (existing types, used as-is)

- **`CCImportPackage`** (`package.ts:67-76`): the converter's output — `entityDrafts`, `assetDrafts`, `warnings` (relationshipDrafts stays empty; this feature doesn't infer relationships between dropped files).
- **`CCImportSession`** (`session.ts`, via `ImportEngine.prepare`): per-item `PreviewItem`s with `match`/`matchDecision`. This feature's review UI never sets `matchDecision: "update"` — every match is left at the engine's default `"skip"` (see research.md), enforcing "never overwrite" (FR-006/FR-007) using existing engine behavior.
- **`ImportReport`** (`report.ts`, via `ImportEngine.commit`): `entitiesCreated`, `itemsSkipped`, `assetsImported`, `assetsSkipped`, `failures`, `warnings` — directly satisfies the "report added/skipped/missing counts" requirement (FR-014) without a new result type.

## State transitions

`idle` → `collecting selection` (drag-and-drop and/or file upload, can repeat/add to) → `converting` (DroppedItem[] → CCImportPackage via the new mechanical converter) → `ImportEngine.prepare` → (if any `MissingImageReference`s) `resolving missing images` → `ready for confirmation` → `ImportEngine.commit` → `complete` (or partially failed, per `ImportReport.failures`)

Cancellation from any pre-confirmation state returns to `idle` without writes. "Resolving missing images" can be skipped by the user (proceed with images reported missing) or looped through multiple times as they add files / grant folder access. An all-conflict/all-skip plan (nothing to add) reaches "ready for confirmation" with the confirm action disabled. Because `WebVaultWriter.createEntity`/`saveAsset` write through the vault's normal live entity-creation path, no separate index-rebuild step is needed after `commit` — this differs from the earlier raw-OPFS-write design, which would have required one.
