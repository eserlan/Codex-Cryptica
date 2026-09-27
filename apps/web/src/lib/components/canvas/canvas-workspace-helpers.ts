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

interface StickerAttachment {
  sticker: Node;
  parentNodeId: string;
  offsetX: number;
  offsetY: number;
}

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
