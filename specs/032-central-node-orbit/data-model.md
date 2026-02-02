# Data Model: Central Node Orbit Layout

**Feature**: `032-central-node-orbit`
**Status**: Draft

## Runtime State (Ephemeral)

This feature introduces **transient UI state**. No persistent data changes are required in the Markdown vault.

### OrbitState

```typescript
interface OrbitState {
  isActive: boolean;
  centralNodeId: string | null;
  maxOrbitLevel: number; // The furthest distance found (for visualization scaling)
}
```

## Graph Entities

### Node Attributes (Runtime Only)

The graph engine will temporarily calculate and assign these internal properties during the layout phase. They are not saved to the node data object permanently.

| Attribute | Type | Description |
| :--- | :--- | :--- |
| `_orbitLevel` | `number` | The BFS distance from the central node. 0 = Center. |
| `_orbitIndex` | `number` | Calculated value for the `concentric` layout algorithm. |

## Persistence

-   **None**.
-   When the user reloads the app, the graph returns to the default layout.
-   When the user clicks "Exit Orbit View", the graph returns to the default layout (or previous positions).

## Configuration (Optional/Future)

If we decide to allow users to customize the orbit spacing, we might add this to `settings.json`, but currently out of scope.

```json
{
  "graph": {
    "orbitLayout": {
      "spacingFactor": 1.5,
      "animationDuration": 500
    }
  }
}
```
