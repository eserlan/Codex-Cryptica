import type { Edge, Node } from "@xyflow/svelte";
import type { Canvas } from "@codex/canvas-engine";
import type { DelveRoomNodeData } from "generator-engine";
import {
  delveAreaEnhancementService,
  isPlaceholderDelveAreaName,
  type AreaPopulationProgress,
} from "$lib/services/delve-area-enhancement";
import {
  flowEdgeToCanvasEdge,
  flowNodesToCanvasNodes,
} from "./canvas-workspace-helpers";

type AreaPopulationResult = Awaited<
  ReturnType<typeof delveAreaEnhancementService.populateAllAreas>
>;

export interface CanvasAreaEnhancementDeps {
  service?: Pick<
    typeof delveAreaEnhancementService,
    "enhanceArea" | "populateAllAreas"
  >;
  vault: {
    canvases: Record<string, Canvas>;
    saveCanvas: (canvasId: string) => Promise<void>;
  };
  canvasRegistry: {
    canvases: Record<string, Canvas>;
  };
  logic: {
    nodes: Node[];
    edges: Edge[];
  };
  updateRoomData: (updates: DelveRoomNodeData) => void;
}

export function useCanvasAreaEnhancement({
  service = delveAreaEnhancementService,
  vault,
  canvasRegistry,
  logic,
  updateRoomData,
}: CanvasAreaEnhancementDeps) {
  let isRestockingRoom = $state(false);
  let roomEnhancementError = $state<string | null>(null);
  let isAutoPopulating = $state(false);
  let autoPopulationCompleted = $state(0);
  let autoPopulationTotal = $state(0);
  let autoPopulationMessage = $state<string | null>(null);

  function getNearbyAreas(room: DelveRoomNodeData): DelveRoomNodeData[] {
    const connectedIds = new Set<string>();
    for (const edge of logic.edges) {
      if (edge.source === room.id) connectedIds.add(edge.target);
      if (edge.target === room.id) connectedIds.add(edge.source);
    }

    return logic.nodes
      .filter(
        (node) =>
          node.type === "delveRoom" &&
          node.id !== room.id &&
          (connectedIds.has(node.id) ||
            (node.data as unknown as DelveRoomNodeData).sectorId ===
              room.sectorId),
      )
      .slice(0, 8)
      .map((node) => node.data as unknown as DelveRoomNodeData);
  }

  async function enhanceRoom(
    room: DelveRoomNodeData,
    canvas: Canvas | undefined,
  ) {
    if (!canvas) return;
    isRestockingRoom = true;
    roomEnhancementError = null;
    try {
      const updated = await service.enhanceArea({
        canvas,
        room,
        nearbyAreas: getNearbyAreas(room),
      });
      updateRoomData(updated);
    } catch (error) {
      roomEnhancementError =
        error instanceof Error
          ? error.message
          : "AI enhancement failed. The Area was not changed.";
    } finally {
      isRestockingRoom = false;
    }
  }

  function clearRoomEnhancementError() {
    roomEnhancementError = null;
  }

  function updatePopulationProgress({
    completed,
    total,
    updatedAreas,
  }: AreaPopulationProgress) {
    autoPopulationCompleted = completed;
    autoPopulationTotal = total;
    if (updatedAreas.length === 0) return;

    const updates = new Map(
      updatedAreas.map((area) => [area.id, area] as const),
    );
    logic.nodes = logic.nodes.map((node) => {
      const update = updates.get(node.id);
      return update ? { ...node, data: { ...node.data, ...update } } : node;
    });
  }

  function persistPopulationResult(
    targetCanvas: Canvas,
    result: AreaPopulationResult,
  ) {
    const enhancedEdges = new Map(
      result.edges.map((edge) => [edge.id, edge] as const),
    );
    logic.edges = logic.edges.map((edge) => {
      const update = enhancedEdges.get(edge.id);
      return update
        ? { ...edge, data: { ...(edge.data ?? {}), ...(update.data ?? {}) } }
        : edge;
    });

    const metadata = {
      ...(targetCanvas.metadata ?? {}),
      areaPopulationStatus:
        result.failed > 0 || result.failedPassages > 0 ? "partial" : "complete",
      areaPopulationCompleted: result.completed,
      areaPopulationTotal: result.total,
      areaPopulationUpdatedAt: Date.now(),
    };
    const updatedCanvas = {
      ...targetCanvas,
      nodes: flowNodesToCanvasNodes(logic.nodes),
      edges: logic.edges.map((edge) => flowEdgeToCanvasEdge(edge)),
      metadata,
    };
    vault.canvases[targetCanvas.id!] = updatedCanvas;
    canvasRegistry.canvases[targetCanvas.id!] = updatedCanvas;
  }

  function getPopulationFailureMessage(result: AreaPopulationResult) {
    if (result.failed === 0 && result.failedPassages === 0) return null;

    const failures = [
      result.failed > 0
        ? `${result.failed} Area${result.failed === 1 ? "" : "s"}`
        : "",
      result.failedPassages > 0
        ? `${result.failedPassages} passage${result.failedPassages === 1 ? "" : "s"}`
        : "",
    ]
      .filter(Boolean)
      .join(" and ");
    return `${failures} could not be enhanced. They will retry next time this canvas opens.`;
  }

  function reportPopulationError(error: unknown) {
    console.error(
      "[DelveAutoPopulation] Error during canvas auto-population:",
      error,
    );
    const detail =
      error instanceof Error && error.message ? ` (${error.message})` : "";
    autoPopulationMessage = `Automatic AI population paused${detail}. Existing Area details were preserved and it will retry next time.`;
  }

  async function populateCanvasAreas(targetCanvas: Canvas) {
    isAutoPopulating = true;
    autoPopulationMessage = null;
    autoPopulationCompleted = 0;
    autoPopulationTotal = targetCanvas.nodes.filter(
      (node) =>
        node.type === "delveRoom" &&
        (!(node.data as unknown as DelveRoomNodeData).aiEnhancedAt ||
          isPlaceholderDelveAreaName(
            node.data as unknown as DelveRoomNodeData,
          )),
    ).length;

    try {
      const result = await service.populateAllAreas(
        targetCanvas,
        updatePopulationProgress,
      );
      persistPopulationResult(targetCanvas, result);
      await vault.saveCanvas(targetCanvas.id!);
      autoPopulationMessage = getPopulationFailureMessage(result);
    } catch (err) {
      reportPopulationError(err);
    } finally {
      isAutoPopulating = false;
    }
  }

  return {
    get isRestockingRoom() {
      return isRestockingRoom;
    },
    get roomEnhancementError() {
      return roomEnhancementError;
    },
    get isAutoPopulating() {
      return isAutoPopulating;
    },
    get autoPopulationCompleted() {
      return autoPopulationCompleted;
    },
    get autoPopulationTotal() {
      return autoPopulationTotal;
    },
    get autoPopulationMessage() {
      return autoPopulationMessage;
    },
    clearRoomEnhancementError,
    getNearbyAreas,
    enhanceRoom,
    populateCanvasAreas,
  };
}
