/**
 * API Contract: Dungeon Delve Structural Builder Service
 * Workspace Package: @codex/generator-engine & apps/web
 */

import type {
  DelveCanvasDocument,
  DelveRoomNodeData,
  DelveEdgeData,
} from "../data-model";

export interface IDungeonDelveService {
  /**
   * Generates a complete Delve Canvas Document from a Dungeon Concept entity.
   */
  buildDelveCanvasFromConcept(
    conceptEntity: Record<string, unknown>,
  ): Promise<DelveCanvasDocument>;

  /**
   * Regenerates stocking and lore description for a single room node without altering canvas layout or edges.
   */
  regenerateRoomStocking(params: {
    room: DelveRoomNodeData;
    conceptLore: string;
    aiDisabled?: boolean;
  }): Promise<DelveRoomNodeData>;

  /**
   * Validates graph connectivity and returns orphaned room node IDs.
   */
  validateGraphConnectivity(canvas: DelveCanvasDocument): {
    isValid: boolean;
    orphanedRoomIds: string[];
    missingEntrance: boolean;
  };

  /**
   * Updates passage edge attributes (type, lock condition, directionality).
   */
  updateEdgeAttributes(params: {
    edgeId: string;
    canvas: DelveCanvasDocument;
    updates: Partial<DelveEdgeData>;
  }): DelveCanvasDocument;
}
