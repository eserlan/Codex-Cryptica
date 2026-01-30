# Implementation Plan: Sync Refinement & Deletion Support

**Branch**: `017-sync-refinement` | **Date**: 2026-01-29 | **Spec**: `/specs/017-sync-refinement/spec.md`

## Summary

Enhance the Sync Engine to support local-to-remote deletion propagation, implement remote deduplication via `multipart/related` GDrive uploads, and provide incremental progress feedback to the UI.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Google Drive API v3, Svelte 5, `idb`  
**Storage**: OPFS (Vault), IndexedDB (Metadata Store)  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Web (Modern Browsers)  
**Project Type**: Monorepo (Web App + Packages)  
**Performance Goals**: < 100ms main thread blocking during sync scans.  
**Constraints**: GDrive `appProperties` limit: 124 bytes for `vault_path`.  
**Scale/Scope**: Support archives with >1000 entities/images.

## Constitution Check

_GATE: PASS_

- **Local-First Sovereignty**: PASS. Data remains local; Drive is a mirror.
- **Relational-First Navigation**: PASS. Sync updates ensure graph consistency across devices.
- **Sub-100ms Performance**: PASS. Sync logic runs in Web Worker.
- **Test-First PWA Integrity**: PASS. Offline verification and E2E tests included in plan.

## Project Structure

### Documentation (this feature)

```text
specs/017-sync-refinement/
├── plan.md              # This file
├── research.md          # GDrive duplication & Deletion strategy
├── data-model.md        # SyncMetadata updates
├── quickstart.md        # Sync flow overview
└── tasks.md             # Execution steps
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/cloud-bridge/
│   ├── sync-engine/
│   │   ├── engine.ts       # Deletion logic & Deduplication
│   │   └── conflict.ts     # Conflict resolution
│   └── google-drive/
│       └── worker-adapter.ts # Multipart upload implementation
├── workers/
│   └── sync.ts             # Progress emission logic
└── stores/
    ├── sync-stats.ts       # Incremental stats store
    └── vault.svelte.ts     # Refresh loop integration
```

**Structure Decision**: Refactor existing `sync-engine` and `google-drive` adapter within the `web` app. Centralize shared constants for sync skew.

## Complexity Tracking

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| None                       |                    |                                      |