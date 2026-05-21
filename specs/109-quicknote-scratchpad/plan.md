# Implementation Plan: QuickNote Fast Scratchpad & AI Entity Elevation

**Branch**: `109-quicknote-scratchpad` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/109-quicknote-scratchpad/spec.md`

## Summary

Implements a lightweight floating scratchpad for Game Masters to dump fleeting ideas instantly via global hotkeys. Notes are persisted locally via IndexedDB and can be elevated by the Oracle engine into structured wiki entities or visualized as "dotted" draft nodes on the relationship graph.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes  
**Primary Dependencies**: Svelte 5, Dexie (IndexedDB), Cytoscape.js  
**Storage**: IndexedDB (`quick_notes` store)  
**Testing**: Vitest  
**Target Platform**: Browser  
**Project Type**: Web Application  
**Performance Goals**: <150ms activation latency  
**Constraints**: Local-first persistence, Oracle integration  
**Scale/Scope**: Single floating component, new DB store, Cytoscape style extension

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Library-First**: Logic encapsulated in `QuickNoteService` and `graph-engine`.
- [x] **TDD**: Vitest coverage for service and storage logic.
- [x] **Simplicity**: Standard Dexie/Svelte patterns.
- [x] **AI-First**: Uses Oracle for elevation.
- [x] **Privacy**: Local-first storage.
- [x] **DI**: Constructor-based DI for services.

## Project Structure

### Documentation (this feature)

```text
specs/109-quicknote-scratchpad/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   └── quicknote/
│   ├── services/
│   │   └── QuickNoteService.ts
│   └── stores/
│       └── quicknote.svelte.ts
packages/
└── graph-engine/ (styles)
```

**Structure Decision**: Integrated into `apps/web` as a core UI utility with storage services.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       |            |                                      |
