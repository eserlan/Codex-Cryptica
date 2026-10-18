import type { Node } from "@xyflow/svelte";
import { canvasNodeZIndex } from "./canvas-workspace-helpers";

export function stackableNodeZIndexBounds(nodes: Node[]) {
  let min = 0;
  let max = 0;
  for (const node of nodes) {
    if (node.type === "delveSectorGroup") continue;
    const z = canvasNodeZIndex(node);
    if (z > max) max = z;
    if (z < min) min = z;
  }
  return { min, max };
}

export function bringNodeToFront(nodes: Node[], nodeId: string): Node[] {
  const { max } = stackableNodeZIndexBounds(nodes);
  return nodes.map((node) =>
    node.id === nodeId
      ? { ...node, data: { ...node.data, zIndex: max + 1 } }
      : node,
  );
}

export function sendNodeToBack(nodes: Node[], nodeId: string): Node[] {
  const { min } = stackableNodeZIndexBounds(nodes);
  return nodes.map((node) =>
    node.id === nodeId
      ? { ...node, data: { ...node.data, zIndex: min - 1 } }
      : node,
  );
}
