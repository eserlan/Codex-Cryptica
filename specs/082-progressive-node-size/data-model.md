# Data Model: Progressive Node Sizing

## GraphNode Data Schema

The `GraphNode` object in `packages/graph-engine` will include the following property to support connectivity-based sizing:

| Field    | Type     | Description                                                                                                                                         |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weight` | `number` | The count of rendered incident edges for this entity after graph filtering. Includes inbound and outbound visible links. Used for tier calculation. |

## Node Sizing Tiers (Visual Data)

The graph engine will not store the size directly but will apply it via CSS-like selectors in Cytoscape based on the `weight` property.

| Tier | Selector                          | Attributes                |
| ---- | --------------------------------- | ------------------------- |
| 0    | `node[weight <= 1]`               | `width: 48, height: 48`   |
| 1    | `node[weight >= 2][weight <= 5]`  | `width: 64, height: 64`   |
| 2    | `node[weight >= 6][weight <= 10]` | `width: 96, height: 96`   |
| 3    | `node[weight >= 11]`              | `width: 128, height: 128` |
