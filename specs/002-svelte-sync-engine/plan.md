# Implementation Plan: Svelte-Native Sync Engine

**Branch**: `002-svelte-sync-engine` | **Date**: 2026-01-23 | **Spec**: [specs/002-svelte-sync-engine/spec.md](spec.md)
**Input**: Feature specification from `specs/002-svelte-sync-engine/spec.md`

## Summary

Implement a reactive synchronization pipeline using Svelte Stores to bridge local Markdown files and the Cytoscape graph. The architecture centers on a "Single Store of Truth" (`Vault Store`) that reflects the file system state and drives a derived `Graph Store` for the UI, ensuring <100ms updates and offline capabilities without a Virtual DOM.

## Technical Context

**Language/Version**: TypeScript 5.0+
**Primary Dependencies**: Svelte 5 (or 4, TBD), Cytoscape.js, RxDB (optional, spec mentions "RxDB + OPFS"), File System Access API
**Storage**: Local File System (OPFS) via File System Access API
**Testing**: Vitest (Unit/Integration), Playwright (E2E - implied by "Headless browser" requirement in Constitution)
**Target Platform**: Web (PWA), Local-First
**Project Type**: Monorepo (Turbo) - `apps/web`, `packages/graph-engine`, `packages/schema`
**Performance Goals**: < 100ms graph updates, "Instant Load"
**Constraints**: Offline-first, No "Phone Home", Pure Functional Core
**Scale/Scope**: Local Markdown files (potentially 100s-1000s)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Local-First Sovereignty**: Uses OPFS/Local FS. No central DB. (Re-verified: Design uses File System Access API)
- [x] **II. Relational-First Navigation**: Graph is derived from content. (Re-verified: Derived stores)
- [x] **III. Sub-100ms Performance**: Svelte fine-grained reactivity + Web Workers. (Re-verified: Svelte 5 runes)
- [x] **IV. Atomic Worldbuilding**: Sync engine is a distinct module ("The Pulse").
- [x] **V. System-Agnostic Core**: Schema is generic (Entity/Connection).
- [x] **VI. Pure Functional Core**: Transformations (Vault -> Graph) should be pure.
- [x] **VII. Verifiable Reality**: Tests required (Unit, Integration, E2E).
- [x] **VIII. Test-First PWA Integrity**: Offline support required.

## Project Structure

### Documentation (this feature)

```text
specs/002-svelte-sync-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec validation
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── stores/
│   │   │   ├── vault.ts       # The "Single Store of Truth"
│   │   │   ├── graph.ts       # Derived store for Cytoscape
│   │   │   └── settings.ts    # User preferences
│   │   └── workers/
│   │       └── sync.ts        # File watcher/parser worker
│   └── routes/
│       └── +layout.svelte     # Store initialization

packages/graph-engine/         # Core graph logic
packages/schema/               # Shared types (Entity, Connection)
```

**Structure Decision**: Monorepo structure with shared logic in `packages/` and Svelte-specific wiring in `apps/web`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (None)    |            |                                     |