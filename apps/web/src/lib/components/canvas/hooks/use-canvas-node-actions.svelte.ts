import type { Canvas, CanvasStore } from "@codex/canvas-engine";
import type { vault as VaultStore } from "$lib/stores/vault.svelte";
import { createFlowTextNode } from "../canvas-workspace-helpers";
import { presentCanvasNodes } from "../canvas-workspace-nodes";
import {
  bringNodeToFront,
  sendNodeToBack,
  stackableNodeZIndexBounds,
} from "../canvas-node-stacking";
import {
  areAllCanvasEntityNodesImageOnly,
  getCanvasEntityNodes,
  toggleCanvasEntityCardView,
  toggleCanvasImageLabels,
} from "../canvas-entity-card-preferences";
import { centerScreenPosition } from "./use-canvas-file-import.svelte";
import type { CanvasLogic } from "./canvas-logic-type";

/** Node edits, stacking, text nodes and per-canvas card display preferences. */
export function useCanvasNodeActions(deps: {
  logic: CanvasLogic;
  getEngine: () => CanvasStore;
  vault: typeof VaultStore;
  getCanvas: () => Canvas | undefined;
  isExporting: () => boolean;
}) {
  const { logic, getEngine, vault, getCanvas, isExporting } = deps;

  function updateNodeData(nodeId: string, updates: Record<string, unknown>) {
    const { width, height, ...dataUpdates } = updates;
    logic.nodes = logic.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            ...(width !== undefined ? { width: width as number } : null),
            ...(height !== undefined ? { height: height as number } : null),
            data: { ...node.data, ...dataUpdates },
          }
        : node,
    );
  }

  function toggleNodeLock(nodeId: string) {
    logic.nodes = logic.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: { ...node.data, locked: !(node.data as any)?.locked },
          }
        : node,
    );
  }

  function handleBringNodeToFront(nodeId: string) {
    logic.nodes = bringNodeToFront(logic.nodes, nodeId);
  }

  function handleSendNodeToBack(nodeId: string) {
    logic.nodes = sendNodeToBack(logic.nodes, nodeId);
  }

  function handleAddTextNode(screenPosition?: { x: number; y: number }) {
    if (vault.isGuest) return;
    const position = logic.screenToFlowPosition(
      screenPosition ?? centerScreenPosition(),
    );
    const nodeId = getEngine().addTextNode("", position);
    const { max } = stackableNodeZIndexBounds(logic.nodes);
    const node = createFlowTextNode("", position, nodeId);
    logic.nodes = [
      ...logic.nodes,
      { ...node, data: { ...node.data, zIndex: max + 1 } },
    ];
    logic.saveNow();
  }

  const showImageLabels = $derived(
    Boolean(
      (getCanvas()?.metadata as Record<string, unknown> | undefined)
        ?.showImageLabels,
    ),
  );

  const filteredNodes = $derived(
    presentCanvasNodes({
      nodes: logic.nodes as any,
      activeCategories: logic.activeCategories,
      isExporting: isExporting(),
      showImageLabels,
      updateNodeData,
    }),
  );

  const entityNodes = $derived(getCanvasEntityNodes(logic.nodes));
  const isAllImageOnly = $derived(
    areAllCanvasEntityNodesImageOnly(logic.nodes),
  );

  function handleToggleAllImageOnly() {
    if (vault.isGuest) return;
    const { nodes, nextView } = toggleCanvasEntityCardView(
      logic.nodes,
      isAllImageOnly,
    );
    logic.nodes = nodes;
    const canvas = getCanvas();
    if (canvas) {
      canvas.metadata = {
        ...(canvas.metadata || {}),
        defaultCardView: nextView,
      };
    }
    logic.saveNow();
  }

  function handleToggleShowImageLabels() {
    const canvas = getCanvas();
    if (canvas) {
      const { metadata } = toggleCanvasImageLabels(
        canvas.metadata as Record<string, unknown> | undefined,
      );
      canvas.metadata = { ...metadata };
      logic.saveNow();
    }
  }

  return {
    updateNodeData,
    toggleNodeLock,
    handleBringNodeToFront,
    handleSendNodeToBack,
    handleAddTextNode,
    handleToggleAllImageOnly,
    handleToggleShowImageLabels,
    get filteredNodes() {
      return filteredNodes;
    },
    get showImageLabels() {
      return showImageLabels;
    },
    get hasEntityNodes() {
      return entityNodes.length > 0;
    },
    get isAllImageOnly() {
      return isAllImageOnly;
    },
  };
}
