import { untrack } from "svelte";
import type { Canvas } from "@codex/canvas-engine";
import type { DelveEdgeData, DelveRoomNodeData } from "generator-engine";
import type { vault as VaultStore } from "$lib/stores/vault.svelte";
import type { canvasRegistry as CanvasRegistryStore } from "$lib/stores/canvas-registry.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import {
  delveAreaEnhancementService,
  isPlaceholderDelveAreaName,
} from "$lib/services/delve-area-enhancement";
import {
  flowEdgeToCanvasEdge,
  flowNodesToCanvasNodes,
} from "../canvas-workspace-helpers";
import type { CanvasLogic } from "./canvas-logic-type";

/**
 * Delve area behaviour: the selected-room drawer, single-area AI enhancement,
 * and the one-shot automatic population of every area when a canvas opens.
 */
export function useDelveAreaActions(deps: {
  logic: CanvasLogic;
  vault: typeof VaultStore;
  canvasRegistry: typeof CanvasRegistryStore;
  getCanvas: () => Canvas | undefined;
}) {
  const { logic, vault, canvasRegistry, getCanvas } = deps;

  let selectedRoomId = $state<string | null>(null);
  let isRestockingRoom = $state(false);
  let roomEnhancementError = $state<string | null>(null);
  let isAutoPopulating = $state(false);
  let autoPopulationCompleted = $state(0);
  let autoPopulationTotal = $state(0);
  let autoPopulationMessage = $state<string | null>(null);
  let autoPopulationCanvasId: string | null = null;

  const selectedRoomData = $derived.by(() => {
    if (!selectedRoomId) return null;
    const node = logic.nodes.find(
      (candidate) =>
        candidate.id === selectedRoomId && candidate.type === "delveRoom",
    );
    return (node?.data as unknown as DelveRoomNodeData | undefined) ?? null;
  });

  function selectRoom(nodeId: string) {
    roomEnhancementError = null;
    selectedRoomId = nodeId;
  }

  function clearRoomSelection() {
    selectedRoomId = null;
  }

  function saveRoomData(updated: DelveRoomNodeData) {
    if (!selectedRoomId) return;
    logic.nodes = logic.nodes.map((node) =>
      node.id === selectedRoomId
        ? { ...node, data: { ...node.data, ...updated } }
        : node,
    );
  }

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

  async function enhanceRoom(room: DelveRoomNodeData) {
    const canvas = getCanvas();
    if (!canvas) return;
    isRestockingRoom = true;
    roomEnhancementError = null;
    try {
      const updated = await delveAreaEnhancementService.enhanceArea({
        canvas,
        room,
        nearbyAreas: getNearbyAreas(room),
      });
      saveRoomData(updated);
    } catch (error) {
      roomEnhancementError =
        error instanceof Error
          ? error.message
          : "AI enhancement failed. The Area was not changed.";
    } finally {
      isRestockingRoom = false;
    }
  }

  function describeFailures(failedAreas: number, failedPassages: number) {
    return [
      failedAreas > 0
        ? `${failedAreas} Area${failedAreas === 1 ? "" : "s"}`
        : "",
      failedPassages > 0
        ? `${failedPassages} passage${failedPassages === 1 ? "" : "s"}`
        : "",
    ]
      .filter(Boolean)
      .join(" and ");
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
      const result = await delveAreaEnhancementService.populateAllAreas(
        targetCanvas,
        ({ completed, total, updatedAreas }) => {
          autoPopulationCompleted = completed;
          autoPopulationTotal = total;
          if (updatedAreas.length === 0) return;
          const updates = new Map(
            updatedAreas.map((area) => [area.id, area] as const),
          );
          logic.nodes = logic.nodes.map((node) => {
            const update = updates.get(node.id);
            return update
              ? { ...node, data: { ...node.data, ...update } }
              : node;
          });
        },
      );

      const hasFailures = result.failed > 0 || result.failedPassages > 0;
      const enhancedEdges = new Map(
        result.edges.map((edge) => [edge.id, edge] as const),
      );
      logic.edges = logic.edges.map((edge) => {
        const update = enhancedEdges.get(edge.id);
        return update
          ? { ...edge, data: { ...(edge.data ?? {}), ...(update.data ?? {}) } }
          : edge;
      });
      const updatedCanvas = {
        ...targetCanvas,
        nodes: flowNodesToCanvasNodes(logic.nodes),
        edges: logic.edges.map((edge) => flowEdgeToCanvasEdge(edge)),
        metadata: {
          ...(targetCanvas.metadata ?? {}),
          areaPopulationStatus: hasFailures ? "partial" : "complete",
          areaPopulationCompleted: result.completed,
          areaPopulationTotal: result.total,
          areaPopulationUpdatedAt: Date.now(),
        },
      };
      vault.canvases[targetCanvas.id!] = updatedCanvas;
      canvasRegistry.canvases[targetCanvas.id!] = updatedCanvas;
      await vault.saveCanvas(targetCanvas.id!);

      if (hasFailures) {
        autoPopulationMessage = `${describeFailures(result.failed, result.failedPassages)} could not be enhanced. They will retry next time this canvas opens.`;
      }
    } catch (err) {
      console.error(
        "[DelveAutoPopulation] Error during canvas auto-population:",
        err,
      );
      const detail =
        err instanceof Error && err.message ? ` (${err.message})` : "";
      autoPopulationMessage = `Automatic AI population paused${detail}. Existing Area details were preserved and it will retry next time.`;
    } finally {
      isAutoPopulating = false;
    }
  }

  $effect(() => {
    const currentCanvas: Canvas | undefined = getCanvas();
    const needsAreaNames = currentCanvas?.nodes.some(
      (node) =>
        node.type === "delveRoom" &&
        isPlaceholderDelveAreaName(node.data as unknown as DelveRoomNodeData),
    );
    const needsPassageEnhancement = currentCanvas?.edges.some(
      (edge) =>
        edge.type === "delveEdge" &&
        !(edge.data as unknown as DelveEdgeData | undefined)?.aiEnhancedAt,
    );
    if (
      !currentCanvas?.id ||
      !logic.hasInitialized ||
      sessionModeStore.isGuestMode ||
      currentCanvas.metadata?.autoPopulateAreas !== true ||
      (currentCanvas.metadata?.areaPopulationStatus === "complete" &&
        !needsAreaNames &&
        !needsPassageEnhancement) ||
      autoPopulationCanvasId === currentCanvas.id
    ) {
      return;
    }

    autoPopulationCanvasId = currentCanvas.id;
    untrack(() => void populateCanvasAreas(currentCanvas));
  });

  return {
    selectRoom,
    clearRoomSelection,
    saveRoomData,
    enhanceRoom,
    get selectedRoomData() {
      return selectedRoomData;
    },
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
  };
}
