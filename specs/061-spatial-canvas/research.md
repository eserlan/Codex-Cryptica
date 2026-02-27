# Research: Interactive Spatial Canvas

## Decision: Core Engine

- **Decision**: Use `@xyflow/svelte` (Svelte Flow).
- **Rationale**: It is the industry standard for node-based interfaces in Svelte. It handles infinite pan/zoom, coordinate mathematics, and selection logic out of the box. It supports Svelte 5.
- **Alternatives Considered**:
  - `Cytoscape.js`: Already used for the automated graph, but it's more suited for force-directed layouts than free-form UI design.
  - `SVG + Custom Logic`: Too much boilerplate for pan/zoom and collision detection.

## Decision: Data Format (.canvas)

- **Decision**: Adopt a JSON schema compatible with (or inspired by) the [Obsidian Canvas JSON format](https://jsoncanvas.org/).
- **Rationale**: Interoperability with other worldbuilding tools. It is simple, well-documented, and handles nodes/links cleanly.
- **Refinement**: We will store only Entity IDs in the nodes to maintain the "No Duplication" rule.

## Decision: Drag and Drop

- **Decision**: Use the Native HTML5 Drag and Drop API combined with Svelte Flow's `on:dragover` and `on:drop` handlers on the canvas container.
- **Rationale**: Lightweight and consistent with how other file interactions work in the app.

## Research Findings: Svelte 5 Compatibility

- `@xyflow/svelte` version 0.1.x+ has improved support for Svelte 5.
- We should use Svelte 5 Runes ($state, $derived) within our `canvas-engine` store to manage the "live" state before persisting to OPFS.

## Integration Patterns: Palette Sidebar

- The Palette will be a Svelte component in `apps/web` that reads from the existing `vault` store.
- It will include a `FlexSearch` powered filter bar, leveraging the existing `@codex/search-engine`.
