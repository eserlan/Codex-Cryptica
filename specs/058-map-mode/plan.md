# Implementation Plan: Interactive Campaign Mapping & Spatial Lore

**Branch**: `058-map-mode` | **Date**: 2026-02-23 | **Spec**: [specs/058-map-mode/spec.md](./spec.md)
**Input**: Feature specification from `/specs/058-map-mode/spec.md`

## Summary

Transform Codex Cryptica into a spatial lore experience by implementing a custom "Map Mode" powered by a high-performance **HTML5 Canvas** engine. This mode provides pixel-locked pin placement, hierarchical navigation (World -> City), and a persistent Fog of War masking system, all while maintaining absolute privacy.

### Key Technical Integrations

- **Deep Linking**: Pins utilize `uiStore.openZenMode(entityId, tab)` to allow instant jumping to an entity's Overview or its associated Map.
- **Hierarchical Navigation**: Map pins for entities with their own maps surface a direct "Enter" action, updating the `MapStore` navigation stack.
- **Resource Cleanup**: `vault.deleteMap(id)` implements recursive deletion of metadata and OPFS-stored binary files (WebP assets and PNG masks).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Svelte 5 (Runes), **packages/map-engine** (New standalone library), `marked` (tooltips).
**Storage**: OPFS (Images), IndexedDB/Markdown (Metadata/Pins).
**Testing**: Vitest (Unit), Playwright (E2E).
**Target Platform**: Web (Local-First).
**Project Type**: web
**Performance Goals**: 60 FPS panning/zooming on 4K assets with 1000+ pins.
**Constraints**: Absolute privacy (no server-side image processing), 100% offline functionality.
**Scale/Scope**: New `MapEngine` package, `MapView` component in web app, and entity-linkage extensions.

## Constitution Check

- **I. Library-First**: All core coordinate math, Canvas rendering logic, and spatial state will be encapsulated in `packages/map-engine`.
- **II. TDD**: `packages/map-engine` will have 100% unit test coverage for coordinate transforms and navigation logic.
- **III. Simplicity & YAGNI**: Avoiding heavy GIS libraries (Leaflet) in favor of a lightweight custom engine.
- **IV. AI-First Extraction**: Oracle can help propose pin placements based on chronicle descriptions.
- **V. Privacy & Client-Side Processing**: All images stored in OPFS; all rendering on client.
- **VI. Clean Implementation**: Follows Svelte 5 Rune patterns.
- **VII. User Documentation**: Feature help article added to `help-content.ts`.

## Project Structure

### Documentation (this feature)

```text
specs/058-map-mode/
├── plan.md              # This file
├── research.md          # Technology and implementation decisions
├── data-model.md        # Map, Pin, and Mask entities
├── quickstart.md        # User verification steps
├── contracts/           # Internal state interfaces
└── tasks.md             # Implementation task list
```

### Source Code (repository root)

```text
packages/
├── schema/              # Shared data models
│   └── src/
│       └── map.ts       # New: Map, Pin, and Mask schemas
└── map-engine/          # New: Core Canvas logic and spatial math
    ├── src/
    │   ├── index.ts     # Public API
    │   ├── renderer.ts  # Canvas render loop
    │   └── math.ts      # Coordinate transforms
    └── tests/           # Unit tests for math/rendering

apps/web/src/
├── lib/
│   ├── components/
│   │   └── map/         # MapView UI components (wraps map-engine)
│   └── stores/
│       └── map.svelte.ts # Reactive Map state for the web app
└── routes/
    └── map/             # Map Mode entry route
```

**Structure Decision**: Integrated as a new top-level view within `apps/web` with dedicated components and a `map` store.

## Complexity Tracking

| Violation               | Why Needed                                   | Simpler Alternative Rejected Because         |
| ----------------------- | -------------------------------------------- | -------------------------------------------- |
| Custom Canvas Rendering | Pixel-perfect pin locking on high-res assets | DOM-based pins degrade performance at scale. |
