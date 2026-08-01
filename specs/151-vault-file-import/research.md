# Research: Import Files from the File System

## Decision: Source is native drag-and-drop / file upload, not an in-app "other vault" browser

**Rationale**: A browser page cannot list or browse a folder on disk unless the user explicitly grants access to it (drag-and-drop or a file/folder picker) — there is no ambient way to enumerate "vaults on this computer." An earlier design assumed picking a source vault from an in-app list and browsing it live over OPFS; that only works for vaults already loaded into *this browser's* OPFS storage, not a vault folder sitting on disk. The user's actual intent is "pick files from my file system," so the entry point must be the standard `<input type="file">` / drag-and-drop surface, matching the mental model of every other "attach a file" flow.

**Alternatives considered**:

- In-app source-vault picker over OPFS (the previous design for this branch): only covers vaults already registered in this browser's OPFS, not arbitrary files/folders on disk; superseded.
- `.codex.zip` backup upload (the original design for this branch): still a valid recovery mechanism, but adds an unnecessary export/download step when the user just wants specific files.

## Decision: Dropped/selected files never carry a real file-system path

**Rationale**: Per the `File`/`Blob` web APIs, browsers deliberately strip the OS path from any file the user drops or selects — only `File.name` (and relative path segments for a dropped folder, via `webkitRelativePath`/`FileSystemDirectoryEntry`) are exposed. The app cannot infer "this file came from folder X" and go fetch related files on its own; it only knows what was actually included in the drop/selection.

**Alternatives considered**: None — this is a platform constraint, not a design choice.

## Decision: Support both loose file drop/upload and whole-folder drag-and-drop

**Rationale**: `DataTransferItem.webkitGetAsEntry()` (used for drag-and-drop) can yield a `FileSystemDirectoryEntry` when a folder is dropped, and that can be walked recursively without any extra permission grant — unlike `showDirectoryPicker()`, this works across Chrome, Firefox, and Safari. Supporting folder drop as well as loose files means a user who drags a whole (or partial) vault folder in gets image references resolved automatically for free, while a user who just drags a couple of specific files still gets a working, simpler flow.

**Alternatives considered**:

- Loose files only: simpler, but loses "drop the folder, get images automatically" for the common case where the user has the vault folder open already.
- Require `showDirectoryPicker()` for any folder-level access: rejected as the default because it's unsupported in Firefox and Safari (see `apps/web/src/lib/utils/fs.ts:3-9,19-60`, which already documents and messages this gap for the existing "Load from Folder" flow); drag-and-drop folder support has no such gap.

## Decision: Missing-image fallback offers "add the file" or "grant folder access", reusing existing File System Access helpers

**Rationale**: When a selected file references an image that wasn't part of the drop/selection, the app cannot locate it on its own (no path). The only two ways to close that gap are asking the user to add the specific missing file(s), or asking them to grant access to the containing folder so the app can search it — the second reuses `pickDirectory()` (`apps/web/src/lib/utils/fs.ts:67-85`) and the walking pattern in `walkDirectory()` (`fs.ts:123-177`, though that helper currently skips `images/` and only collects `.md` — the vault-import walk needs its own pass that includes `images/`). Where `pickDirectory()` throws `NotSupportedError` (Firefox/Safari), the existing `getFileSystemAccessUnsupportedMessage()` copy can inform the user that only the "add the file directly" option is available there.

**Alternatives considered**:

- Silently import without the image and mark it missing, no resolution prompt: rejected — the user explicitly wants missing images actively resolved, not just reported.
- Require the source folder upfront for every import: rejected — most imports won't need it since images are usually included in the same drop, and requiring it unconditionally adds friction and reintroduces the Firefox/Safari support gap as a hard blocker instead of an edge-case fallback.

## Decision: Build the copy plan (added vs. conflicting) before writing, same principle as prior designs

**Rationale**: A selected file (or resolved image) is safe to add only if its relative path does not already exist in the target vault. Calculating added/conflicting sets before confirmation keeps the review understandable and prevents accidental overwrites. This logic is path-comparison-only and is independent of how the source files were acquired.

**Alternatives considered**:

- Overwrite target paths after confirmation: risks losing current-vault work; out of scope per spec.
- Auto-rename every conflict: would create duplicate entity/asset files without a meaningful user decision.

## Decision: Rebuild the target vault's entity index after a successful copy, using the existing hook

**Rationale**: Entities are dual-stored — as OPFS markdown files and as rows in an IndexedDB (Dexie) index (`graphEntities`, `entityContent`, `vaultMetadata`) used for search/list/graph queries. Writing OPFS files alone does not update that index. `entityStore.rebuildIndexes()` (`apps/web/src/lib/stores/vault.svelte.ts:423`) already exists for exactly this purpose and is called today after `importFromFolder`; the same call after a successful file-system import satisfies FR-015/SC-005.

**Alternatives considered**:

- Incrementally patch the index per imported file: more efficient but adds complexity for a bulk, infrequent, user-initiated action; `rebuildIndexes()` is already the established pattern for "files landed in OPFS from outside the normal edit flow."

## Decision: Keep the existing portable-backup restore and "Load from Folder" actions unchanged

**Rationale**: Restoring an isolated `.codex.zip` backup as a brand-new vault, and mirroring a whole vault to/from a folder via "Load from Folder," remain separate, already-shipped workflows with different purposes (disaster recovery, whole-vault sync) and must not be conflated with this feature's "bring in a few specific files" purpose.
