import type { Connection, Edge, Node } from "@xyflow/svelte";
import type { Canvas, CanvasEdge, CanvasNode } from "@codex/canvas-engine";

export type CanvasWorkspacePoint = { x: number; y: number };

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
  return {
    id: node.id,
    type: node.type || "entity",
    position: node.position || { x: 0, y: 0 },
    data: {
      entityId: node.entityId,
      width: node.width,
      height: node.height,
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
