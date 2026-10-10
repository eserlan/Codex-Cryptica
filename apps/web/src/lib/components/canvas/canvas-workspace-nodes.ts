import type { Node } from "@xyflow/svelte";
import { canvasNodeStyle, canvasNodeZIndex } from "./canvas-workspace-helpers";

type CanvasWorkspaceNode = Node & {
  data: Record<string, unknown> & { type?: string; locked?: boolean };
};

type PresentedCanvasNode = CanvasWorkspaceNode & {
  draggable: boolean;
  style: ReturnType<typeof canvasNodeStyle>;
  zIndex: number;
};

export function presentCanvasNodes({
  nodes,
  activeCategories,
  isExporting,
  showImageLabels,
  updateNodeData,
}: {
  nodes: CanvasWorkspaceNode[];
  activeCategories: Set<string>;
  isExporting: boolean;
  showImageLabels: boolean;
  updateNodeData: (nodeId: string, updates: Record<string, unknown>) => void;
}): PresentedCanvasNode[] {
  const visibleNodes =
    isExporting || activeCategories.size === 0
      ? nodes
      : nodes.filter((node) => activeCategories.has(node.data?.type ?? ""));

  return visibleNodes.map((node) => {
    const withPresentation: PresentedCanvasNode = {
      ...node,
      draggable: !node.data.locked,
      style: canvasNodeStyle(node),
      zIndex: node.type === "delveSectorGroup" ? 0 : canvasNodeZIndex(node),
    };

    if (node.type === "file") {
      return {
        ...withPresentation,
        data: {
          ...node.data,
          onUpdateFile: (updates: Record<string, unknown>) =>
            updateNodeData(node.id, updates),
        },
      };
    }

    if (node.type === "text") {
      return {
        ...withPresentation,
        data: {
          ...node.data,
          onUpdateText: (updates: Record<string, unknown>) =>
            updateNodeData(node.id, updates),
        },
      };
    }

    if (node.type === "entity") {
      return {
        ...withPresentation,
        data: {
          ...node.data,
          showImageLabels,
          onUpdateEntityNode: (updates: Record<string, unknown>) =>
            updateNodeData(node.id, updates),
        },
      };
    }

    return withPresentation;
  });
}
