---
name: cytoscape
description: Master Cytoscape.js for graph visualization, including Svelte 5 integration, sci-fi styling, custom layouts, and interaction patterns. Use when building relationship maps, node-link diagrams, or interactive network visualizations.
---

# Cytoscape Graph Visualization

Master the art of creating high-performance, aesthetically striking network visualizations using Cytoscape.js, with a focus on Svelte 5 integration and the "Codex Arcana" sci-fi aesthetic.

## Core Patterns

### 1. Svelte 5 Integration
Manage Cytoscape lifecycle and reactivity using Svelte 5 `$effect` and `onMount`.

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import cytoscape, { type Core } from 'cytoscape';

  let container: HTMLElement;
  let cy: Core | undefined = $state();
  let { elements } = $props();

  onMount(() => {
    cy = cytoscape({
      container,
      elements,
      style: [ /* styles */ ],
      layout: { name: 'cose' }
    });
  });

  onDestroy(() => {
    cy?.destroy();
  });

  // Reactive updates
  $effect(() => {
    if (cy && elements) {
      cy.elements().remove();
      cy.add(elements);
      cy.layout({ name: 'cose', animate: true }).run();
    }
  });
</script>

<div bind:this={container} class="w-full h-full"></div>
```

### 2. Sci-Fi "Terminal" Styling
Embrace a high-contrast, glowing aesthetic. Use dark backgrounds with vibrant green or amber accents.

| Feature | Pattern |
|---------|---------|
| **Node Shape** | `round-rectangle` or `diamond` for sci-fi feel. |
| **Node Label** | Use `text-valign: bottom` and `text-margin-y` for a data-readout look. |
| **Edge Style** | `bezier` curves with `triangle` arrows. Keep lines thin and subtle. |
| **Overlays** | Use `overlay-color` and `overlay-opacity` for glowing selection effects. |

**Example Sci-Fi Style:**
```ts
const SCIFI_STYLE = [
  {
    selector: 'node',
    style: {
      'background-color': '#022c22',
      'border-width': 1,
      'border-color': '#15803d',
      'label': 'data(label)',
      'color': '#86efac',
      'font-family': 'Inter, monospace',
      'font-size': 10,
      'text-transform': 'uppercase'
    }
  },
  {
    selector: 'edge',
    style: {
      'line-color': '#14532d',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'opacity': 0.6
    }
  }
];
```

### 3. Layout Strategies
- **Cose**: Good for organic, balanced layouts.
- **Circle/GridLayout**: Use for structured overviews or specific groupings.
- **Fcose/Cola**: Advanced force-directed layouts for complex networks (require plugins).
- **Manual**: Use `metadata.coordinates` if entities have fixed positions.

## Interaction Patterns

### Selection & Focus
Animate the view when a node is selected to provide feedback.
```ts
cy.on('tap', 'node', (evt) => {
  const node = evt.target;
  cy.animate({
    center: { eles: node },
    zoom: 1.5,
    duration: 500,
    easing: 'ease-out-cubic'
  });
});
```

### Connection Management
Implement a "Connect Mode" to allow users to link nodes visually.
- Tap Source -> Tap Target -> Save relationship.
- Visual feedback via classes (e.g., `.selected-source`).

## Performance Guidelines
1. **Batch Updates**: Use `cy.batch()` when performing many operations.
2. **Selective Layouts**: Only run layouts when elements change significantly, not on every prop update.
3. **Hardware Acceleration**: Cytoscape uses Canvas, which is generally performant, but keep texture usage low.

## Best Practices
1. **Lifecycle Management**: Always `destroy()` the instance in `onDestroy`.
2. **Viewport Handling**: Use `cy.fit()` and `cy.resize()` to ensure the graph looks good on all screens.
3. **Data Transformation**: Use a separate `Transformer` utility to map domain objects (Entities) to Cytoscape elements.
4. **Overlay Elements**: Use HTML/CSS overlays for UI (zoom controls, legends) instead of rendering them in the Canvas.
