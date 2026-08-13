import type { Connection, Edge, Node } from "@xyflow/svelte";
import {
  CanvasFileSchema,
  type Canvas,
  type CanvasEdge,
  type CanvasNode,
} from "@codex/canvas-engine";
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

export type CanvasWorkspacePoint = { x: number; y: number };

export function pointerAngleDegrees(
  first: CanvasWorkspacePoint,
  second: CanvasWorkspacePoint,
) {
  return (Math.atan2(second.y - first.y, second.x - first.x) * 180) / Math.PI;
}

export function accumulateRotationDegrees(
  rotation: number,
  previousPointerAngle: number,
  pointerAngle: number,
) {
  if (
    !Number.isFinite(rotation) ||
    !Number.isFinite(previousPointerAngle) ||
    !Number.isFinite(pointerAngle)
  ) {
    return rotation;
  }

  let delta = pointerAngle - previousPointerAngle;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return rotation + delta;
}

export function canvasNodeRotation(node: Node | undefined) {
  const rotation = node?.data?.rotation;
  return typeof rotation === "number" && Number.isFinite(rotation)
    ? rotation
    : 0;
}

export function canvasNodeZIndex(node: Node | undefined) {
  const zIndex = node?.data?.zIndex;
  return typeof zIndex === "number" && Number.isFinite(zIndex) ? zIndex : 0;
}

export function canvasNodeStyle(node: Node) {
  const rotation = canvasNodeRotation(node);
  const existing = node.style?.trim();
  // Rotation is applied via a CSS variable consumed by the node's content
  // element (see `.svelte-flow__node > *` below), not the `rotate` property
  // directly: SvelteFlow positions nodes with `transform: translate(...)` on
  // this same wrapper, and mixing that with a standalone `rotate` property on
  // one element breaks their shared transform-origin, causing the node to
  // visually swing away from its true position instead of spinning in place.
  return `${existing ? `${existing.replace(/;?$/, ";")}` : ""}--canvas-node-rotate:${rotation}deg;`;
}

const CANVAS_TEXT_BACKGROUND_STYLES: Record<string, string> = {
  default: "var(--color-theme-surface)",
  primary:
    "color-mix(in srgb, var(--color-theme-primary) 20%, var(--color-theme-surface))",
  accent:
    "color-mix(in srgb, var(--color-theme-accent) 20%, var(--color-theme-surface))",
  secondary:
    "color-mix(in srgb, var(--color-theme-secondary) 20%, var(--color-theme-surface))",
  warning:
    "color-mix(in srgb, var(--color-theme-warning) 25%, var(--color-theme-surface))",
  transparent: "transparent",
};

// Resolves a semantic background key (see CANVAS_TEXT_BACKGROUND_PRESETS) to
// a CSS value derived from the active theme's own variables, so text notes
// stay visually consistent with whichever theme the vault is using.
export function canvasTextBackgroundStyle(key: string) {
  return (
    CANVAS_TEXT_BACKGROUND_STYLES[key] ?? CANVAS_TEXT_BACKGROUND_STYLES.default
  );
}

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
      entityId: node.type === "entity" ? node.entityId : undefined,
      file: node.type === "file" ? node.file : undefined,
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

export function flowNodeToCanvasNode(node: Node): CanvasNode | undefined {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const base = {
    id: node.id,
    type: (node.type ?? "entity") as CanvasNode["type"],
    position: node.position,
    width: node.width ?? (data.width as number | undefined),
    height: node.height ?? (data.height as number | undefined),
    parentId: node.parentId,
    extent: typeof node.extent === "string" ? node.extent : undefined,
    style: node.style,
    data,
  };
  if (node.type === "file") {
    const file = CanvasFileSchema.safeParse(data.file);
    return file.success
      ? ({ ...base, file: file.data } as CanvasNode)
      : undefined;
  }
  return {
    ...base,
    entityId: typeof data.entityId === "string" ? data.entityId : undefined,
  } as CanvasNode;
}

export function flowNodesToCanvasNodes(nodes: Node[]): CanvasNode[] {
  return nodes.flatMap((node) => {
    const canvasNode = flowNodeToCanvasNode(node);
    return canvasNode ? [canvasNode] : [];
  });
}

export function createFlowFileNode(
  file: import("@codex/canvas-engine").CanvasFile,
  position: CanvasWorkspacePoint,
  nodeId: string,
): Node {
  const showFullImage = file.mimeType.startsWith("image/");
  return { id: nodeId, type: "file", position, data: { file, showFullImage } };
}

export function createFlowTextNode(
  text: string,
  position: CanvasWorkspacePoint,
  nodeId: string,
): Node {
  return {
    id: nodeId,
    type: "text",
    position,
    width: 200,
    height: 120,
    data: { text },
  };
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
  sourceNode?: Node,
  targetNode?: Node,
): Edge {
  const edge = {
    ...connection,
    id: edgeId,
    type: "straight",
    animated: true,
    style: "stroke: var(--color-theme-primary); stroke-width: 2;",
  } as Edge;

  if (sourceNode?.type === "delveRoom" && targetNode?.type === "delveRoom") {
    return {
      ...edge,
      type: "delveEdge",
      animated: false,
      style: undefined,
      data: {
        id: edgeId,
        sourceRoomId: connection.source,
        targetRoomId: connection.target,
        type: "standard",
        bidirectional: true,
      },
    };
  }

  const adventureTypes: AdventureNodeType[] = [
    "situation",
    "location",
    "npc",
    "clue",
    "threat",
    "outcome",
  ];
  const sourceType = (sourceNode?.data?.type ||
    sourceNode?.type) as AdventureNodeType;
  const targetType = (targetNode?.data?.type ||
    targetNode?.type) as AdventureNodeType;
  const isAdventure =
    sourceNode?.type === "adventureNode" ||
    targetNode?.type === "adventureNode" ||
    adventureTypes.includes(sourceType) ||
    adventureTypes.includes(targetType);
  if (!isAdventure) return edge;

  let label = "leads to";
  let type = "leads_to";
  if (targetType === "clue") {
    label = "holds clue";
    type = "holds_clue";
  } else if (targetType === "threat") {
    label = "threatens";
    type = "threatens";
  } else if (targetType === "outcome") {
    label = "resolves to";
    type = "resolves_to";
  }

  return {
    ...edge,
    label,
    type,
    data: { relation: label },
  };
}

export function reconnectFlowEdge(edge: Edge, connection: Connection): Edge {
  const data =
    edge.type === "delveEdge"
      ? {
          ...(edge.data || {}),
          sourceRoomId: connection.source,
          targetRoomId: connection.target,
        }
      : edge.data;

  return {
    ...edge,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    data,
  };
}

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

export function autoArrangeCanvasNodes(params: {
  canvasId: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  clock?: Clock;
}): Node[] | null {
  const clock = params.clock ?? systemClock;
  const delveRooms = params.nodes.filter((node) => node.type === "delveRoom");
  if (delveRooms.length > 0) {
    const now = clock.now();
    const rawDoc: DelveCanvasDocument = {
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
    const positioned = new DelveFlowLayout().applyLayout(rawDoc);
    const positionedById = new Map(
      positioned.nodes.map((node) => [node.id, node]),
    );
    return params.nodes.map((node) => {
      const match = positionedById.get(node.id);
      if (!match) return node;
      return {
        ...node,
        position: match.position,
        width: match.width,
        height: match.height,
        parentId: match.parentId,
        extent:
          match.extent === "parent" ? "parent" : (node.extent ?? undefined),
      };
    });
  }

  const adventureNodes = params.nodes.flatMap((node): AdventureNode[] => {
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
  if (adventureNodes.length === 0) return null;

  const adventureNodeIds = new Set(adventureNodes.map((node) => node.id));
  const now = new Date(clock.now()).toISOString();
  const rawDoc: AdventureCanvasDocument = {
    id: params.canvasId,
    title: params.title,
    summary: "",
    genre: "Fantasy",
    nodes: adventureNodes,
    edges: params.edges
      .filter(
        (edge) =>
          adventureNodeIds.has(edge.source) &&
          adventureNodeIds.has(edge.target),
      )
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
  const positioned = new AdventureFlowLayout().applyLayout(rawDoc);
  const positionedById = new Map(
    positioned.nodes.map((node) => [node.id, node.position]),
  );
  return params.nodes.map((node) => {
    const position = positionedById.get(node.id);
    return position ? { ...node, position } : node;
  });
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
