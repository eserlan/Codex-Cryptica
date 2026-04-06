# Research: Graph-Native World Timeline

## Decision: Coordinate Mapping for Time Axis

**Rationale**: To render a timeline on the Cytoscape canvas, we will map the `year` metadata to a specific axis (X for Horizontal, Y for Vertical).

- **Horizontal**: `x = (year - minYear) * scaleFactor`, `y` is determined by a force-directed or grid-based "jitter" to prevent node overlap.
- **Vertical**: `y = (year - minYear) * scaleFactor`, `x` is determined by "jitter".
  **Rationale**: This allows for a linear representation of time while preserving relational edges.

## Decision: Cytoscape `preset` Layout for Transitions

**Rationale**: Switching between "Organic" (force-directed) and "Chronological" modes will use Cytoscape's `preset` layout. We will pre-calculate the positions for all nodes and use `.layout({ name: 'preset', animate: true, animationDuration: 500 }).run()` for a smooth visual transition.
**Alternatives considered**: Building a custom Cytoscape layout extension (rejected as too complex for MVP; `preset` with pre-calculated coords is more flexible).

## Decision: Canvas Background Eras (Compound Nodes or Layers)

**Rationale**: "Eras" will be visualized as large, non-interactive background rectangles.

- **Strategy**: We will use Cytoscape's `background-image` or a custom canvas layer (via `cytoscape-canvas` or similar) to draw shaded regions behind the nodes.
- **Alternative**: Compound nodes (rejected because nodes can only belong to one parent, and eras might overlap or contain entities that shouldn't be "trapped" in a hierarchy).

## Decision: Dynamic Scale Factor

**Rationale**: The `scaleFactor` (pixels per year) must be adjustable or automatically calculated based on the total span of the vault's history to ensure the timeline remains readable regardless of whether it spans 10 years or 10,000.
