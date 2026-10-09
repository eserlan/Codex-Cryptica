import type { CanvasStore } from "@codex/canvas-engine";
import type { vault as VaultStore } from "$lib/stores/vault.svelte";
import {
  canvasNodeStyle,
  canvasNodeZIndex,
  createFlowTextNode,
} from "../canvas-workspace-helpers";
import { centerScreenPosition } from "../canvas-file-import-helpers";
import type { CanvasLogic } from "./canvas-logic-type";

export function useCanvasNodeActions(deps: {
  logic: CanvasLogic;
  getEngine: () => CanvasStore;
  vault: typeof VaultStore;
  isExporting: () => boolean;
}) {
  const { logic, getEngine, vault, isExporting } = deps;

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

  function stackableNodeZIndexBounds() {
    let min = 0;
    let max = 0;
    for (const node of logic.nodes) {
      if (node.type === "delveSectorGroup") continue;
      const z = canvasNodeZIndex(node);
      if (z > max) max = z;
      if (z < min) min = z;
    }
    return { min, max };
  }

  function bringNodeToFront(nodeId: string) {
    const { max } = stackableNodeZIndexBounds();
    logic.nodes = logic.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, zIndex: max + 1 } }
        : node,
    );
  }

  function sendNodeToBack(nodeId: string) {
    const { min } = stackableNodeZIndexBounds();
    logic.nodes = logic.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, zIndex: min - 1 } }
        : node,
    );
  }

  function handleAddTextNode(screenPosition?: { x: number; y: number }) {
    if (vault.isGuest) return;
    const position = logic.screenToFlowPosition(
      screenPosition ?? centerScreenPosition(),
    );
    const nodeId = getEngine().addTextNode("", position);
    const { max } = stackableNodeZIndexBounds();
    const node = createFlowTextNode("", position, nodeId);
    logic.nodes = [
      ...logic.nodes,
      { ...node, data: { ...node.data, zIndex: max + 1 } },
    ];
    logic.saveNow();
  }

  const contextMenuNode = $derived.by(() => {
    if (logic.contextMenu?.type !== "node") return undefined;
    return logic.nodes.find((n) => n.id === logic.contextMenu?.id);
  });

  const filteredNodes = $derived.by(() => {
    const base = (() => {
      if (isExporting()) return logic.nodes;
      if (logic.activeCategories.size === 0) return logic.nodes;
      return logic.nodes.filter((n) =>
        logic.activeCategories.has(n.data?.type as string),
      );
    })();
    return base.map((node) => {
      const locked = Boolean((node.data as any)?.locked);
      const withLock = {
        ...node,
        draggable: !locked,
        style: canvasNodeStyle(node),
        zIndex: node.type === "delveSectorGroup" ? 0 : canvasNodeZIndex(node),
      };
      if (node.type === "file") {
        return {
          ...withLock,
          data: {
            ...node.data,
            onUpdateFile: (updates: Record<string, unknown>) =>
              updateNodeData(node.id, updates),
          },
        };
      }
      if (node.type === "text") {
        return {
          ...withLock,
          data: {
            ...node.data,
            onUpdateText: (updates: Record<string, unknown>) =>
              updateNodeData(node.id, updates),
          },
        };
      }
      return withLock;
    });
  });

  return {
    updateNodeData,
    toggleNodeLock,
    bringNodeToFront,
    sendNodeToBack,
    handleAddTextNode,
    get filteredNodes() {
      return filteredNodes;
    },
    get contextMenuNodeLocked() {
      return Boolean((contextMenuNode?.data as any)?.locked);
    },
    get contextMenuNodeStackable() {
      return (
        Boolean(contextMenuNode) && contextMenuNode?.type !== "delveSectorGroup"
      );
    },
    get contextMenuTextNode() {
      return contextMenuNode?.type === "text" ? contextMenuNode : undefined;
    },
  };
}
