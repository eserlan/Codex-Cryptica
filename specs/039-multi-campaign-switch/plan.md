# Implementation Plan: Multi-Campaign Switch

**Branch**: `039-multi-campaign-switch` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/039-multi-campaign-switch/spec.md`

## Summary

Implement multi-vault support using OPFS as primary storage, with optional FSA sync. Each vault lives in an OPFS subdirectory. An IndexedDB registry tracks vault metadata for the picker UI. The existing `closeVault()` method handles state cleanup during switches.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Svelte 5, `idb`, OPFS (Browser Native)  
**Storage**: OPFS (Primary Files), IndexedDB (Metadata/Registry)  
**Sync**: FSA (Optional export/import to user filesystem)  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Web (Chrome/Edge/Safari/Firefox with OPFS support)
**Project Type**: Web Application (Monorepo)  
**Performance Goals**: <500ms vault switch time for 100+ nodes.  
**Constraints**: Client-side only, no server-side storage, offline-capable, mobile-first.  
**Scale/Scope**: Support for dozens of independent vaults per user.

## Constitution Check

1. **Library-First**: Multi-vault logic encapsulated in `apps/web/src/lib/stores/vault.svelte.ts` and `apps/web/src/lib/utils/`.
2. **TDD**: New unit tests for vault registry logic, switching, and migration.
3. **Simplicity**: Leveraging existing `idb`, OPFS patterns, and `closeVault()`.
4. **AI-First**: N/A (Storage/UX focused feature).
5. **Privacy**: All vault data remains in the user's browser (OPFS).

## Project Structure

### Documentation (this feature)

```text
specs/039-multi-campaign-switch/
├── plan.md              # This file
├── research.md          # Decision log
├── data-model.md        # OPFS and IDB schema
├── quickstart.md        # Verification steps
├── contracts/
│   └── vault-service.ts # Interface for switching
├── checklists/
│   └── requirements.md  # Quality check
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
apps/web/src/lib/
├── components/
│   └── vaults/
│       └── VaultSwitcherModal.svelte  # NEW
├── stores/
│   └── vault.svelte.ts                # UPDATED: OPFS primary + multi-vault
└── utils/
    ├── idb.ts                         # UPDATED: v5 schema with vaults store
    └── opfs.ts                        # NEW: OPFS directory utilities
```

**Structure Decision**: Integrated into existing `apps/web` structure as it modifies core storage behaviors.

## Key Architecture Change

Current `main` uses FSA (File System Access API) as primary storage. This feature refactors to OPFS as primary with FSA as optional sync:

| Aspect           | Before (FSA)                | After (OPFS + Sync)                |
| ---------------- | --------------------------- | ---------------------------------- |
| Primary I/O      | `showDirectoryPicker()`     | `navigator.storage.getDirectory()` |
| File operations  | `fs.ts` + `walkDirectory()` | `opfs.ts` + OPFS directory APIs    |
| Permission model | User-granted per session    | Always available, no prompts       |
| Multi-vault      | Single `rootHandle`         | `vaults/{id}/` subdirectories      |
| External access  | Direct file access          | Optional sync via FSA              |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      |            |                                      |
