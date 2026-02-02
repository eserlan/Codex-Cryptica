# Implementation Plan: Central Node Orbit Layout

**Branch**: `032-central-node-orbit` | **Date**: 2026-02-02 | **Spec**: [specs/032-central-node-orbit/spec.md](spec.md)
**Input**: Feature specification from `/specs/032-central-node-orbit/spec.md`

## Summary

Implement a "Central Node Orbit" layout mode in the graph engine using Cytoscape.js's `concentric` layout. This feature allows users to select a node as the visual anchor, arranging all other nodes in concentric rings based on their shortest-path distance (BFS) from the anchor. It includes UI controls to activate/deactivate this mode and handles smooth transitions between states.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `cytoscape` (Core), `svelte` (UI)
**Storage**: N/A (Transient view state)
**Testing**: Vitest (Unit/Integration), Playwright (E2E)
**Target Platform**: Browser (Web)
**Project Type**: Monorepo (Web App + Packages)
**Performance Goals**: Layout calculation < 100ms for < 500 nodes.
**Constraints**: Must not block main thread for noticeable duration; must handle disconnected nodes gracefully.
**Scale/Scope**: Client-side visualization feature.

## Constitution Check

_GATE: Passed._

-   **Local-First Sovereignty**: Compliant. No server data required.
-   **Relational-First Navigation**: Compliant. Enhances graph navigation.
-   **The Sub-100ms Performance Mandate**: Compliant. `concentric` layout is $O(N)$/$O(N \log N)$ and very fast.
-   **Atomic Worldbuilding**: Compliant. Logic resides in `graph-engine`, UI in `web`.

## Project Structure

### Documentation (this feature)

```text
specs/032-central-node-orbit/
├── plan.md              # This file
├── research.md          # Layout strategy and options
├── data-model.md        # Runtime state definitions
├── quickstart.md        # User guide
├── contracts/           # Interfaces
│   └── orbit.ts         # Logic interface
└── tasks.md             # To be generated
```

### Source Code (repository root)

```text
packages/
├── graph-engine/
│   ├── src/
│   │   ├── layouts/
│   │   │   └── orbit.ts       # Core logic for concentric calculation
│   │   └── graph.ts           # Integration into main class
│   └── tests/
│       └── orbit.test.ts      # Unit tests for level calculation

apps/
├── web/
    ├── src/
    │   ├── lib/
    │   │   ├── components/
    │   │   │   └── graph/
    │   │   │       ├── OrbitControls.svelte  # "Exit" button / status
    │   │   │       └── ContextMenu.svelte    # "Set Central" action
    │   │   └── stores/
    │   │       └── graphStore.ts             # Tracks orbit mode state
    └── tests/
        └── orbit.spec.ts      # E2E test
```

**Structure Decision**: Logic in `graph-engine` package to keep the core clean; UI components in `apps/web`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| N/A | | |