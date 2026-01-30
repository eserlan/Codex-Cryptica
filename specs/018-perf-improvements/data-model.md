# Data Model: Performance Refinements

## Store State Updates

### OracleStore
Refined synced state to include a versioning hint.

| Field | Type | Description |
| :--- | :--- | :--- |
| `messages` | `ChatMessage[]` | Existing message history. |
| `lastUpdated` | `number` | **New**: Epoch timestamp of the last message or state change. Used for cheap sync comparison. |

### VaultStore (Internal)
Introduction of a derived but incrementally managed adjacency map.

| Entity | Type | Description |
| :--- | :--- | :--- |
| `inboundMap` | `Map<string, Set<string>>` | Maps target node IDs to a set of source node IDs. Updated incrementally. |

## Utility Objects

### CanvasPool
A module-level pool for thumbnail generation.

| Field | Type | Description |
| :--- | :--- | :--- |
| `canvas` | `OffscreenCanvas` | Reusable canvas object. |
| `ctx` | `OffscreenCanvasRenderingContext2D` | Reusable 2D context. |
