# Research: Minimap Implementation Strategy

**Feature**: Minimap Navigation (012-minimap)
**Date**: 2026-01-29

## Decision: Custom Canvas-based Minimap

We will implement a custom `Minimap` component using a simplified Canvas rendering layer that syncs with the main Cytoscape instance, rather than using the `cytoscape-navigator` plugin.

### Rationale

1.  **Dependency Hygiene**: `cytoscape-navigator` historically has dependencies on jQuery or legacy browser APIs that conflict with modern Svelte/Vite setups. Keeping the project dependency-free reduces bloat and maintenance risk.
2.  **Performance Control**: By implementing a custom loop, we can throttle updates (e.g., using `requestAnimationFrame`) and use simplified rendering logic (drawing dots/lines instead of full Cytoscape elements) to ensure the minimap never degrades main graph performance.
3.  **Styling Consistency**: A custom component allows us to use Tailwind CSS for the container and viewport border, ensuring visual consistency with the rest of the application (e.g., the "Nord" theme).
4.  **Svelte 5 Reactivity**: We can leverage Svelte 5's runes for managing the viewport state (`x`, `y`, `zoom`) reactively, making the bidirectional sync between minimap and main graph smoother.

### Alternatives Considered

#### Option A: `cytoscape-navigator` Plugin
-   **Pros**: Out-of-the-box solution.
-   **Cons**: Often requires jQuery; styling is hardcoded or difficult to override; potential version mismatches with main Cytoscape; difficult to "Sveltify".
-   **Verdict**: Rejected due to dependency weight and lack of modular control.

#### Option B: Dual Cytoscape Instances
-   **Description**: Mount a second Cytoscape instance in the minimap div sharing the same elements JSON.
-   **Pros**: Perfect visual fidelity.
-   **Cons**: Double the memory overhead; double the layout calculation costs. Overkill for a "thumbnail" view.
-   **Verdict**: Rejected due to performance (Memory/CPU) concerns (Constitution Principle III).

#### Option C: SVG Replication
-   **Description**: Map Cytoscape nodes to SVG circles in Svelte.
-   **Pros**: Declarative, easy to style.
-   **Cons**: DOM node count overhead. 500 nodes = 500 SVG elements + edges. Can get sluggish. Canvas is more performant for "dumb" rendering of many points.
-   **Verdict**: Rejected in favor of Canvas for guaranteed scalability.

## Implementation Details

-   **Sync Strategy**:
    -   **Main -> Minimap**: Listen to `cy.on('viewport')` (pan/zoom) and `cy.on('position')` (node drag). Update the specific canvas/overlay.
    -   **Minimap -> Main**: Dragging the viewport rect calculates the delta and calls `cy.pan()` and `cy.zoom()`.
-   **Rendering**:
    -   Use a single `<canvas>` element for the nodes/edges (static-ish).
    -   Use a standard HTML `div` with absolute positioning for the "Viewport Rect" (dynamic).
    -   This separation prevents redrawing the entire graph on every pan frame.
