# Implementation Plan: Import Progress Management

**Branch**: `046-import-state-management` | **Date**: 2026-02-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/046-import-state-management/spec.md`

## Summary

Implement a resilient import progress tracking system that uses SHA-256 hashing to uniquely identify files and stores processing state in IndexedDB. This allows the system to skip already-processed chunks when resuming an interrupted import or re-importing identical files, saving AI tokens and user time.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: `idb` (IndexedDB wrapper), Web Crypto API (for hashing), Svelte 5 (Runes)  
**Storage**: IndexedDB (new `import_registry` store)  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Modern Browsers (Web Crypto + IndexedDB support required)
**Project Type**: Web (Monorepo)  
**Performance Goals**: File hashing < 2s for 10MB file, Registry lookup < 100ms  
**Constraints**: Client-side only (Privacy), offline-capable  
**Scale/Scope**: Limit registry to 10 most recent file signatures

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Logic will be integrated into the existing `packages/importer` package. [PASS]
2. **TDD**: Unit tests for hashing and state transitions are mandatory. [PASS]
3. **Simplicity**: Uses native Web Crypto API for SHA-256 rather than a custom library. [PASS]
4. **AI-First**: Enhances the Oracle workflow by making it stateful and cost-efficient. [PASS]
5. **Privacy**: All hashing and progress data remain in the user's browser (IndexedDB). [PASS]
6. **Clean Implementation**: Will follow Svelte 5 and Tailwind 4 standards. [PASS]
7. **User Documentation**: Updated help guides and FeatureHints included in design. [PASS]

## Project Structure

### Documentation (this feature)

```text
specs/046-import-state-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
packages/
└── importer/
    ├── src/
    │   ├── persistence.ts # UPDATED: Handle ImportRegistry IO
    │   ├── utils.ts       # UPDATED: Add crypto hashing
    │   └── types.ts       # UPDATED: Add ImportState types
apps/
└── web/
    └── src/
        └── lib/
            ├── components/
            │   └── import/
            │       └── ImportProgress.svelte # NEW: Segmented progress UI
            └── stores/
                └── import-queue.svelte.ts    # NEW: Manage strict queueing
```

**Structure Decision**: Monorepo. Enhancements to `packages/importer` ensure the core logic remains reusable and decoupled from the UI.
