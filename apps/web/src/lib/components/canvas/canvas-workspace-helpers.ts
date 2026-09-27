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

  // 1. Try reading live unscaled DOM dimensions directly from the browser
  if (
    typeof document !== "undefined" &&
    typeof document.querySelector === "function"
  ) {
    const nodeEl = document.querySelector(
      `.svelte-flow__node[data-id="${node.id}"], [data-id="${node.id}"]`,
    ) as HTMLElement | null;
    if (nodeEl) {
      const contentEl = (nodeEl.firstElementChild as HTMLElement) || nodeEl;
      const domWidth = Math.max(
        nodeEl.offsetWidth || 0,
        contentEl.offsetWidth || 0,
      );
      const domHeight = Math.max(
        nodeEl.offsetHeight || 0,
        contentEl.offsetHeight || 0,
      );
      if (domWidth > 40 && domHeight > 40) {
        // Guard against view transition lag if mode was just toggled
        const isImageMismatch =
          variant === "image_only" && !isLarge && domWidth > 320;
        const isCardMismatch =
          variant !== "image_only" &&
          variant !== "compact" &&
          domWidth <= 200 &&
          domHeight <= 260;
        if (!isImageMismatch && !isCardMismatch) {
          return { width: domWidth, height: domHeight };
        }
      }
    }
  }

  // 2. Fall back to live measured dimensions from SvelteFlow
  const measuredWidth = (node as any).measured?.width as number | undefined;
  const measuredHeight = (node as any).measured?.height as number | undefined;

  if (
    typeof measuredWidth === "number" &&
    measuredWidth > 0 &&
    typeof measuredHeight === "number" &&
    measuredHeight > 0
  ) {
    if (variant === "image_only" && !isLarge && measuredWidth > 320) {
      return { width: 192, height: 256 };
    }
    if (
      variant !== "image_only" &&
      variant !== "compact" &&
      measuredWidth <= 200 &&
      measuredHeight <= 260
    ) {
      return { width: isLarge ? 580 : 300, height: isLarge ? 500 : 480 };
    }
    return { width: measuredWidth, height: measuredHeight };
  }

  const explicitWidth = (node.width as number) || (data.width as number);
  const explicitHeight = (node.height as number) || (data.height as number);

  if (node.type === "text") {
    return {
      width: explicitWidth || 200,
      height: explicitHeight || 140,
    };
  }

  if (node.type === "file") {
    return {
      width: explicitWidth || 220,
      height: explicitHeight || 180,
    };
  }

  if (node.type === "delveRoom" || node.type === "adventureNode") {
    return {
      width: explicitWidth || 280,
      height: explicitHeight || 200,
    };
  }

  const isFaction =
    (entity?.type ?? "").toLowerCase() === "faction" ||
    cardView === "roster" ||
    cardView === "faction";

  if (variant === "image_only") {
    if (isFaction) {
      return {
        width: explicitWidth || 580,
        height: explicitHeight || 380,
      };
    }
    return {
      width: explicitWidth || (isLarge ? 580 : 192),
      height: explicitHeight || 256,
    };
  }

  if (variant === "compact") {
    return {
      width: explicitWidth || 112,
      height: explicitHeight || 160,
    };
  }

  if (variant === "roster") {
    return {
      width: explicitWidth || 580,
      height: explicitHeight || 540,
    };
  }

  if (isLarge) {
    return {
      width: explicitWidth || 580,
      height: explicitHeight || 480,
    };
  }

  return {
    width: explicitWidth || 300,
    height: explicitHeight || 480,
  };
}

export function autoArrangeCanvasNodes(params: {
  canvasId: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  vaultEntities?: Record<
    string,
    { metadata?: Record<string, unknown> } | undefined
  >;
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
  if (adventureNodes.length > 0) {
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

  if (params.nodes.length === 0) return null;

  // General / entity canvas layout:
  // Respect current spatial placements. Group nodes into existing visual rows,
  // pack them with consistent gaps according to their current dynamic sizes (e.g. image-only vs regular cards),
  // and keep sticker notes pinned to their parent cards.
  const nodeSizes = new Map<string, EstimatedNodeSize>();
  for (const node of params.nodes) {
    nodeSizes.set(node.id, getEstimatedNodeSize(node, params.vaultEntities));
  }

  // Separate sticker notes (small notes overlapping a larger card) from primary row nodes
  interface StickerAttachment {
    sticker: Node;
    parentNodeId: string;
    offsetX: number;
    offsetY: number;
  }

  const potentialParents = params.nodes.filter((n) => n.type !== "text");
  const stickers: StickerAttachment[] = [];
  const primaryNodes: Node[] = [];

  for (const node of params.nodes) {
    if (node.type === "text" && potentialParents.length > 0) {
      const candSize = nodeSizes.get(node.id) || { width: 200, height: 140 };
      const candArea = candSize.width * candSize.height;

      let bestParent: Node | null = null;
      let maxOverlap = 0;

      for (const parent of potentialParents) {
        if (parent.id === node.id) continue;
        const parentSize = nodeSizes.get(parent.id) || {
          width: 260,
          height: 360,
        };
        const parentArea = parentSize.width * parentSize.height;
        if (parentArea < candArea * 1.1) continue;

        const xOverlap = Math.max(
          0,
          Math.min(
            node.position.x + candSize.width,
            parent.position.x + parentSize.width,
          ) - Math.max(node.position.x, parent.position.x),
        );
        const yOverlap = Math.max(
          0,
          Math.min(
            node.position.y + candSize.height,
            parent.position.y + parentSize.height,
          ) - Math.max(node.position.y, parent.position.y),
        );
        const overlapArea = xOverlap * yOverlap;

        if (overlapArea > candArea * 0.15 && overlapArea > maxOverlap) {
          maxOverlap = overlapArea;
          bestParent = parent;
        }
      }

      if (bestParent) {
        stickers.push({
          sticker: node,
          parentNodeId: bestParent.id,
          offsetX: node.position.x - bestParent.position.x,
          offsetY: node.position.y - bestParent.position.y,
        });
        continue;
      }
    }

    primaryNodes.push(node);
  }

  if (primaryNodes.length === 0) {
    return params.nodes;
  }

  // Sort primary nodes by vertical center position
  const sortedByY = [...primaryNodes].sort((a, b) => {
    const sizeA = nodeSizes.get(a.id)!;
    const sizeB = nodeSizes.get(b.id)!;
    const centerYA = a.position.y + sizeA.height / 2;
    const centerYB = b.position.y + sizeB.height / 2;
    return centerYA - centerYB;
  });

  // Cluster primary nodes into visual rows
  const rows: Node[][] = [];
  for (const node of sortedByY) {
    const nodeSize = nodeSizes.get(node.id)!;
    const nodeCenterY = node.position.y + nodeSize.height / 2;

    let bestRow: Node[] | null = null;
    let minCenterDiff = Infinity;

    for (const row of rows) {
      // Check for column conflict: if this node heavily overlaps horizontally (>60%) with any node
      // already in this row, they are in the same vertical column and cannot share the same row.
      let hasColConflict = false;
      for (const rowMember of row) {
        const memberSize = nodeSizes.get(rowMember.id)!;
        const xOverlap = Math.max(
          0,
          Math.min(
            node.position.x + nodeSize.width,
            rowMember.position.x + memberSize.width,
          ) - Math.max(node.position.x, rowMember.position.x),
        );
        const minW = Math.min(nodeSize.width, memberSize.width);
        if (xOverlap > minW * 0.6) {
          hasColConflict = true;
          break;
        }
      }

      if (hasColConflict) continue;

      const rowCenterYs = row.map((m) => {
        const s = nodeSizes.get(m.id)!;
        return m.position.y + s.height / 2;
      });
      const rowAvgCenterY =
        rowCenterYs.reduce((sum, v) => sum + v, 0) / row.length;
      const rowAvgHeight =
        row.reduce((sum, m) => sum + nodeSizes.get(m.id)!.height, 0) /
        row.length;

      const centerDiff = Math.abs(nodeCenterY - rowAvgCenterY);
      const maxAllowedDiff = Math.max(rowAvgHeight, nodeSize.height) * 0.55;

      if (centerDiff < maxAllowedDiff && centerDiff < minCenterDiff) {
        minCenterDiff = centerDiff;
        bestRow = row;
      }
    }

    if (bestRow) {
      bestRow.push(node);
    } else {
      rows.push([node]);
    }
  }

  // Sort rows vertically and sort nodes within each row horizontally
  rows.sort((rowA, rowB) => {
    const avgYA = rowA.reduce((sum, n) => sum + n.position.y, 0) / rowA.length;
    const avgYB = rowB.reduce((sum, n) => sum + n.position.y, 0) / rowB.length;
    return avgYA - avgYB;
  });

  for (const row of rows) {
    row.sort((a, b) => a.position.x - b.position.x);
  }

  const GAP_X = 20;
  const GAP_Y = 24;

  const canvasMinX = Math.min(...primaryNodes.map((n) => n.position.x));
  const canvasMinY = Math.min(...primaryNodes.map((n) => n.position.y));

  let currentY = canvasMinY;
  const positionedMap = new Map<string, { x: number; y: number }>();

  for (const row of rows) {
    const rowMinX = Math.min(...row.map((n) => n.position.x));
    const startX = Math.abs(rowMinX - canvasMinX) < 100 ? canvasMinX : rowMinX;

    let currentX = startX;
    let maxRowHeight = 0;

    for (const node of row) {
      const size = getEstimatedNodeSize(node, params.vaultEntities);
      positionedMap.set(node.id, { x: currentX, y: currentY });
      currentX += size.width + GAP_X;
      if (size.height > maxRowHeight) {
        maxRowHeight = size.height;
      }
    }

    currentY += maxRowHeight + GAP_Y;
  }

  // Re-attach stickers relative to their parent's new position
  for (const sticker of stickers) {
    const parentPos = positionedMap.get(sticker.parentNodeId);
    if (parentPos) {
      positionedMap.set(sticker.sticker.id, {
        x: parentPos.x + sticker.offsetX,
        y: parentPos.y + sticker.offsetY,
      });
    } else {
      positionedMap.set(sticker.sticker.id, sticker.sticker.position);
    }
  }

  return params.nodes.map((node) => {
    const pos = positionedMap.get(node.id);
    return pos ? { ...node, position: pos } : node;
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
