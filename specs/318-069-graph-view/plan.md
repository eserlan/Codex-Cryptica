# Implementation Plan: GraphView Refactor

**Branch**: `069-graph-view-refactor` | **Date**: 2026-03-11 | **Spec**: `/specs/318-069-graph-view/spec.md`
**Input**: Feature specification from `/specs/318-069-graph-view/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor the monolithic `GraphView.svelte` (1,371 lines) into a modular set of Svelte components and pure logic services. Layout orchestration will move to `OracleLayoutManager`, event handling to a specialized Svelte action `useGraphEvents`, and UI overlays (Minimap, Tooltip, Controls) to dedicated components. This will reduce the main view to < 400 lines while maintaining 60fps performance.

## Technical Context

**Language/Version**: TypeScript 5.9.3 + Svelte 5 (Runes)
**Primary Dependencies**: Cytoscape.js, cytoscape-fcose, Lucide Svelte
**Storage**: N/A (Transient UI view state)
**Testing**: Vitest (Logic services), Playwright (Interactions)
**Target Platform**: Web Browser (Client-side)
**Project Type**: Web application (`apps/web`)
**Performance Goals**: Maintain 60fps (16ms) during graph interaction.
**Constraints**: MUST not break complex layout modes (Timeline, Orbit).
**Scale/Scope**: Refactoring ~1400 LOC UI component.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: Core layout logic will move to `packages/graph-engine` where appropriate, otherwise isolated in `lib/services/graph`. PASS.
- **II. Test-Driven Development (TDD)**: Extraction of logic into services allows isolated Vitest unit testing. PASS.
- **III. Simplicity & YAGNI**: Modularization of a 1400-line file is a mandatory simplicity improvement. PASS.
- **IV. AI-First Extraction**: N/A. PASS.
- **V. Privacy & Client-Side Processing**: 100% client-side rendering. PASS.
- **VI. Clean Implementation**: Utilizes Svelte 5 Runes ($state, $derived, $effect) and actions. PASS.
- **VII. User Documentation**: N/A (Internal refactoring). PASS.

## Project Structure

### Documentation (this feature)

```text
specs/318-069-graph-view/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
```

### Source Code (repository root)

```text
packages/graph-engine/   # Existing engine
└── src/
    └── layouts/         # Logic for specific layouts

apps/web/
└── src/
    └── lib/
        ├── components/
        │   ├── graph/
        │   │   ├── GraphControls.svelte # Extracted UI
        │   │   ├── Minimap.svelte       # Extracted UI
        │   │   ├── GraphTooltip.svelte  # Extracted UI
        │   │   └── useGraphEvents.ts    # Extracted action/logic
        │   └── GraphView.svelte         # Refactored: Thin Orchestrator
        └── services/
            └── graph/
                └── layout-manager.ts    # Extracted logic
```

**Structure Decision**: Logic moves to services and smaller components within `apps/web`. Heavy layout-specific math may move to `packages/graph-engine`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      |            |                                      |
