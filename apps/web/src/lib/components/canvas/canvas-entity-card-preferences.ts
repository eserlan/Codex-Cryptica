import type { Node } from "@xyflow/svelte";

type CanvasEntityNode = Node & {
  data: Record<string, unknown>;
};

function isCanvasEntityNode(node: Node): boolean {
  return (
    (node.type ?? "entity") === "entity" ||
    Boolean((node.data as Record<string, unknown> | undefined)?.entityId)
  );
}

export function getCanvasEntityNodes(nodes: Node[]): CanvasEntityNode[] {
  return nodes.filter(isCanvasEntityNode) as CanvasEntityNode[];
}

export function areAllCanvasEntityNodesImageOnly(nodes: Node[]): boolean {
  const entityNodes = getCanvasEntityNodes(nodes);
  return (
    entityNodes.length > 0 &&
    entityNodes.every((node) => node.data.cardView === "image_only")
  );
}

export function toggleCanvasEntityCardView(
  nodes: Node[],
  areAllImageOnly: boolean,
): { nodes: Node[]; nextView: "auto" | "image_only" } {
  const nextView = areAllImageOnly ? "auto" : "image_only";
  return {
    nextView,
    nodes: nodes.map((node) =>
      isCanvasEntityNode(node)
        ? { ...node, data: { ...node.data, cardView: nextView } }
        : node,
    ),
  };
}

export function toggleCanvasImageLabels(
  metadata: Record<string, unknown> | undefined,
): { metadata: Record<string, unknown>; showImageLabels: boolean } {
  const showImageLabels = !metadata?.showImageLabels;
  return {
    showImageLabels,
    metadata: { ...(metadata || {}), showImageLabels },
  };
}
