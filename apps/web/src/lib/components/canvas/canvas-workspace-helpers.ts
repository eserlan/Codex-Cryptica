import type { Connection, Edge, Node } from "@xyflow/svelte";
import type { Canvas, CanvasEdge, CanvasNode } from "@codex/canvas-engine";

export type CanvasWorkspacePoint = { x: number; y: number };

const DELVE_ROOM_WIDTH = 220;
const DELVE_ROOM_HEIGHT = 120;
const SECTOR_PADDING_X = 40;
const SECTOR_PADDING_TOP = 60;
const SECTOR_PADDING_BOTTOM = 40;

export interface CanvasWorkspaceMetadataSource {
  name?: string | null;
  slug?: string | null;
}

export function isGenericCanvasName(
  value: string | null | undefined,
  canvasId: string,
) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === canvasId.toLowerCase() || normalized.includes("untitled")
  );
}

export function canvasNodeToFlowNode(node: CanvasNode): Node {
  const isSectorGroup = node.type === "delveSectorGroup";
  const isDelveRoom = node.type === "delveRoom";
  return {
    id: node.id,
    type: node.type || "entity",
    position: node.position || { x: 0, y: 0 },
    parentId: (node as any).parentId,
    style: (node as any).style,
    width: node.width,
    height: node.height,
    draggable: true,
    selectable: !isSectorGroup,
    dragHandle: isSectorGroup ? ".sector-drag-handle" : undefined,
    extent: isDelveRoom ? null : ((node as any).extent ?? undefined),
    zIndex: isSectorGroup ? 0 : undefined,
    data: {
      entityId: node.entityId,
      width: node.width,
      height: node.height,
      ...((node as any).data || {}),
    },
  };
}

export function canvasEdgeToFlowEdge(edge: CanvasEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || null,
    targetHandle: edge.targetHandle || null,
    label: edge.label || "",
    type: edge.type === "line" || !edge.type ? "straight" : (edge.type as any),
    style: typeof edge.style === "string" ? edge.style : undefined,
    data: (edge as any).data || {},
  };
}

export function flowNodeToCanvasNode(node: Node): CanvasNode {
  const data = (node.data ?? {}) as Record<string, unknown>;
  return {
    id: node.id,
    type: (node.type ?? "entity") as CanvasNode["type"],
    position: node.position,
    entityId: typeof data.entityId === "string" ? data.entityId : undefined,
    width: node.width ?? (data.width as number | undefined),
    height: node.height ?? (data.height as number | undefined),
    parentId: node.parentId,
    extent: typeof node.extent === "string" ? node.extent : undefined,
    style: node.style,
    data,
  } as CanvasNode;
}

function nodeWidth(node: Node): number {
  return (
    node.measured?.width ??
    node.width ??
    (node.data?.width as number | undefined) ??
    DELVE_ROOM_WIDTH
  );
}

function nodeHeight(node: Node): number {
  return (
    node.measured?.height ??
    node.height ??
    (node.data?.height as number | undefined) ??
    DELVE_ROOM_HEIGHT
  );
}

/**
 * Fits each delve sector frame to its child Areas. Child coordinates are
 * shifted by the inverse frame movement, so their absolute canvas positions
 * remain unchanged.
 */
export function fitDelveSectorFrames(nodes: Node[]): Node[] {
  const updates = new Map<
    string,
    Pick<Node, "position" | "width" | "height">
  >();

  for (const sector of nodes.filter(
    (node) => node.type === "delveSectorGroup",
  )) {
    const rooms = nodes.filter(
      (node) => node.type === "delveRoom" && node.parentId === sector.id,
    );
    if (rooms.length === 0) continue;

    const minX = Math.min(...rooms.map((room) => room.position.x));
    const minY = Math.min(...rooms.map((room) => room.position.y));
    const maxX = Math.max(
      ...rooms.map((room) => room.position.x + nodeWidth(room)),
    );
    const maxY = Math.max(
      ...rooms.map((room) => room.position.y + nodeHeight(room)),
    );
    const frameShiftX = minX - SECTOR_PADDING_X;
    const frameShiftY = minY - SECTOR_PADDING_TOP;

    updates.set(sector.id, {
      position: {
        x: sector.position.x + frameShiftX,
        y: sector.position.y + frameShiftY,
      },
      width: maxX - minX + SECTOR_PADDING_X * 2,
      height: maxY - minY + SECTOR_PADDING_TOP + SECTOR_PADDING_BOTTOM,
    });
    for (const room of rooms) {
      updates.set(room.id, {
        position: {
          x: room.position.x - frameShiftX,
          y: room.position.y - frameShiftY,
        },
        width: room.width,
        height: room.height,
      });
    }
  }

  return nodes.map((node) => {
    const update = updates.get(node.id);
    return update ? { ...node, ...update } : node;
  });
}

export function flowEdgeToCanvasEdge(
  edge: Edge,
  createFallbackId?: () => string,
): CanvasEdge {
  return {
    id: edge.id || createFallbackId?.() || `edge-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    label: typeof edge.label === "string" ? edge.label : undefined,
    type: edge.type ?? "smoothstep",
    style: edge.style as CanvasEdge["style"],
    data: edge.data,
    animated: edge.animated,
  };
}

export function hydrateCanvasGraph(
  data: Pick<Canvas, "nodes" | "edges"> | null | undefined,
) {
  return {
    nodes: (data?.nodes || []).map(canvasNodeToFlowNode),
    edges: (data?.edges || []).map(canvasEdgeToFlowEdge),
  };
}

export function pruneCanvasGraph(
  nodes: Node[],
  edges: Edge[],
  entityIds: Set<string>,
) {
  const remainingNodes = nodes.filter((node) => {
    if (node.type !== "entity") return true;
    return entityIds.has((node.data?.entityId as string) || "");
  });

  const remainingNodeIds = new Set(remainingNodes.map((node) => node.id));
  const remainingEdges = edges.filter(
    (edge) =>
      remainingNodeIds.has(edge.source) && remainingNodeIds.has(edge.target),
  );

  return {
    nodes: remainingNodes,
    edges: remainingEdges,
  };
}

function resolveCanvasMetaValue(
  existing: string | null | undefined,
  current: string | null | undefined,
  canvasId: string,
) {
  if (!isGenericCanvasName(existing, canvasId)) return existing!;
  if (!isGenericCanvasName(current, canvasId)) return current!;
  return existing || current || canvasId;
}

export function buildCanvasSavePayload(params: {
  existing: Partial<Canvas> | undefined;
  currentCanvas: CanvasWorkspaceMetadataSource | null | undefined;
  exported: Canvas;
  canvasId: string;
  lastModified: number;
}): Canvas {
  const existing = params.existing || {};
  const currentCanvas = params.currentCanvas || null;

  return {
    ...existing,
    id: params.canvasId,
    name: resolveCanvasMetaValue(
      existing.name,
      currentCanvas?.name,
      params.canvasId,
    ),
    slug: resolveCanvasMetaValue(
      existing.slug,
      currentCanvas?.slug,
      params.canvasId,
    ),
    ...params.exported,
    lastModified: params.lastModified,
  };
}

export function createFlowEntityNode(
  entityId: string,
  position: CanvasWorkspacePoint,
  nodeId: string,
): Node {
  return {
    id: nodeId,
    type: "entity",
    position,
    data: { entityId },
  };
}

export function createFlowEdgeFromConnection(
  connection: Connection,
  edgeId: string,
): Edge {
  return {
    ...connection,
    id: edgeId,
    type: "straight",
    animated: true,
    style: "stroke: var(--color-theme-primary); stroke-width: 2;",
  } as Edge;
}

export function resolveSpawnPosition(params: {
  screenToFlowPosition: (point: CanvasWorkspacePoint) => CanvasWorkspacePoint;
  windowSize: { width: number; height: number };
  screenPosition?: CanvasWorkspacePoint;
  flowPosition?: CanvasWorkspacePoint;
}) {
  if (params.screenPosition) {
    return params.screenToFlowPosition(params.screenPosition);
  }

  if (params.flowPosition) {
    return params.flowPosition;
  }

  const centerX = params.windowSize.width / 2;
  const centerY = params.windowSize.height / 2;
  return params.screenToFlowPosition({ x: centerX, y: centerY });
}

export function resolveBatchSpawnPosition(params: {
  index: number;
  screenToFlowPosition: (point: CanvasWorkspacePoint) => CanvasWorkspacePoint;
  windowSize: { width: number; height: number };
  screenPosition?: CanvasWorkspacePoint;
}) {
  if (params.screenPosition) {
    return params.screenToFlowPosition(params.screenPosition);
  }

  return params.screenToFlowPosition({
    x: params.windowSize.width / 2 + params.index * 30,
    y: params.windowSize.height / 2 + params.index * 30,
  });
}
