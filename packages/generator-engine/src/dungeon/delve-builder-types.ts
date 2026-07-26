export type DungeonRoomRole =
  | "entrance"
  | "hazard"
  | "encounter"
  | "treasure"
  | "secret"
  | "lore"
  | "faction"
  | "special";

export interface DelveRoomStocking {
  encounters?: string[];
  hazards?: string[];
  treasure?: string[];
  secrets?: string[];
  factionPresence?: string;
  atmosphere?: string;
}

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

export type PassageType = "standard" | "hidden" | "conditional" | "vertical";

export interface DelveEdgeData {
  id: string;
  sourceRoomId: string;
  targetRoomId: string;
  type: PassageType;
  bidirectional: boolean;
  description?: string;
  condition?: string;
}

export interface DungeonSectorFrameData {
  id: string;
  name: string;
  theme: string;
  description: string;
  color?: string;
  order: number;
}

export interface DelveCanvasNode {
  id: string;
  type: "delveRoom" | "delveSectorGroup" | "group" | string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  parentId?: string;
  extent?: "parent" | string;
  data: DelveRoomNodeData | DungeonSectorFrameData | Record<string, unknown>;
}

export interface DelveCanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: "delveEdge" | string;
  data?: DelveEdgeData;
}

export interface DelveCanvasMetadata {
  size: "small" | "medium" | "sprawling";
  entranceRoomIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DelveCanvasDocument {
  id: string;
  conceptId: string;
  title: string;
  nodes: DelveCanvasNode[];
  edges: DelveCanvasEdge[];
  metadata: DelveCanvasMetadata;
}
