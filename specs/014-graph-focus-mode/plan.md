# Implementation Plan: Graph Focus Highlight

**Branch**: `014-graph-focus-mode` | **Date**: 2026-01-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-graph-focus-mode/spec.md`

## Summary

Implement a "Focus Mode" for the graph visualization. When a node is selected, its immediate neighborhood (connected nodes and edges) remains vivid while all other elements are dimmed (reduced opacity). This will be implemented using Cytoscape.js classes and selective styling to ensure sub-100ms visual feedback.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Cytoscape.js, Svelte 5
**Storage**: N/A (UI-only state)
**Testing**: Vitest (Unit logic), Playwright (Visual feedback verification)
**Target Platform**: Desktop & Mobile browsers
**Project Type**: Web application (SvelteKit)
**Performance Goals**: State transition < 100ms (Constitution Principle III)
**Constraints**: Must not override existing category colors or image backgrounds.
**Scale/Scope**: Applicable to graphs of any size; efficiency scales with Cytoscape selector performance.

## Constitution Check

_GATE: Pass_

1.  **Local-First**: YES. UI-only interaction.
2.  **Relational-First**: YES. Directly enhances the visualization of relationships.
3.  **Performance**: YES. Uses efficient Cytoscape classes and selectors.
4.  **No Phone Home**: YES.

## Project Structure

### Documentation (this feature)

```text
specs/014-graph-focus-mode/
├── plan.md              # This file
├── research.md          # Cytoscape highlighting strategy
├── data-model.md        # Style class definitions
├── quickstart.md        # Integration guide
└── tasks.md             # Implementation tasks
```

### Source Code

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   └── GraphView.svelte    # Updated: Selection event handling
│   └── themes/
│       └── graph-theme.ts      # Updated: New focus/dimmed styles
```

**Structure Decision**: Refactor existing graph theme and event listeners to support the "neighborhood" highlight state.
