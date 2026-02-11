# Data Model: Minimap Component

**Feature**: Minimap Navigation (012-minimap)

## Component State (Internal)

The Minimap component maintains an internal representation of the graph topology to render efficiently without querying the Cytoscape model on every frame.

```typescript
interface MinimapNode {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface ViewportState {
  x: number; // Graph-space x coordinate of top-left
  y: number; // Graph-space y coordinate of top-left
  width: number; // Graph-space width of view
  height: number; // Graph-space height of view
  zoom: number; // Current main graph zoom level
}

interface MinimapConfig {
  scale: number; // Ratio of Minimap Pixels : Graph Units
  padding: number; // Padding around the graph bounding box
}
```

## Interactions

### 1. Synchronization (Main Graph -> Minimap)

| Trigger               | Action                                                        |
| :-------------------- | :------------------------------------------------------------ |
| `cy.on('viewport')`   | Update `ViewportState`. Reposition the Viewport Rect overlay. |
| `cy.on('position')`   | Update `MinimapNode` coordinates. Redraw Canvas.              |
| `cy.on('add/remove')` | Add/Remove `MinimapNode`. Redraw Canvas.                      |
| `cy.on('style')`      | Update `MinimapNode.color`. Redraw Canvas (debounced).        |

### 2. Navigation (Minimap -> Main Graph)

| User Action          | Logic                                                                                                                                |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| **Drag Rect**        | Calculate delta $(dx, dy)$ in minimap pixels. Convert to graph units: $dx_g = dx / scale$. Apply `cy.panBy({ x: -dx_g, y: -dy_g })`. |
| **Click Background** | Get click $(cx, cy)$ in minimap pixels. Convert to graph units. Call `cy.center({ x: cx_g, y: cy_g })`.                              |

## CSS / Theming

The component uses Tailwind CSS for container styling.

- **Container**: `absolute bottom-4 right-4 w-48 h-48 bg-black/80 border border-green-900/50 rounded-lg shadow-xl overflow-hidden z-40`
- **Viewport Rect**: `absolute border-2 border-green-400 bg-green-400/10 cursor-move transition-transform duration-75 ease-linear hover:bg-green-400/20`
