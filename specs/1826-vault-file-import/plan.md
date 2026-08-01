# Implementation Plan: Import Vault Files into Current Vault

**Branch**: `1826-vault-file-import` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/1826-vault-file-import/spec.md`

## Summary

Extend the existing portable `.codex.zip` backup workflow with a second, explicitly confirmed current-vault import path. Reuse archive validation and OPFS storage, calculate conflicts before writing, copy only new paths, and refresh the current vault only after a successful write.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: Existing `fflate` archive parsing, `@codex/vault-engine`, Svelte 5, existing notification confirmation UI  
**Storage**: Browser-local OPFS vault directories and IndexedDB-backed vault registry; no new persistence format  
**Testing**: Vitest unit tests, Svelte component tests, Svelte check, ESLint  
**Target Platform**: Modern browsers supporting the existing OPFS vault storage  
**Project Type**: Browser-first web application  
**Performance Goals**: Prepare and present an archive of up to 500 files without blocking interaction; import completes in under two minutes on a typical local device  
**Constraints**: Local-only processing; validate before writing; never overwrite an existing target path; no new backend or network access  
**Scale/Scope**: One settings-surface flow for `.codex.zip` backups; excludes content-aware entity merging, overwrite choices, and guest/demo import

## Constitution Check

- **Library-first**: PASS — archive validation and safe copy behavior remain in the existing app-local archive utility because they operate on browser OPFS/UI concerns only.
- **TDD**: PASS — cover successful add, conflicts/no overwrite, invalid archive, cancellation, and component presentation before finalizing.
- **Privacy/client-side**: PASS — the backup is read and copied entirely in the browser; no vault contents leave the device.
- **DI**: PASS — no new long-lived service or store is introduced; pure archive helpers accept their dependencies through existing module boundaries.
- **Style/accessibility/natural language**: PASS — Svelte 5 Runes, semantic theme tokens, Iconify classes, keyboard-reachable file picker, and plain-language review/errors.
- **Documentation**: PASS — update the portable-backup help article and its registration if necessary.
- **Validation**: PASS — run affected tests, Svelte check, repository lint, and repository tests.

## Project Structure

```text
specs/1826-vault-file-import/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── current-vault-import.md

apps/web/src/lib/
├── utils/vault-archive.ts                 # archive parsing, conflict planning, safe writes
├── utils/vault-archive.test.ts            # archive merge tests
├── components/settings/VaultBackupSettings.svelte
├── components/settings/VaultBackupSettings.test.ts
└── content/help/offline-sync.md           # user-facing guidance
```

**Structure Decision**: Extend the established portable-backup settings component and archive utility. The feature is browser- and vault-specific, so a new workspace package would add an unnecessary abstraction.

## Complexity Tracking

No constitution violations or complexity exceptions are required.
