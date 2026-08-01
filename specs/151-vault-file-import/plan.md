# Implementation Plan: Import Files from Another Vault

**Branch**: `151-vault-file-import` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/151-vault-file-import/spec.md`

## Summary

Add a picker that lets the user choose another vault already registered in this browser, browse its OPFS file tree without switching the active vault, select files, and copy the non-conflicting ones (plus any images they reference) directly into the current vault's OPFS tree — then rebuild the current vault's entity index. This reuses the same-origin, single-OPFS-root architecture (`getVaultDir(root, vaultId)` works for any vault id regardless of which vault is "active") and the conflict-before-write and safe-path-validation patterns already proven in the portable-backup archive code, but reads the source directly from OPFS instead of parsing a `.codex.zip`.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `@codex/vault-engine` (`AssetManager`, `WorldService`), existing OPFS helpers (`apps/web/src/lib/utils/opfs.ts`), existing `vaultRegistry` store, existing notification/confirmation UI
**Storage**: Browser-local OPFS vault directories (one shared root, one subdirectory per vault id) and the IndexedDB-backed entity index (Dexie: `graphEntities`, `entityContent`, `vaultMetadata`); no new persistence format
**Testing**: Vitest unit tests, Svelte component tests, Svelte check, ESLint
**Target Platform**: Modern browsers supporting the existing OPFS vault storage
**Project Type**: Browser-first web application
**Performance Goals**: Browsing and selecting within a source vault of up to several hundred files stays responsive; a 20-file (with images) import completes in under two minutes
**Constraints**: Local-only processing; validate before writing; never overwrite an existing target path (file or image); current vault stays active throughout; no new backend or network access
**Scale/Scope**: A new source-vault + file picker plus a copy/plan utility parameterized over source and target vault ids; excludes content-aware entity merging, overwrite choices, and guest/demo import

## Constitution Check

- **Library-first**: PASS — the copy-plan/copy logic (path validation, conflict detection, image-reference resolution) belongs in `@codex/vault-engine` alongside `AssetManager`/`WorldService` since it's vault-storage domain logic, not UI; only the picker and review dialog live in `apps/web`.
- **TDD**: PASS — cover: file selection → plan (added/conflicting), image reference resolution (present, missing, thumbnail), non-overwriting write, source-vault-unreadable, partial-write-failure reporting, and post-import re-indexing, before finalizing.
- **Privacy/client-side**: PASS — source and target vaults are both local OPFS directories under the same browser origin; nothing leaves the device, no new network access.
- **DI**: PASS — the copy-plan/copy service takes `rootHandle` and a `db`/index-rebuild dependency through its constructor with production defaults, matching `WorldService`'s existing DI pattern (ADR 007); no new global singleton beyond the existing `vaultRegistry`.
- **Style/accessibility/natural language**: PASS — Svelte 5 Runes, semantic theme tokens, Iconify classes, keyboard-reachable vault and file pickers, plain-language review/errors ("Import from another vault", not "Cross-vault ingestion").
- **Documentation**: PASS — add a help article (or extend the existing portable-backup one) explaining this copies only new files and their images, and does not merge or replace existing files.
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
├── vault-import.ts                 # NEW: plan(sourceVaultId, targetVaultId, selectedPaths) + copy(), image-ref resolution
├── vault-import.test.ts            # NEW
├── asset-manager.ts                # existing: image/thumbnail path conventions reused, not duplicated
└── services/WorldService.ts        # existing: entity path + frontmatter shape referenced for image-ref extraction

apps/web/src/lib/
├── stores/vault-registry.svelte.ts       # existing: availableVaults list, rootHandle — source for "other vaults" list
├── utils/opfs.ts                         # existing: getVaultDir, walkOpfsDirectory, readOpfsBlob, writeOpfsFile — reused as-is
├── stores/vault.svelte.ts                # existing: entityStore.rebuildIndexes() called after a successful copy into the active vault
├── components/vaults/VaultImportPickerModal.svelte   # NEW: choose source vault → browse/select files → review → confirm
├── components/vaults/VaultImportPickerModal.test.ts  # NEW
└── content/help/offline-sync.md          # updated: vault-to-vault import guidance
```

**Structure Decision**: Put the vault-to-vault plan/copy/image-resolution logic in `packages/vault-engine` (Principle I: Library-First — it's vault storage domain logic reusable outside this one modal), and keep only the picker UI and review flow in `apps/web`. This mirrors how `AssetManager` and `WorldService` already split storage logic from UI. A new modal component is added rather than extending `VaultBackupSettings.svelte`, since the entry point and mental model (pick a vault → pick files, not upload a backup) differ enough to warrant its own component; it can be launched from the vault switcher and/or backup settings surface.

## Complexity Tracking

No constitution violations or complexity exceptions are required.
