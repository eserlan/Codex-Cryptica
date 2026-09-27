import type { Connection, Edge, Node } from "@xyflow/svelte";
import { normalizeSpatialImageTransform } from "@codex/spatial-engine";
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
import {
  normalizeEntityCardViewPreference,
  resolveEntityCardVariant,
  type EntityCardVariant,
  type EntityCardViewPreference,
} from "./cards/entity-card-variant";

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
  return normalizeSpatialImageTransform({
    rotation: node?.data?.rotation as number,
  }).rotation;
}

export function canvasNodeZIndex(node: Node | undefined) {
  return normalizeSpatialImageTransform({
    zIndex: node?.data?.zIndex as number,
  }).zIndex;
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

export interface EstimatedNodeSize {
  width: number;
  height: number;
}

function getLiveDomSize(
  node: Node,
  variant: EntityCardVariant,
  isLarge: boolean,
): EstimatedNodeSize | undefined {
  const nodeEl = findCanvasNodeElement(node.id);
  if (!nodeEl) return undefined;
  const contentEl = (nodeEl.firstElementChild as HTMLElement) || nodeEl;
  const width = Math.max(nodeEl.offsetWidth || 0, contentEl.offsetWidth || 0);
  const height = Math.max(
    nodeEl.offsetHeight || 0,
    contentEl.offsetHeight || 0,
  );
  return isInvalidLiveSize(width, height, variant, isLarge)
    ? undefined
    : { width, height };
}

function findCanvasNodeElement(id: string): HTMLElement | null {
  if (
    typeof document === "undefined" ||
    typeof document.querySelector !== "function"
  )
    return null;
  return document.querySelector(
    `.svelte-flow__node[data-id="${id}"], [data-id="${id}"]`,
  ) as HTMLElement | null;
}

function isInvalidLiveSize(
  width: number,
  height: number,
  variant: EntityCardVariant,
  isLarge: boolean,
): boolean {
  if (width <= 40 || height <= 40) return true;
  if (variant === "image_only" && !isLarge) return width > 320;
  return (
    variant !== "compact" &&
    variant !== "image_only" &&
    width <= 200 &&
    height <= 260
  );
}

function getMeasuredNodeSize(
  node: Node,
  variant: EntityCardVariant,
  isLarge: boolean,
): EstimatedNodeSize | undefined {
  const width = (node as any).measured?.width as number | undefined;
  const height = (node as any).measured?.height as number | undefined;
  if (!isValidMeasuredSize(width, height)) return undefined;
  return normalizeMeasuredNodeSize(width, height as number, variant, isLarge);
}

function normalizeMeasuredNodeSize(
  width: number,
  height: number,
  variant: EntityCardVariant,
  isLarge: boolean,
): EstimatedNodeSize {
  if (variant === "image_only" && !isLarge && width > 320)
    return { width: 192, height: 256 };
  if (isSmallCardMeasurement(width, height, variant)) {
    return { width: isLarge ? 580 : 300, height: isLarge ? 500 : 480 };
  }
  return { width, height };
}

function isValidMeasuredSize(width: unknown, height: unknown): width is number {
  return (
    typeof width === "number" &&
    width > 0 &&
    typeof height === "number" &&
    height > 0
  );
}

function isSmallCardMeasurement(
  width: number,
  height: number | undefined,
  variant: EntityCardVariant,
): boolean {
  return (
    variant !== "image_only" &&
    variant !== "compact" &&
    width <= 200 &&
    (height ?? Infinity) <= 260
  );
}

function getDefaultNodeSize(
  node: Node,
  data: Record<string, unknown>,
  entity: { metadata?: Record<string, unknown>; type?: string } | undefined,
  cardView: EntityCardViewPreference,
  variant: EntityCardVariant,
  isLarge: boolean,
): EstimatedNodeSize {
  const width = (node.width as number) || (data.width as number);
  const height = (node.height as number) || (data.height as number);
  const fixedSizes: Record<string, EstimatedNodeSize> = {
    text: { width: 200, height: 140 },
    file: { width: 220, height: 180 },
    delveRoom: { width: 280, height: 200 },
    adventureNode: { width: 280, height: 200 },
  };
  const fixedSize = node.type ? fixedSizes[node.type] : undefined;
  if (fixedSize) return applyExplicitSize(fixedSize, width, height);

  const isFaction = isFactionCard(entity?.type, cardView);
  const standardSize = isLarge ? LARGE_CARD_SIZE : STANDARD_CARD_SIZE;
  const defaults: Record<EntityCardVariant, EstimatedNodeSize> = {
    image_only: isFaction
      ? FACTION_IMAGE_SIZE
      : { width: isLarge ? 580 : 192, height: 256 },
    compact: COMPACT_CARD_SIZE,
    roster: ROSTER_CARD_SIZE,
    default: standardSize,
    character: standardSize,
    faction: standardSize,
    location: standardSize,
  };
  return applyExplicitSize(defaults[variant], width, height);
}

const STANDARD_CARD_SIZE = { width: 300, height: 480 };
const LARGE_CARD_SIZE = { width: 580, height: 480 };
const COMPACT_CARD_SIZE = { width: 112, height: 160 };
const ROSTER_CARD_SIZE = { width: 580, height: 540 };
const FACTION_IMAGE_SIZE = { width: 580, height: 380 };

function isFactionCard(
  entityType: string | undefined,
  preference: EntityCardViewPreference,
): boolean {
  return (
    (entityType ?? "").toLowerCase() === "faction" ||
    preference === "roster" ||
    preference === "faction"
  );
}

function applyExplicitSize(
  fallback: EstimatedNodeSize,
  width: number | undefined,
  height: number | undefined,
): EstimatedNodeSize {
  return { width: width || fallback.width, height: height || fallback.height };
}

export function getEstimatedNodeSize(
  node: Node,
  vaultEntities?: Record<
    string,
    { metadata?: Record<string, unknown>; type?: string } | undefined
  >,
): EstimatedNodeSize {
  const data = (node.data || {}) as Record<string, unknown>;
  const cardView = normalizeEntityCardViewPreference(data.cardView);
  const entityId = (data.entityId as string) || node.id;
  const entity = vaultEntities?.[entityId];
  const variant = resolveEntityCardVariant(entity?.type, cardView);
  const isLarge = Boolean(data.largeCard) || variant === "roster";

  return (
    getLiveDomSize(node, variant, isLarge) ??
    getMeasuredNodeSize(node, variant, isLarge) ??
    getDefaultNodeSize(node, data, entity, cardView, variant, isLarge)
  );
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
