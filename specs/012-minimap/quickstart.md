# Quickstart: Minimap Integration

**Feature**: Minimap Navigation (012-minimap)

## Usage

The `Minimap` is a standalone component designed to live inside the `GraphView` or any component that hosts a Cytoscape instance.

### 1. Import and Mount

In `apps/web/src/lib/components/GraphView.svelte`:

```svelte
<script lang="ts">
  import Minimap from "$lib/components/graph/Minimap.svelte";
  import type { Core } from "cytoscape";
  
  let cy: Core | undefined = $state();
  
  // ... initialization logic ...
</script>

<div class="graph-container relative w-full h-full">
  <div bind:this={container} class="w-full h-full"></div>
  
  {#if cy}
    <!-- Minimap sits absolutely positioned on top of the graph container -->
    <Minimap {cy} />
  {/if}
</div>
```

### 2. Configuration (Props)

The component accepts optional props for customization:

```typescript
// Minimap.svelte props
let { 
  cy, 
  width = 200, 
  height = 150 
}: { 
  cy: Core; 
  width?: number; 
  height?: number 
} = $props();
```

### 3. Requirements

- The `cy` instance must be fully initialized before being passed (or handled reactively).
- The parent container must have `position: relative` to anchor the minimap correctly.

## Development Notes

- **Canvas vs DOM**: The background nodes are drawn on a `<canvas>` for performance. The "view rectangle" is a DOM element (`<div>`) for easier drag event handling.
- **Throttling**: Pan/Zoom events from Cytoscape can fire rapidly. The minimap updates use `requestAnimationFrame` to prevent layout thrashing.
