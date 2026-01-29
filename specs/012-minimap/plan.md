# Implementation Plan: Minimap Navigation

**Branch**: `012-minimap` | **Date**: 2026-01-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-minimap/spec.md`

## Summary
Implement a high-performance, interactive minimap for the Cytoscape graph visualization. The minimap will provide a bird's-eye view of the entire graph, allow rapid viewport panning by dragging a "view rect", and support click-to-jump navigation.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Cytoscape.js (Graph Engine), Svelte 5 (UI Framework)
**Storage**: N/A (Transient UI state)
**Testing**: Vitest (Unit), Playwright (E2E for drag interactions)
**Target Platform**: Modern Web Browsers (Desktop & Mobile)
**Project Type**: Web application (SvelteKit)
**Performance Goals**: Render time < 16ms (60fps), Input latency < 100ms
**Constraints**: Must not block main thread. Must handle large graphs (100+ nodes) without degradation.
**Scale/Scope**: Single component integration within `GraphView.svelte`.

## Constitution Check

_GATE: Pass_

1. **Local-First**: YES. Pure UI feature, no external data.
2. **Relational-First**: YES. Enhances navigation of the core graph.
3. **Performance**: YES. Will use optimized rendering (Canvas or simplified SVG) to avoid main-thread blocking.
4. **No Phone Home**: YES.
5. **Modularity**: YES. Will be implemented as a standalone `Minimap` component.
6. **Verifiable**: YES. Playwright tests will verify drag-to-pan logic.

## Project Structure

### Documentation (this feature)

```text
specs/012-minimap/
├── plan.md              # This file
├── research.md          # Implementation approach analysis
├── data-model.md        # Component state & event definitions
├── quickstart.md        # Integration guide
└── tasks.md             # Implementation tasks
```

### Source Code

```text
apps/web/src/
├── lib/
│   └── components/
│       └── graph/
│           └── Minimap.svelte    # New: Standalone minimap component
└── tests/
    └── minimap.spec.ts           # New: E2E tests for navigation
```

**Structure Decision**: Standard SvelteKit component structure. Placed in `lib/components/graph/` to keep graph-related UI co-located.