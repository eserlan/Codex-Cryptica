# Data Model: GraphView Refactor

## Shared Types

### `LayoutMode`

```typescript
type LayoutMode = "fcose" | "timeline" | "orbit";
```

### `NodeState` (UI-Only)

```typescript
interface NodeState {
  isHovered: boolean;
  isSelected: boolean;
  isLocked: boolean;
  opacity: number;
}
```

## UI State Owners

### `GraphView.svelte` (Orchestrator)

- **cy**: `cytoscape.Core | null`
- **isLoading**: `$state<boolean>`

### `GraphControls.svelte`

- **activeLayout**: `$derived` from graph store

### `GraphTooltip.svelte`

- **hoveredNode**: `$state<Entity | null>`
- **position**: `{ x: number, y: number }`

### `Minimap.svelte`

- **miniCy**: `cytoscape.Core | null`
