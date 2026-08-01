# Implementation Plan: Import Files from the File System

**Branch**: `151-vault-file-import` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/151-vault-file-import/spec.md`

## Summary

Add an "Import Files" flow that accepts files via native drag-and-drop (including a dropped folder) and the traditional file upload dialog, interprets them as vault content, computes an added/conflicting plan against the current vault, resolves any missing image references (via directly-added files or an optional granted folder access using the existing `pickDirectory()` helper), and writes only the non-conflicting files/images into the current vault's OPFS tree — then rebuilds the current vault's entity index. No in-app "other vault" browsing and no `.codex.zip` round-trip are involved; the source is whatever the user actually drops or selects from their file system.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `@codex/vault-engine` (`AssetManager`, `WorldService`), existing OPFS helpers (`apps/web/src/lib/utils/opfs.ts`), existing File System Access helpers (`apps/web/src/lib/utils/fs.ts`: `pickDirectory`, `isFileSystemAccessSupported`, `getFileSystemAccessUnsupportedMessage`), native `DataTransferItem`/`FileSystemDirectoryEntry` drag-and-drop APIs, `<input type="file">`
**Storage**: Browser-local OPFS vault directories (current vault only — the source is not OPFS) and the IndexedDB-backed entity index (Dexie: `graphEntities`, `entityContent`, `vaultMetadata`); no new persistence format
**Testing**: Vitest unit tests, Svelte component tests, Svelte check, ESLint
**Target Platform**: Modern browsers supporting OPFS vault storage; folder-access image resolution additionally requires File System Access API support (Chrome/Edge/Brave), with a same-flow fallback (add image files directly) on Firefox/Safari
**Project Type**: Browser-first web application
**Performance Goals**: Reviewing a drop/selection of up to a few hundred files stays responsive; a 20-file (with images already included) import completes in under two minutes
**Constraints**: Local-only processing; validate before writing; never overwrite an existing target path (file or image); current vault stays active throughout; no new backend or network access; dropped/selected files carry no real OS path (platform constraint — drives the missing-image fallback design)
**Scale/Scope**: A new drop/upload picker plus a plan/copy utility operating on in-memory `File` content and the target vault's OPFS tree; excludes content-aware entity merging, overwrite choices, and guest/demo import

## Constitution Check

- **Library-first**: PASS — the copy-plan/copy logic (path validation, conflict detection, image-reference extraction/resolution) belongs in `@codex/vault-engine` alongside `AssetManager`/`WorldService` since it's vault-storage domain logic, not UI; only the drop zone, file picker, and review dialog live in `apps/web`.
- **TDD**: PASS — cover: selection → plan (added/conflicting), image-reference resolution (present in selection, present via dropped folder, missing → resolved via added file, missing → resolved via granted folder, still missing), non-overwriting write, unreadable-file handling, partial-write-failure reporting, and post-import re-indexing, before finalizing.
- **Privacy/client-side**: PASS — files never leave the device; drag-and-drop/file-picker/File-System-Access reads are all local browser APIs, no new network access.
- **DI**: PASS — the copy-plan/copy service takes a target `rootHandle`/vault id and an index-rebuild dependency through its constructor with production defaults, matching `WorldService`'s existing DI pattern (ADR 007).
- **Style/accessibility/natural language**: PASS — Svelte 5 Runes, semantic theme tokens, Iconify classes, a keyboard-reachable file upload button as the accessible alternative to drag-and-drop, plain-language review/errors ("Import Files", "This image wasn't included — add it, or let us look in the folder", not technical jargon).
- **Documentation**: PASS — add a help article (or extend the existing portable-backup/offline-sync one) explaining this copies only the files (and images) the user drops or selects, offers a fallback for missing images, and does not merge or replace existing files.
- **Validation**: PASS — run affected tests, Svelte check, repository lint, and repository tests.

## Project Structure

### Documentation (this feature)

```text
specs/151-vault-file-import/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── vault-to-vault-import.md
```

### Source Code (repository root)

```text
packages/vault-engine/src/
├── vault-import.ts                 # NEW: interpret File[]/dropped-folder entries as SourceVaultFile[],
│                                    #      planImport() (conflict detection), resolveMissingImage(),
│                                    #      copyImportPlan() (non-overwriting OPFS writes)
├── vault-import.test.ts            # NEW
├── asset-manager.ts                # existing: image/thumbnail path conventions reused, not duplicated
└── services/WorldService.ts        # existing: entity path + frontmatter shape referenced for image-ref extraction

apps/web/src/lib/
├── utils/fs.ts                            # existing: pickDirectory, isFileSystemAccessSupported,
│                                           #           getFileSystemAccessUnsupportedMessage — reused for
│                                           #           the missing-image "grant folder access" fallback
├── utils/opfs.ts                          # existing: writeOpfsFile — reused for the target-vault write
├── stores/vault.svelte.ts                 # existing: entityStore.rebuildIndexes() called after a
│                                           #           successful copy into the active vault
├── components/vaults/VaultFileImportModal.svelte   # NEW: drop zone + upload button → review (with
│                                                    #      missing-image resolution) → confirm
├── components/vaults/VaultFileImportModal.test.ts  # NEW
└── content/help/offline-sync.md           # updated: file-system import guidance
```

**Structure Decision**: Put the plan/copy/image-resolution logic in `packages/vault-engine` (Principle I: Library-First — it's vault storage domain logic reusable outside this one modal), and keep only the drop zone, upload button, and review/resolution UI in `apps/web`. This mirrors how `AssetManager` and `WorldService` already split storage logic from UI. A new modal component is added (not a reuse of `VaultBackupSettings.svelte`), since this entry point's mental model — drag/drop or upload specific files, not restore/export a whole vault — is distinct from the existing backup settings surface.

## Complexity Tracking

No constitution violations or complexity exceptions are required.
