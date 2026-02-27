# Data Model: Interactive Spatial Canvas

## Entities

### Canvas

Represents a single persistent workspace.

- **id**: `string` (UUID)
- **name**: `string` (User-defined display name)
- **nodes**: `CanvasNode[]`
- **edges**: `CanvasEdge[]`
- **lastModified**: `number` (Timestamp)

### CanvasNode

A reference to a vault entity placed on the board.

- **id**: `string` (Unique instance ID on this canvas)
- **entityId**: `string` (Reference to the actual Entity ID in the vault)
- **x**: `number` (X coordinate)
- **y**: `number` (Y coordinate)
- **width**: `number` (Optional, for auto-expansion)
- **height**: `number` (Optional, for auto-expansion)
- **color**: `string` (Optional visual override)

### CanvasEdge

A visual connection between two nodes.

- **id**: `string` (Unique edge ID)
- **source**: `string` (Instance ID of source node)
- **target**: `string` (Instance ID of target node)
- **label**: `string` (Optional text displayed on the line)
- **type**: `string` (e.g., "arrow", "line")

## Validation Rules

- **Entity Reference**: Every `CanvasNode.entityId` must resolve to an existing entity in the current vault. If not, the node should render a "Missing" state.
- **Uniqueness**: While multiple nodes can reference the same `entityId`, each `CanvasNode.id` must be unique within the `Canvas.nodes` array.
- **Acyclic Check**: None (Users are free to create cycles in a visual conspiracy board).

## Storage Format (.canvas)

```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "entity",
      "x": 100,
      "y": 200,
      "entityId": "king-arthur-id",
      "width": 250,
      "height": 150
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "label": "Sworn Enemy"
    }
  ]
}
```
