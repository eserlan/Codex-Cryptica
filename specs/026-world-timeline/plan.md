# Implementation Plan: Graph-Native World Timeline

**Branch**: `026-world-timeline` | **Date**: 2026-01-31 | **Spec**: [specs/026-world-timeline/spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-world-timeline/spec.md`

## Summary

Transform the primary Cytoscape knowledge graph into a chronological visualization tool. This feature introduces temporal metadata parsing and a new "Timeline Mode" for the graph engine, where nodes are positioned along a time axis (Horizontal or Vertical) while maintaining their relational edges.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Svelte 5, Cytoscape.js, Turborepo  
**Storage**: OPFS / Local File System (Markdown + YAML Frontmatter)  
**Testing**: Vitest (Unit/Integration), Playwright (E2E)  
**Target Platform**: PWA (Modern Browsers)
**Project Type**: Monorepo (Web App + Packages)  
**Performance Goals**: < 500ms for layout transition of 500+ nodes  
**Constraints**: Constitution Law II (Relational-First), Law III (Sub-100ms UI response)

## Constitution Check

- **I. Local-First Sovereignty**: PASS. Data remains in Markdown frontmatter.
- **II. Relational-First Navigation**: PASS. Timeline is a view _of_ the graph, not a replacement.
- **III. Sub-100ms Performance**: PASS. Layout calculations happen in-memory; animations use hardware-accelerated canvas.
- **VI. Pure Functional Core**: PASS. Coordinate mapping logic is a pure function in `graph-engine`.

## Project Structure

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── graph/
│   │   │       └── TimelineControls.svelte # Orientation toggles and range filters
│   │   └── stores/
│   │       └── graph.svelte.ts             # Integrated timeline state
packages/
├── graph-engine/
│   └── src/
│       ├── layouts/
│       │   └── timeline.ts                 # Linear temporal layout logic
│       └── renderer/
│           └── overlays.ts                 # Canvas ruler and era backgrounds
└── schema/
    └── src/                                # Temporal metadata types
```

**Structure Decision**: Integrated approach. Logic resides primarily in `packages/graph-engine` to ensure the timeline remains a first-class feature of the visualization engine.
