# Implementation Plan: Import Files from the File System

**Branch**: `151-vault-file-import` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/151-vault-file-import/spec.md`

## Summary

Add an "Import Files" flow that accepts files via native drag-and-drop (including a dropped folder) and the traditional file upload dialog, then reuses `packages/importer`'s existing mechanical (non-AI) import pipeline end to end: a new converter maps the dropped files into a `CCImportPackage` (`EntityDraft`s with a mapping rule set that preserves each file's real Codex Cryptica entity type, `AssetDraft`s with content-hash-based dedupe, matching entity `image`/`thumbnail` references to dropped image files by path), a **dedicated engine instance** (mirroring `createCifEngine()`: `titleFallback: false`, a `sourcePath`-keyed `sourceRefBuilder`) handles matching/preview/write through the existing `WebVaultWriter`, and the existing `ImportSettingsController` upload → processing → review → report UI is extended with a new source type, a concurrency guard, and a missing-image resolution step (add file directly, or grant folder access via the existing `pickDirectory()` helper). Review always treats a matched entity as "skip" (never "update"), enforcing the never-overwrite requirement using the engine's existing behavior. No custom OPFS copy code and no in-app "other vault" browsing are needed.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `@codex/importer` (`ImportEngine`, `CCImportPackage`/`EntityDraft`/`AssetDraft`, `validatePackage`, the `cc/` mapping/session/report modules), existing `apps/web/src/lib/features/importer/web-vault-writer.ts` (`WebVaultWriter`), existing `apps/web/src/lib/components/settings/import-settings-controller.svelte.ts`, existing File System Access helpers (`apps/web/src/lib/utils/fs.ts`: `pickDirectory`, `isFileSystemAccessSupported`, `getFileSystemAccessUnsupportedMessage`), native `DataTransferItem`/`FileSystemDirectoryEntry` drag-and-drop APIs, `<input type="file">`
**Storage**: Entities are written through the vault's normal live entity-creation path (Dexie-backed store + OPFS), the same path any in-app edit uses — no direct OPFS file writes and no manual re-indexing
**Testing**: Vitest unit tests, Svelte component tests, Svelte check, ESLint
**Target Platform**: Modern browsers supporting OPFS vault storage; folder-access image resolution additionally requires File System Access API support (Chrome/Edge/Brave), with a same-flow fallback (add image files directly) on Firefox/Safari
**Project Type**: Browser-first web application
**Performance Goals**: Reviewing a drop/selection of up to a few hundred files stays responsive; a 20-file (with images already included) import completes in under two minutes
**Constraints**: Local-only processing; validate before writing; never overwrite an existing target path (file or image) — enforced by never offering "update" in this source's review step, and by an exact (non-title-fuzzy) match identity so "conflict" means what the spec says it means; dropped/selected files carry no real OS path (platform constraint — drives the missing-image fallback design); only one import may be in progress at a time (FR-017)
**Scale/Scope**: A new mechanical converter (`DroppedItem[]` → `CCImportPackage`), a dedicated `ImportEngine` configuration, drop-zone/upload UI, and a missing-image resolution step wired into the existing import controller; excludes content-aware entity merging, overwrite/update, and guest/demo import

## Constitution Check

- **Library-first**: PASS — the new converter (dropped-file parsing, type mapping, image-reference matching, content-hash asset dedupe) lives in `packages/importer` alongside the other mechanical sources (CIF, Scabard, Chronica) it mirrors; only the drop zone, file upload button, and missing-image resolution UI live in `apps/web`.
- **TDD**: PASS — cover: `DroppedItem[]`/dropped-folder → `CCImportPackage` conversion (entity + matched image, entity + image via dropped folder, entity with unresolved image reference, non-entity file rejection, entity `type` preserved via mapping rules, `AssetDraft.contentHash` populated), missing-image resolution (added file, resolved via granted folder, still missing), exact `sourcePath`-based match identity (no title-fuzzy fallback), the review-step "always skip on match" behavior, the concurrency guard (FR-017), and that the reused review/report UI actually renders this source's counts/messages (not just assumed by reuse), before finalizing.
- **Simplicity & YAGNI / DRY**: PASS — this plan explicitly reuses `ImportEngine`, `WebVaultWriter`, `CCImportPackage`/`EntityDraft`/`AssetDraft`, and the existing `ImportSettingsController` UI shell instead of duplicating conflict-detection, matching, or write logic that already exists for CIF/Scabard/Chronica imports.
- **Privacy/client-side**: PASS — files never leave the device; drag-and-drop/file-picker/File-System-Access reads are all local browser APIs, no new network access.
- **DI**: PASS — the new converter is a pure function (`DroppedItem[]` in, `CCImportPackage` out); it introduces no new store/service and needs no constructor DI. `ImportEngine`/`WebVaultWriter` already follow DI (ADR 007) and are reused as-is.
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
    └── file-system-import.md
```

### Source Code (repository root)

```text
packages/importer/src/
├── vault-files/
│   ├── index.ts                     # NEW: barrel export
│   ├── detect.ts                    # NEW: isVaultEntityFile(name, content) — recognizes existing CC frontmatter
│   ├── mapping.ts                   # NEW: VAULT_FILES_MAPPING_RULES — one rule per real Codex Cryptica entity
│   │                                 #      type (Character/Location/Item/Lore/Creature/...), so mapDraftToType
│   │                                 #      never falls through to DEFAULT_MAPPING_RULES' "note" default
│   ├── source-ref.ts                # NEW: vaultFileSourceRefBuilder(system, draft) — sourcePath-only identity,
│   │                                 #      no sourceId branch, so two different dropped files can never collide
│   ├── convert.ts                   # NEW: droppedItemsToPackage(items: DroppedItem[]): { pkg: CCImportPackage;
│   │                                 #      missingImageRefs: MissingImageReference[] } — entity frontmatter →
│   │                                 #      EntityDraft (type via mapping.ts), image-path matching → AssetDraft
│   │                                 #      with a computed contentHash (sha256, mirroring cif/zip.ts's sha256Hex)
│   └── convert.test.ts              # NEW
├── cc/
│   ├── package.ts                   # existing: EntityDraft/AssetDraft/CCImportPackage — reused, not duplicated
│   └── engine.ts                    # existing: ImportEngine.prepare/commit — reused as-is
└── index.ts                         # updated: export * from "./vault-files"

apps/web/src/lib/
├── features/importer/web-vault-writer.ts             # existing: WebVaultWriter — reused as-is, constructed with
│                                                       #           { titleFallback: false } for this source (like CIF)
├── utils/fs.ts                                        # existing: pickDirectory, isFileSystemAccessSupported,
│                                                       #           getFileSystemAccessUnsupportedMessage — reused
│                                                       #           for the missing-image "grant folder access" fallback
├── components/settings/import-settings-controller.svelte.ts  # updated: new createVaultFilesEngine() (mirrors
│                                                               #          createCifEngine(): titleFallback: false,
│                                                               #          vaultFileSourceRefBuilder,
│                                                               #          VAULT_FILES_MAPPING_RULES), new
│                                                               #          source-detection branch calling
│                                                               #          droppedItemsToPackage, missing-image
│                                                               #          resolution state, forced matchDecision
│                                                               #          "skip", an in-progress guard (FR-017)
├── components/settings/ImportSettings.svelte          # updated: drop zone + upload button entry point,
│                                                       #          missing-image resolution step in review
└── content/help/offline-sync.md                       # updated: file-system import guidance (auto-registered via
│                                                       #          content/loader.ts's import.meta.glob("./help/*.md")
│                                                       #          — no separate help-content.ts entry needed)
```

**Structure Decision**: Add a new `packages/importer/src/vault-files/` module (Principle I: Library-First, and matching the existing `cc/`, `cif/` source-module pattern) containing the dropped-file → `CCImportPackage` conversion, its own type-mapping rules, and its own `sourceRefBuilder` — no new engine, no new writer, no new UI shell. This source gets its **own dedicated engine instance** in the controller (`createVaultFilesEngine()`, mirroring `createCifEngine()`) rather than reusing the generic `createEngine()`, specifically so it can set `titleFallback: false` and a `sourcePath`-only `sourceRefBuilder` — matching entities purely by path identity, not by title-fuzzy matching, so "conflict" means exactly what spec.md's FR-006 says it means. Extend the existing `ImportSettingsController`/import settings UI with this as another `importMode` source rather than building a parallel modal, since the upload → processing → review → report flow it already provides (including per-item skip/update/create review and the final report) is exactly what this feature needs, just with "update" withheld and a missing-image step added.

## Complexity Tracking

No constitution violations or complexity exceptions are required.
