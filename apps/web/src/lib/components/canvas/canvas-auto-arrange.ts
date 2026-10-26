import type { Edge, Node } from "@xyflow/svelte";
import {
  AdventureFlowLayout,
  DelveFlowLayout,
  type AdventureCanvasDocument,
  type AdventureEdge,
  type AdventureNode,
  type AdventureNodeType,
  type DelveCanvasDocument,
  type DelveCanvasEdge,
  type DelveCanvasNode,
  type DelveRoomNodeData,
} from "generator-engine";
import { systemClock, type Clock } from "$lib/utils/runtime-deps";
import {
  flowNodeToCanvasNode,
  flowEdgeToCanvasEdge,
  getEstimatedNodeSize,
  type EstimatedNodeSize,
} from "./canvas-workspace-helpers";

// Local minimal types to avoid circular dependencies if needed, or import from canvas-workspace-helpers
const ADVENTURE_NODE_TYPES = new Set<AdventureNodeType>([
  "situation",
  "location",
  "npc",
  "clue",
  "threat",
  "outcome",
]);

function getAdventureNodeType(node: Node): AdventureNodeType | null {
  const type = (node.data?.type || node.type) as AdventureNodeType;
  return ADVENTURE_NODE_TYPES.has(type) ? type : null;
}

interface StickerAttachment {
  sticker: Node;
  parentNodeId: string;
  offsetX: number;
  offsetY: number;
}

type AutoArrangeParams = {
  canvasId: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  vaultEntities?: Record<
    string,
    { metadata?: Record<string, unknown> } | undefined
  >;
  clock?: Clock;
};

function intersectionArea(
  first: Node,
  firstSize: EstimatedNodeSize,
  second: Node,
  secondSize: EstimatedNodeSize,
): number {
  const overlapX = Math.max(
    0,
    Math.min(
      first.position.x + firstSize.width,
      second.position.x + secondSize.width,
    ) - Math.max(first.position.x, second.position.x),
  );
  const overlapY = Math.max(
    0,
    Math.min(
      first.position.y + firstSize.height,
      second.position.y + secondSize.height,
    ) - Math.max(first.position.y, second.position.y),
  );
  return overlapX * overlapY;
}

function findStickerParent(
  node: Node,
  parents: Node[],
  sizes: Map<string, EstimatedNodeSize>,
): Node | undefined {
  const size = sizes.get(node.id) ?? { width: 200, height: 140 };
  const area = size.width * size.height;
  let best: Node | undefined;
  let maxOverlap = 0;
  for (const parent of parents) {
    if (parent.id === node.id) continue;
    const parentSize = sizes.get(parent.id) ?? { width: 260, height: 360 };
    if (parentSize.width * parentSize.height < area * 1.1) continue;
    const overlap = intersectionArea(node, size, parent, parentSize);
    if (overlap > area * 0.15 && overlap > maxOverlap) {
      best = parent;
      maxOverlap = overlap;
    }
  }
  return best;
}

function separateStickers(
  nodes: Node[],
  sizes: Map<string, EstimatedNodeSize>,
): { primaryNodes: Node[]; stickers: StickerAttachment[] } {
  const parents = nodes.filter((node) => node.type !== "text");
  const primaryNodes: Node[] = [];
  const stickers: StickerAttachment[] = [];
  for (const node of nodes) {
    const parent =
      node.type === "text"
        ? findStickerParent(node, parents, sizes)
        : undefined;
    if (!parent) {
      primaryNodes.push(node);
      continue;
    }
    stickers.push({
      sticker: node,
      parentNodeId: parent.id,
      offsetX: node.position.x - parent.position.x,
      offsetY: node.position.y - parent.position.y,
    });
  }
  return { primaryNodes, stickers };
}

function horizontalConflict(
  node: Node,
  row: Node[],
  sizes: Map<string, EstimatedNodeSize>,
): boolean {
  const size = sizes.get(node.id)!;
  return row.some((member) => {
    const memberSize = sizes.get(member.id)!;
    const overlap = Math.max(
      0,
      Math.min(
        node.position.x + size.width,
        member.position.x + memberSize.width,
      ) - Math.max(node.position.x, member.position.x),
    );
    return overlap > Math.min(size.width, memberSize.width) * 0.6;
  });
}

function findCompatibleRow(
  node: Node,
  rows: Node[][],
  sizes: Map<string, EstimatedNodeSize>,
): Node[] | undefined {
  const size = sizes.get(node.id)!;
  const center = node.position.y + size.height / 2;
  let best: Node[] | undefined;
  let minDistance = Infinity;
  for (const row of rows) {
    if (horizontalConflict(node, row, sizes)) continue;
    const averageCenter =
      row.reduce(
        (sum, item) => sum + item.position.y + sizes.get(item.id)!.height / 2,
        0,
      ) / row.length;
    const averageHeight =
      row.reduce((sum, item) => sum + sizes.get(item.id)!.height, 0) /
      row.length;
    const distance = Math.abs(center - averageCenter);
    if (
      distance < Math.max(averageHeight, size.height) * 0.55 &&
      distance < minDistance
    ) {
      best = row;
      minDistance = distance;
    }
  }
  return best;
}

function clusterRows(
  nodes: Node[],
  sizes: Map<string, EstimatedNodeSize>,
): Node[][] {
  const sorted = [...nodes].sort(
    (a, b) =>
      a.position.y +
      sizes.get(a.id)!.height / 2 -
      (b.position.y + sizes.get(b.id)!.height / 2),
  );
  const rows: Node[][] = [];
  for (const node of sorted) {
    const row = findCompatibleRow(node, rows, sizes);
    if (row) row.push(node);
    else rows.push([node]);
  }
  rows.sort((a, b) => averageY(a) - averageY(b));
  rows.forEach((row) => row.sort((a, b) => a.position.x - b.position.x));
  return rows;
}

function averageY(nodes: Node[]): number {
  return nodes.reduce((sum, node) => sum + node.position.y, 0) / nodes.length;
}

function positionRows(
  rows: Node[][],
  nodes: Node[],
  sizes: Map<string, EstimatedNodeSize>,
): Map<string, { x: number; y: number }> {
  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const positioned = new Map<string, { x: number; y: number }>();
  let y = minY;
  for (const row of rows) {
    const rowMinX = Math.min(...row.map((node) => node.position.x));
    let x = Math.abs(rowMinX - minX) < 100 ? minX : rowMinX;
    let maxHeight = 0;
    for (const node of row) {
      const size = sizes.get(node.id)!;
      positioned.set(node.id, { x, y });
      x += size.width + 20;
      maxHeight = Math.max(maxHeight, size.height);
    }
    y += maxHeight + 24;
  }
  return positioned;
}

function reattachStickers(
  positioned: Map<string, { x: number; y: number }>,
  stickers: StickerAttachment[],
): void {
  for (const { sticker, parentNodeId, offsetX, offsetY } of stickers) {
    const parent = positioned.get(parentNodeId);
    positioned.set(
      sticker.id,
      parent
        ? { x: parent.x + offsetX, y: parent.y + offsetY }
        : sticker.position,
    );
  }
}

function arrangeDelveNodes(
  params: AutoArrangeParams,
  clock: Clock,
): Node[] | undefined {
  const delveRooms = params.nodes.filter((node) => node.type === "delveRoom");
  if (delveRooms.length === 0) return undefined;
  const now = clock.now();
  const document: DelveCanvasDocument = {
    id: params.canvasId,
    conceptId: params.canvasId,
    title: params.title,
    nodes: params.nodes.map(flowNodeToCanvasNode) as DelveCanvasNode[],
    edges: params.edges.map((edge) =>
      flowEdgeToCanvasEdge(edge),
    ) as DelveCanvasEdge[],
    metadata: {
      size: "medium",
      entranceRoomIds: delveRooms
        .filter(
          (node) =>
            (node.data as unknown as DelveRoomNodeData).role === "entrance",
        )
        .map((node) => node.id),
      createdAt: now,
      updatedAt: now,
    },
  };
  const layout = new DelveFlowLayout().applyLayout(document);
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  return params.nodes.map((node) => {
    const match = byId.get(node.id);
    if (!match) return node;
    return {
      ...node,
      position: match.position,
      width: match.width,
      height: match.height,
      parentId: match.parentId,
      extent: match.extent === "parent" ? "parent" : (node.extent ?? undefined),
    };
  });
}

function toAdventureNodes(nodes: Node[]): AdventureNode[] {
  return nodes.flatMap((node): AdventureNode[] => {
    const type = getAdventureNodeType(node);
    if (!type) return [];
    return [
      {
        id: node.id,
        type,
        position: node.position,
        data: {
          ...(node.data as unknown as AdventureNode["data"]),
          type,
          title:
            typeof node.data?.title === "string"
              ? node.data.title
              : "Untitled Node",
        },
      },
    ];
  });
}

function arrangeAdventureNodes(
  params: AutoArrangeParams,
  clock: Clock,
): Node[] | undefined {
  const nodes = toAdventureNodes(params.nodes);
  if (nodes.length === 0) return undefined;
  const ids = new Set(nodes.map((node) => node.id));
  const now = new Date(clock.now()).toISOString();
  const document: AdventureCanvasDocument = {
    id: params.canvasId,
    title: params.title,
    summary: "",
    genre: "Fantasy",
    nodes,
    edges: params.edges
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .map((edge): AdventureEdge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: typeof edge.label === "string" ? edge.label : undefined,
      })),
    metadata: { kind: "adventure" },
    createdAt: now,
    updatedAt: now,
  };
  const layout = new AdventureFlowLayout().applyLayout(document);
  const positions = new Map(
    layout.nodes.map((node) => [node.id, node.position]),
  );
  return params.nodes.map((node) => {
    const position = positions.get(node.id);
    return position ? { ...node, position } : node;
  });
}

function arrangeSpatialNodes(params: AutoArrangeParams): Node[] | null {
  if (params.nodes.length === 0) return null;
  const sizes = new Map(
    params.nodes.map((node) => [
      node.id,
      getEstimatedNodeSize(node, params.vaultEntities),
    ]),
  );
  const { primaryNodes, stickers } = separateStickers(params.nodes, sizes);
  if (primaryNodes.length === 0) return params.nodes;
  const rows = clusterRows(primaryNodes, sizes);
  const positioned = positionRows(rows, primaryNodes, sizes);
  reattachStickers(positioned, stickers);
  return params.nodes.map((node) => {
    const position = positioned.get(node.id);
    return position ? { ...node, position } : node;
  });
}

export function autoArrangeCanvasNodes(
  params: AutoArrangeParams,
): Node[] | null {
  const clock = params.clock ?? systemClock;
  return (
    arrangeDelveNodes(params, clock) ??
    arrangeAdventureNodes(params, clock) ??
    arrangeSpatialNodes(params)
  );
}
