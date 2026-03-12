# Implementation Plan: GraphView Component Refactor

**Branch**: `070-graph-view-refactor` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)

## Summary

Refactor the `GraphView.svelte` "God File" (~1,300 lines) by extracting UI overlays, complex layout logic, and event listeners into modular components and domain-specific engines. The goal is to reduce the main component to under 250 lines while ensuring zero functional regressions and maintaining incremental image resolution performance.

## Technical Context

**Language/Version**: TypeScript 5.x / Svelte 5 (Runes)  
**Primary Dependencies**: Cytoscape.js, cytoscape-fcose, Lucide Svelte, Tailwind 4  
**Storage**: OPFS (via VaultStore), IndexedDB (via GraphStore)  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Modern Browsers (Web)
**Project Type**: Monorepo (apps/web + packages/graph-engine)  
**Performance Goals**: Maintain 60fps interaction on graphs with 300+ nodes; eliminate "final flash" on load.  
**Constraints**: Pure Svelte 5 reactivity (Runes); no side-effects in derivations.

## Constitution Check

- [x] Use Svelte 5 Runes ($state, $derived, $effect)
- [x] Maintain "Local-First" architecture (sync via stores)
- [x] No side-effects in `$derived`
- [x] Prefix unused vars with `_`

## Project Structure

### Documentation (this feature)

```text
specs/070-graph-view-refactor/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task list
```

### Source Code Changes

```text
apps/web/src/lib/components/
├── GraphView.svelte             # Main container (orchestrator)
└── graph/
    ├── GraphHUD.svelte          # extracted (Phase 2)
    ├── GraphToolbar.svelte      # extracted (Phase 2)
    ├── GraphTooltip.svelte      # extracted (Phase 1)
    └── EdgeEditorModal.svelte   # extracted (Phase 1)

packages/graph-engine/src/
├── LayoutManager.ts             # New: extracted layout logic (Phase 3)
├── GraphStyles.ts               # New: extracted style generation (Phase 3)
└── events/
    └── useGraphEvents.ts        # New: extracted event handling (Phase 4)
```

**Structure Decision**: A phased approach starting with UI component extraction (lowest risk) followed by logic engine isolation in `packages/graph-engine` to maintain clean separation between UI and the visualization engine.

## Phase 1: Modular Overlays (UI)

- **Goal**: Move isolated UI logic out of the main template.
- **Components**: `GraphTooltip.svelte`, `EdgeEditorModal.svelte`.
- **Impact**: Simplifies the bottom of the `GraphView` template and script block.

## Phase 2: Controls & HUD (UI)

- **Goal**: Clean up the HUD and Toolbar.
- **Components**: `GraphHUD.svelte`, `GraphToolbar.svelte`.
- **Impact**: Removes ~300 lines of Tailwind-heavy markup and UI-only state.

## Phase 3: Engine Extraction (Logic)

- **Goal**: Isolate Cytoscape configuration and layout algorithms.
- **Files**: `LayoutManager.ts`, `GraphStyles.ts`.
- **Impact**: Moves business logic to `packages/graph-engine`, making it reusable and easier to unit test.

## Phase 4: Lifecycle & Event Decoupling (Logic)

- **Goal**: Final reduction of `GraphView.svelte`.
- **Files**: `useGraphEvents.ts`, `useGraphSync.ts`.
- **Impact**: The main component becomes a thin wrapper that mounts the canvas and orchestrates high-level lifecycle events.
