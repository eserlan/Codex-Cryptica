/**
 * Adventure Canvas Spatial Graph Types.
 *
 * Defines the spatial document, nodes, and typed edges for the Adventure Canvas
 * Spatial Graph Builder (#1881).
 *
 * Mirrors the product boundary: packages/generator-engine owns the domain graph
 * model and topology generator; apps/web owns the @xyflow/svelte UI layer and
 * IndexedDB/OPFS persistence.
 */

export type AdventureNodeType =
  "situation" | "location" | "npc" | "clue" | "threat" | "outcome";

export type AdventureEdgeType =
  | "leads_to"
  | "holds_clue"
  | "threatens"
  | "fears"
  | "opposes"
  | "resolves_to"
  | "requires";

export interface AdventureNodePosition {
  x: number;
  y: number;
}

export interface AdventureNodeData {
  title: string;
  type: AdventureNodeType;
  summary?: string;
  description?: string;
  role?: string;
  relation?: string;
  leverage?: string;
  dilemma?: string;
  wants?: string;
  secret?: string;
  /** Optional linked Codex Cryptica vault entity ID. */
  entityId?: string;
  /** Optional linked vault entity category (e.g. 'location', 'concept', 'character', 'faction'). */
  entityCategory?: string;
  /** Flags whether this location can launch the Dungeon Structural Builder. */
  canLaunchDungeon?: boolean;
}

export interface AdventureNode {
  id: string;
  type: AdventureNodeType;
  position: AdventureNodePosition;
  data: AdventureNodeData;
}

export interface AdventureEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: AdventureEdgeType;
}

export interface AdventureGraphValidationWarning {
  id: string;
  nodeId?: string;
  edgeId?: string;
  severity: "warning" | "info";
  message: string;
}

export interface AdventureCanvasDocument {
  id: string;
  title: string;
  summary: string;
  genre: string;
  nodes: AdventureNode[];
  edges: AdventureEdge[];
  warnings?: AdventureGraphValidationWarning[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
