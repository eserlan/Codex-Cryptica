# Implementation Plan: Interactive Spatial Canvas

**Branch**: `061-spatial-canvas` | **Date**: 2026-02-26 | **Spec**: [/specs/061-spatial-canvas/spec.md](./spec.md)
**Input**: Feature specification for a free-form, persistent spatial canvas mode ("Infinite Living Desk").

## Summary

Implement a new persistent workspace called "Spatial Canvas" that allows users to manually arrange vault entities as cards on an infinite board. Unlike the automated graph, this mode emphasizes "Spatial Intentionality," where positions and visual links are manually defined and saved. We will leverage `@xyflow/svelte` (Svelte Flow) for the canvas engine and create a new package `packages/map-engine` (or extend it) to handle the logic, though a dedicated `packages/canvas-engine` might be cleaner.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ / Svelte 5 (Runes)  
**Primary Dependencies**: `@xyflow/svelte` (for canvas management), `lucide-svelte` (icons), `idb` (metadata management)  
**Storage**: OPFS (Origin Private File System) for `.canvas` JSON files; IndexedDB for canvas registry and metadata.  
**Testing**: Vitest (unit/integration), Playwright (E2E)  
**Target Platform**: Browser (Native APIs)
**Project Type**: Workspace Package (`packages/canvas-engine`) + Web Application View (`apps/web`)  
**Performance Goals**: 60fps interaction (pan/zoom/drag) with 100+ entities; <300ms canvas switching.  
**Constraints**: Local-first architecture; No data duplication (store references, not content); Svelte 5 Runes compliance.  
**Scale/Scope**: Support for multiple independent canvases per vault; arbitrary node placement and manual linking.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Library-First**: MUST create `packages/canvas-engine` to house the coordinate math, link logic, and persistence serialization.
- **TDD**: Vitest suite required for `canvas-engine` (serialization, coordinate transforms).
- **Simplicity**: Use `@xyflow/svelte` to avoid reinventing the wheel for infinite canvas math.
- **Privacy**: All processing remains client-side; `.canvas` files stored in user's vault.
- **AI Guardrails**: Adhere to Svelte 5 Runes and Tailwind 4 syntax.
- **User Documentation**: Add a new guide to `help-content.ts` and a `FeatureHint` for the Canvas button.

## Project Structure

### Documentation (this feature)

```text
specs/061-spatial-canvas/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── checklists/
    └── requirements.md  # Spec validation
```

### Source Code (repository root)

```text
packages/
├── canvas-engine/       # NEW: Core logic for spatial organization
│   ├── src/
│   │   ├── store.ts     # Canvas state management (Runes)
│   │   ├── types.ts     # Zod schemas for .canvas format
│   │   └── index.ts     # Public API
│   └── tests/           # Serialization/Deserialization tests
apps/
└── web/
    └── src/
        ├── lib/
        │   └── components/
        │       └── canvas/ # Svelte components for the UI
        └── routes/
            └── canvas/     # Dedicated route for canvas mode
```

**Structure Decision**: A new package `packages/canvas-engine` will be created to ensure the canvas logic is decoupled from the UI, following the **Library-First** principle.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |

## Phase 2: Planning (Roadmap)

### Milestone 1: Core Engine & Data Model

- Initialize `packages/canvas-engine` with Zod schemas for `.canvas` format.
- Implement the `CanvasStore` using Svelte 5 Runes for state management.
- Add unit tests for canvas serialization and node/edge management.

### Milestone 2: Basic Canvas UI

- Scaffold `apps/web/src/routes/canvas` and integrate `@xyflow/svelte`.
- Implement basic node rendering for Vault entities.
- Support manual node placement and visual link creation.

### Milestone 3: Palette & Interaction

- Build the "Palette" sidebar with filtering and search capabilities.
- Implement drag-and-drop from the Palette into the Svelte Flow canvas.
- Integrate "Zen Mode" for entity editing when clicking a canvas node.

### Milestone 4: Persistence & Multi-Canvas

- Implement OPFS storage for `.canvas` files.
- Add multi-canvas management (Create, Rename, Delete, Switch).
- Verify synchronization and performance with 100+ entities.
