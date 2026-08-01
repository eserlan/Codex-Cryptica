# Research: Import Files from the File System

## Decision: Source is native drag-and-drop / file upload, not an in-app "other vault" browser

**Rationale**: A browser page cannot list or browse a folder on disk unless the user explicitly grants access to it (drag-and-drop or a file/folder picker) — there is no ambient way to enumerate "vaults on this computer." The user's actual intent is "pick files from my file system," so the entry point must be the standard `<input type="file">` / drag-and-drop surface, matching the mental model of every other "attach a file" flow.

**Alternatives considered**:

- In-app source-vault picker over OPFS (an earlier design for this branch): only covers vaults already registered in this browser's OPFS, not arbitrary files/folders on disk; superseded.
- `.codex.zip` backup upload (the original design for this branch): still a valid recovery mechanism, but adds an unnecessary export/download step when the user just wants specific files.

## Decision: Build this as a new *mechanical* source in `packages/importer`, reusing the existing `ImportEngine`/`VaultWriter`/review pipeline — not a bespoke OPFS copy module

**Rationale**: `packages/importer` already has a generic, source-agnostic import pipeline built for exactly this shape of problem: a `CCImportPackage` (`entityDrafts` + `relationshipDrafts` + `assetDrafts`, `packages/importer/src/cc/package.ts:67-76`) is validated, previewed (`ImportEngine.prepare`, matching against existing vault entities and letting the review UI choose skip/update/create per item), then committed (`ImportEngine.commit`, `packages/importer/src/cc/engine.ts:78-570`) through a `VaultWriter` port. Several other "mechanical" (deterministic, no-AI) sources already plug into this exact pipeline as thin converters: CIF (`packages/importer/src/cif/`), Scabard exports (`packages/importer/src/cc/scabard.ts`), and Chronica exports (`packages/importer/src/cc/chronica.ts`) — each is just a detector (`isXExport`) plus a function that maps the source's shape into `EntityDraft`/`AssetDraft`s. The app already wires all of these into one upload → processing → review → report flow (`apps/web/src/lib/components/settings/import-settings-controller.svelte.ts`), with `importMode: "cc"` being the deterministic (non-Oracle) path. Writing is already handled by `WebVaultWriter` (`apps/web/src/lib/features/importer/web-vault-writer.ts`), which creates/updates entities through the vault store's normal `createEntity`/`updateEntity` — the same path any in-app edit uses — so entities are live-indexed automatically; no manual `entityStore.rebuildIndexes()` step is needed (that was only a concern under the previously-considered raw-OPFS-write design).

**Alternatives considered**:

- A bespoke `packages/vault-engine/src/vault-import.ts` doing raw OPFS reads/writes (the previous plan for this branch): would duplicate conflict-detection, matching, and reporting logic that `ImportEngine` already provides, and would require a separate manual re-index step since it bypasses the normal entity-write path. Superseded.
- Routing through the Oracle/AI analyzer (`packages/importer/src/oracle/analyzer.ts`): wrong tool — the dropped files are already valid, structured Codex Cryptica entity content; running them through AI extraction would be lossy and unnecessary. This feature explicitly needs the deterministic/"cc" path, not the Oracle path.

## Decision: Dropped/selected files never carry a real file-system path

**Rationale**: Per the `File`/`Blob` web APIs, browsers deliberately strip the OS path from any file the user drops or selects — only `File.name` (and relative path segments for a dropped folder, via `webkitRelativePath`/`FileSystemDirectoryEntry`) are exposed. The app cannot infer "this file came from folder X" and go fetch related files on its own; it only knows what was actually included in the drop/selection.

**Alternatives considered**: None — this is a platform constraint, not a design choice.

## Decision: Support both loose file drop/upload and whole-folder drag-and-drop

**Rationale**: `DataTransferItem.webkitGetAsEntry()` (used for drag-and-drop) can yield a `FileSystemDirectoryEntry` when a folder is dropped, and that can be walked recursively without any extra permission grant — unlike `showDirectoryPicker()`, this works across Chrome, Firefox, and Safari. Supporting folder drop as well as loose files means a user who drags a whole (or partial) vault folder in gets image references resolved automatically for free, while a user who just drags a couple of specific files still gets a working, simpler flow.

**Alternatives considered**:

- Loose files only: simpler, but loses "drop the folder, get images automatically" for the common case where the user has the vault folder open already.
- Require `showDirectoryPicker()` for any folder-level access: rejected as the default because it's unsupported in Firefox and Safari (see `apps/web/src/lib/utils/fs.ts:3-9,19-60`, which already documents and messages this gap for the existing "Load from Folder" flow); drag-and-drop folder support has no such gap.

## Decision: Map dropped entity files into `EntityDraft`s with `sourcePath` identity, dropped images into `AssetDraft`s matched by declared image path

**Rationale**: `EntityDraftSchema` (`package.ts:19-40`) already models exactly what a parsed Codex Cryptica markdown file needs: `sourcePath`, `title`, `content`, `lore`, `tags`/`labels`, `image`/`thumbnail`, `startDate`/`endDate`. `AssetDraftSchema` (`package.ts:50-65`) models a dropped image with `placementRef` (which entity it belongs to) and an optional `contentHash` for dedupe — the same pattern CIF uses for content-addressed asset resolution (`resolveCifAssets`, `packages/importer/src/cif/assets.ts`). The new mechanical converter's job is: parse each dropped markdown file's frontmatter (existing frontmatter parsing conventions per `apps/web/src/lib/utils/markdown.ts`) into an `EntityDraft`, and for each `image`/`imageArtDirection` reference, look for a matching dropped file (by relative path) to become an `AssetDraft` with that entity's `placementRef`.

**Alternatives considered**:

- Custom `SourceVaultFile`/`CurrentVaultImportPlan` types (the previous plan's data model): reinvents `EntityDraft`/`AssetDraft`/`CCImportPackage`, which already cover the same fields. Superseded — see updated `data-model.md`.

## Decision: Missing-image fallback offers "add the file" or "grant folder access", surfaced through the existing asset-review step

**Rationale**: When an `EntityDraft`'s `image`/`thumbnail` reference has no matching dropped file, it becomes an `AssetDraft`-less reference the review step must flag (extending the existing `PreviewAsset.eligible`/`skipReason` shape used for CIF's size-limit rejections, `engine.ts:148-162`) rather than silently dropping the image. The only two ways to close that gap are asking the user to add the specific missing file(s), or asking them to grant access to the containing folder so the app can search it — the second reuses `pickDirectory()` (`apps/web/src/lib/utils/fs.ts:67-85`). Where `pickDirectory()` throws `NotSupportedError` (Firefox/Safari), the existing `getFileSystemAccessUnsupportedMessage()` copy can inform the user that only the "add the file directly" option is available there.

**Alternatives considered**:

- Silently import without the image and mark it missing, no resolution prompt: rejected — the user explicitly wants missing images actively resolved, not just reported.
- Require the source folder upfront for every import: rejected — most imports won't need it since images are usually included in the same drop, and requiring it unconditionally adds friction and reintroduces the Firefox/Safari support gap as a hard blocker instead of an edge-case fallback.

## Decision: Force `matchDecision: "skip"` for every matched entity — never expose "update" in this flow's review UI

**Rationale**: `ImportEngine` already supports per-item skip/update/create decisions (`PreviewItem.matchDecision`, used by CIF's `"cif"` update policy for reimports). This feature's spec explicitly forbids overwriting existing target content (FR-006/FR-007) — unlike CIF, which is designed for repeatable reimport/sync. The review UI for this source simply never offers "update," so every path match is always skipped, satisfying the safety requirement using the engine's existing behavior rather than new logic.

**Alternatives considered**:

- Reuse CIF's `"cif"` update policy (union labels/aliases, replace scalars): rejected — this feature is a one-way additive import of specific hand-picked files, not a repeatable sync relationship with a source system.

## Decision: Keep the existing portable-backup restore and "Load from Folder" actions unchanged

**Rationale**: Restoring an isolated `.codex.zip` backup as a brand-new vault, and mirroring a whole vault to/from a folder via "Load from Folder," remain separate, already-shipped workflows with different purposes (disaster recovery, whole-vault sync) and must not be conflated with this feature's "bring in a few specific files" purpose.
