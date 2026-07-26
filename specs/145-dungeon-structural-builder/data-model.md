# Data Model: Dungeon & Delve Structural Builder (#1843)

## Overview

The Delve Structural Builder model represents spatial room graphs, sector container frames, custom passage edges, and room stocking data, fully integrated with standard `.canvas` vault files (`@xyflow/svelte`).

## Data Schemas

### 1. `DelveRoomNodeData`

Data payload attached to `@xyflow/svelte` canvas nodes of type `'delveRoom'`.

```typescript
export type DungeonRoomRole =
  | "entrance"
  | "hazard"
  | "encounter"
  | "treasure"
  | "secret"
  | "lore"
  | "faction"
  | "special";

export interface DelveRoomNodeData {
  id: string;
  sectorId: string;
  sectorName: string;
  name: string;
  role: DungeonRoomRole;
  summary: string;
  description: string;
  stocking: DelveRoomStocking;
  isCustom?: boolean;
}

export interface DelveRoomStocking {
  encounters?: string[];
  hazards?: string[];
  treasure?: string[];
  secrets?: string[];
  factionPresence?: string;
  atmosphere?: string;
}
```

### 2. `DelveEdgeData`

Data payload attached to `@xyflow/svelte` canvas edges of type `'delveEdge'`.

```typescript
export type PassageType = "standard" | "hidden" | "conditional" | "vertical";

export interface DelveEdgeData {
  id: string;
  sourceRoomId: string;
  targetRoomId: string;
  type: PassageType;
  bidirectional: boolean;
  description?: string; // e.g. "Iron-gated archway", "Hidden stone swivel wall"
  condition?: string; // e.g. "Requires Skeleton Key", "Trapped: Poison Dart"
}
```

### 3. `DungeonSectorFrame`

Data payload attached to group container nodes of type `'delveSectorGroup'`.

```typescript
export interface DungeonSectorFrameData {
  id: string;
  name: string;
  theme: string;
  description: string;
  color?: string;
  order: number;
}
```

### 4. `DelveCanvasDocument`

Standard `.canvas` JSON structure storing nodes, edges, and linkage to the Dungeon Concept entity.

```typescript
export interface DelveCanvasDocument {
  id: string;
  conceptId: string;
  title: string;
  nodes: CanvasNode[]; // Contains delveRoom nodes and delveSectorGroup frame nodes
  edges: CanvasEdge[]; // Contains delveEdge passages
  metadata: {
    size: "small" | "medium" | "sprawling";
    entranceRoomIds: string[];
    createdAt: number;
    updatedAt: number;
  };
}
```

## Validation Rules

1. **Node Integrity**: Every `delveEdge` MUST connect valid `delveRoom` node IDs present on the canvas.
2. **Sector Hierarchy**: Every `delveRoom` node MUST specify a valid `sectorId` corresponding to a `delveSectorGroup` container frame.
3. **Entrance Requirement**: At least one `delveRoom` node MUST possess the `'entrance'` role.
4. **Connectivity Check**: Graph validation detects and flags orphaned `delveRoom` nodes that lack any path back to an entrance.
