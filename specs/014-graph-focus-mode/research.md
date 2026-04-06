# Research: Cytoscape Highlighting Strategy

**Feature**: Graph Focus Highlight (014-graph-focus-mode)
**Date**: 2026-01-29

## Decision: Selective Opacity via Cytoscape Classes

We will implement focus highlighting by applying a `dimmed` class to all elements NOT in the current focus neighborhood.

### Rationale

1.  **Performance**: Cytoscape's internal style engine is highly optimized for applying classes. Using the `.neighborhood()` and `.union()` API allows for rapid selection of relevant elements.
2.  **Visual Clarity**: Reducing opacity of non-essential elements provides clear focus without removing context (the dimmed elements are still visible as "ghosts").
3.  **Style Composability**: By using a class-based approach, we can define the `dimmed` style in our `BASE_STYLE` without conflicting with node-specific styles (like category colors).
4.  **Zero Latency**: Calculating the neighborhood and applying classes is a sub-10ms operation for standard graphs, well within the 100ms Constitution mandate.

### Alternatives Considered

#### Option A: Filtering / Removing Elements

- **Pros**: Max clarity.
- **Cons**: Destructive. Removing and re-adding elements causes layout shifts or require re-running layout algorithms. User loses sense of "where they are" in the global graph.
- **Verdict**: Rejected for navigation friction.

#### Option B: Dynamic Style Overrides

- **Description**: Loop through elements and call `eles.style('opacity', ...)`.
- **Pros**: Direct.
- **Cons**: Bypasses the style engine's caching. Applying individual styles to 1000 nodes is much slower than applying a single class to a collection.
- **Verdict**: Rejected for performance (Constitution Principle III).

## Implementation Details

- **Classes**:
  - `dimmed`: Opacity set to 0.1 or 0.2.
  - `focused`: Applied to the selected node (optional, might use existing `:selected`).
- **Algorithm**:
  1.  On node select:
      - `const target = evt.target;`
      - `const neighbors = target.neighborhood();`
      - `const collection = target.union(neighbors);`
      - `cy.elements().addClass('dimmed');`
      - `collection.removeClass('dimmed');`
  2.  On background tap / unselect:
      - `cy.elements().removeClass('dimmed');`
