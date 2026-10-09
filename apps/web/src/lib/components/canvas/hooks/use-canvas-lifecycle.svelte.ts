import { tick, untrack } from "svelte";
import type { Canvas } from "@codex/canvas-engine";
import type { DelveEdgeData, DelveRoomNodeData } from "generator-engine";
import type { vault as VaultStore } from "$lib/stores/vault.svelte";
import type { canvasRegistry as CanvasRegistryStore } from "$lib/stores/canvas-registry.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { isPlaceholderDelveAreaName } from "$lib/services/delve-area-enhancement";
import { autoArrangeCanvasNodes } from "../canvas-auto-arrange";
import type { CanvasLogic } from "./canvas-logic-type";

function needsAreaPopulation(canvas: Canvas) {
  if (canvas.metadata?.autoPopulateAreas !== true) return false;
  if (canvas.metadata?.areaPopulationStatus !== "complete") return true;
  const needsAreaNames = canvas.nodes.some(
    (node) =>
      node.type === "delveRoom" &&
      isPlaceholderDelveAreaName(node.data as unknown as DelveRoomNodeData),
  );
  const needsPassageEnhancement = canvas.edges.some(
    (edge) =>
      edge.type === "delveEdge" &&
      !(edge.data as unknown as DelveEdgeData | undefined)?.aiEnhancedAt,
  );
  return needsAreaNames || needsPassageEnhancement;
}

/**
 * Canvas load/teardown wiring: initialise the logic for the current canvas,
 * auto-arrange untouched layouts once, kick off automatic Area population,
 * prune/sync nodes, watch for batch spawns, and flush pending saves on unmount.
 */
export function useCanvasLifecycle(deps: {
  logic: CanvasLogic;
  vault: typeof VaultStore;
  canvasRegistry: typeof CanvasRegistryStore;
  getCanvas: () => Canvas | undefined;
  getCanvasId: () => string | undefined;
  populateCanvasAreas: (canvas: Canvas) => Promise<unknown> | unknown;
}) {
  const { logic, vault, canvasRegistry, getCanvas, getCanvasId } = deps;
  let arrangedCanvasId = $state<string | null>(null);
  let autoPopulationCanvasId: string | null = null;

  async function handleAutoArrange() {
    const canvas = getCanvas();
    const positionedNodes = autoArrangeCanvasNodes({
      canvasId: canvas?.id || "temp",
      title: canvas?.name || "Canvas",
      nodes: logic.nodes,
      edges: logic.edges,
      vaultEntities: vault.entities,
    });
    if (!positionedNodes) return;

    logic.nodes = positionedNodes;
    if (canvas) {
      canvas.metadata = { ...(canvas.metadata || {}), layoutState: "auto" };
    }
    logic.saveNow();
    await tick();
    await logic.fitView?.({ padding: 0.15, duration: 400 });
  }

  $effect(() => {
    const canvasId = getCanvasId();
    if (canvasId) {
      logic.initializeCanvas(canvasId);
    }
  });

  $effect(() => {
    const canvasId = getCanvasId();
    if (canvasId && logic.hasInitialized && arrangedCanvasId !== canvasId) {
      arrangedCanvasId = canvasId;
      untrack(() => {
        const isManual = getCanvas()?.metadata?.layoutState === "manual";
        if (!isManual) {
          void handleAutoArrange();
        }
      });
    }
  });

  $effect(() => {
    const currentCanvas: Canvas | undefined = getCanvas();
    if (
      !currentCanvas?.id ||
      !logic.hasInitialized ||
      sessionModeStore.isGuestMode ||
      !needsAreaPopulation(currentCanvas) ||
      autoPopulationCanvasId === currentCanvas.id
    ) {
      return;
    }

    autoPopulationCanvasId = currentCanvas.id;
    untrack(() => void deps.populateCanvasAreas(currentCanvas));
  });

  $effect(() => {
    logic.pruneNodes();
  });

  $effect(() => {
    logic.syncEngine();
  });

  $effect(() => {
    if (canvasRegistry.pendingEntities.length > 0) {
      logic.handleBatchSpawn();
    }
  });

  $effect(() => {
    return () => {
      logic.flushSave();
    };
  });

  return { handleAutoArrange };
}
