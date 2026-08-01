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

The converter (new, in `packages/importer/src/vault-files/convert.ts`) walks `SourceSelection.items`, and for each recognized entity markdown file:

- Produces one `EntityDraft` with `sourcePath` set to the file's `relativePath`, and `sourceType` set to the file's real frontmatter `type` (Character/Location/Item/Lore/Creature/etc.) so `VAULT_FILES_MAPPING_RULES` (`packages/importer/src/vault-files/mapping.ts`) resolves it back to the same type instead of falling through to `DEFAULT_MAPPING_RULES`'s `"note"` default. `image`/`thumbnail` are populated from the entity's frontmatter references.
- Match/dedupe identity uses `vaultFileSourceRefBuilder` (`packages/importer/src/vault-files/source-ref.ts`), derived from `sourcePath` only — no `sourceId` branch and no title-based fallback (the engine for this source is constructed with `titleFallback: false`), so "conflict" means an exact path match, matching spec.md's FR-006 literally.
- For each `image`/`thumbnail` reference, looks for a `DroppedItem` whose `relativePath` matches; if found, computes a content hash (sha256) of its bytes and adds an `AssetDraft` with `placementRef` pointing at the entity's `sourcePath` and `contentHash` set, so `WebVaultWriter.saveAsset` uses content-addressed storage naming (matching CIF's convention) instead of falling back to the possibly-colliding original filename.
- Files that aren't recognized as vault entity content are excluded and reported (`ImportWarning`), not silently imported as-is (per spec edge case).

## MissingImageReference

An image path an `EntityDraft` references that had no matching `DroppedItem` — new to this feature. This is a **separate list returned alongside `CCImportPackage`**, not an extension of `PreviewAsset`: `PreviewAsset` (`engine.ts:148-162`) is only ever built from `pkg.assetDrafts` that already exist, so a reference with no matching dropped item never enters `session.assets` under the existing engine at all. The missing-image review step (T014/T015) renders this list directly, independent of the reused `PreviewAsset` UI.

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
