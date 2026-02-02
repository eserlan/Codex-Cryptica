# Research: Central Node Orbit Layout

**Feature**: `032-central-node-orbit`
**Status**: Research Complete

## 1. Layout Strategy

### Decision
Use Cytoscape.js built-in `concentric` layout algorithm.

### Rationale
- **Performance**: The `concentric` layout is geometric and deterministic, making it significantly faster than physics-based layouts (like `cola` or `cose`). It meets the <100ms requirement for typical graph sizes (up to 500 nodes).
- **Control**: It allows explicit mapping of nodes to "levels" (orbits) via a callback function.
- **Built-in**: No external dependencies or heavy plugins required.

### Implementation Details
The `concentric` layout requires a numeric value for each node to determine its distance from the center. Higher values = closer to center.

**Algorithm:**
1.  **Input**: User selects `centralNode`.
2.  **Calculation**: Perform a Breadth-First Search (BFS) starting from `centralNode`.
    -   `centralNode`: Distance 0
    -   Neighbors: Distance 1
    -   ...
    -   Unreachable: Distance Infinity
3.  **Mapping**:
    -   Assign `concentric` value: `MaxDepth - Distance`.
    -   Or simply `1 / (Distance + 1)`.
4.  **Execution**: Run `layout.run()`.

## 2. State Management

### Decision
Use Svelte 5 Runes or Stores to manage `orbitMode` state in the ephemeral UI layer, but delegate actual graph logic to `packages/graph-engine`.

### Rationale
- **Separation of Concerns**: The Reactivity belongs in the UI (showing the "Exit" button), but the Graph manipulation belongs in the engine.
- **Transient State**: The "Central Node" is a view-only state. It does not need to be persisted to disk/Markdown. It resets on reload (per spec).

## 3. Performance & Animation

### Decision
Use Cytoscape's native `animate: true` option in the layout configuration.

### Rationale
-   **Smoothness**: Cytoscape handles the interpolation of node positions automatically.
-   **Config**: `animationDuration: 500`, `animationEasing: 'ease-in-out-cubic'`.

## 4. Edge Cases (Islands)

### Decision
Nodes unreachable from the central node will be assigned a "max distance" value.

### Rationale
-   This places them in the outermost orbit, visually indicating they are "far away" or disconnected, satisfying the edge case requirement in the spec.

## 5. Alternatives Considered

| Alternative | Pros | Cons |
| :--- | :--- | :--- |
| `cytoscape-avsdf` | Circular layout | Less control over specific orbits |
| `breadthfirst` layout | Hierarchy visible | Often produces "tree" cone shapes, not concentric rings |
| Custom Position Calc | Total control | Complex math, reinventing the wheel, slower dev time |
