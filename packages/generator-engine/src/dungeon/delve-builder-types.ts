export type DungeonRoomRole =
  | "entrance"
  | "hazard"
  | "encounter"
  | "treasure"
  | "secret"
  | "lore"
  | "faction"
  | "climax"
  | "special";

export interface DelveRoomStocking {
  encounters?: string[];
  hazards?: string[];
  treasure?: string[];
  secrets?: string[];
  factionPresence?: string;
  atmosphere?: string;
}

export interface DelveClimaxResolution {
  stakes: string;
  decision: string;
  outcomes: string[];
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
  /** Present only for climax Areas; omitted from ordinary Areas. */
  climax?: DelveClimaxResolution;
  isCustom?: boolean;
  /** Set after Location-aware AI enrichment so interrupted bulk runs can resume. */
  aiEnhancedAt?: number;
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
  /** Set after Location-aware AI replaces structural placeholder prose. */
  aiEnhancedAt?: number;
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
