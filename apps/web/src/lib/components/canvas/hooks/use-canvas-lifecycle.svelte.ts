import { untrack } from "svelte";
import type { Canvas } from "@codex/canvas-engine";
import type { canvasRegistry as CanvasRegistryStore } from "$lib/stores/canvas-registry.svelte";
import { autoArrangeCanvasNodes } from "../canvas-workspace-helpers";
import type { CanvasLogic } from "./canvas-logic-type";

/**
 * Canvas load/teardown wiring: initialise the logic for the current canvas,
 * auto-arrange untouched layouts once, prune/sync nodes, watch for batch
 * spawns, and flush pending saves on unmount.
 */
export function useCanvasLifecycle(deps: {
  logic: CanvasLogic;
  canvasRegistry: typeof CanvasRegistryStore;
  getCanvas: () => Canvas | undefined;
  getCanvasId: () => string | undefined;
}) {
  const { logic, canvasRegistry, getCanvas, getCanvasId } = deps;
  let arrangedCanvasId = $state<string | null>(null);

  function handleAutoArrange() {
    const canvas = getCanvas();
    const positionedNodes = autoArrangeCanvasNodes({
      canvasId: canvas?.id || "temp",
      title: canvas?.name || "Canvas",
      nodes: logic.nodes,
      edges: logic.edges,
    });
    if (!positionedNodes) return;

    logic.nodes = positionedNodes;
    if (canvas) {
      canvas.metadata = { ...(canvas.metadata || {}), layoutState: "auto" };
    }
    logic.saveNow();
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
          handleAutoArrange();
        }
      });
    }
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
