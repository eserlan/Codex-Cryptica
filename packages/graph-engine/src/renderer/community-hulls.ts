import type { Core, NodeSingular } from "cytoscape";
import { detectCommunities } from "../communities";

export interface HullNode {
  id: string;
  x: number;
  y: number;
  /** Half the node's rendered size. */
  r: number;
}

export interface CommunityGroup {
  community: string;
  size: number;
  /** Members the community's background covers (outliers left out). */
  members: HullNode[];
  /** Links between those members, painted as bands so the shape is one piece. */
  links: Array<[HullNode, HullNode]>;
}

/** Communities smaller than this get no background: a halo around 3 nodes is noise. */
export const MIN_HULL_SIZE = 8;
/** Only the largest communities are shaded, so the backgrounds stay readable. */
export const MAX_HULLS = 24;
/** How far a community's background reaches beyond each member, in graph units. */
const HALO_PADDING = 46;
/** Background strength at rest, for the hovered node's group, and for the others meanwhile. */
const RESTING_ALPHA = 0.11;
const HIGHLIGHT_ALPHA = 0.2;
const FADED_ALPHA = 0.04;

/**
 * Members far from the rest of their community (more than twice the median
 * distance from its centre) are left out of its background, so one stray node
 * does not drag a shape across the graph.
 */
function withoutOutliers(members: HullNode[]): HullNode[] {
  const cx = members.reduce((sum, n) => sum + n.x, 0) / members.length;
  const cy = members.reduce((sum, n) => sum + n.y, 0) / members.length;
  const dist = members.map((n) => Math.hypot(n.x - cx, n.y - cy));
  const median = [...dist].sort((a, b) => a - b)[Math.floor(dist.length / 2)];
  const kept = members.filter((_, i) => dist[i] <= median * 2);
  return kept.length >= 3 ? kept : members;
}

/** The largest communities, each with the members its background covers. */
export function computeCommunityGroups(
  nodes: HullNode[],
  communities: ReadonlyMap<string, string>,
  {
    minSize = MIN_HULL_SIZE,
    maxCount = MAX_HULLS,
    edges = [] as ReadonlyArray<readonly [string, string]>,
    /** Communities to include whatever their size, e.g. the hovered node's. */
    include = new Set<string>() as ReadonlySet<string>,
  } = {},
): CommunityGroup[] {
  const groups = new Map<string, HullNode[]>();
  for (const node of nodes) {
    const community = communities.get(node.id);
    if (community === undefined) continue;
    let group = groups.get(community);
    if (!group) groups.set(community, (group = []));
    group.push(node);
  }
  const bySize = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1),
  );
  const shown = bySize
    .filter(([, members]) => members.length >= minSize)
    .slice(0, maxCount);
  const extra = bySize.filter(
    ([community, members]) =>
      include.has(community) &&
      members.length >= 2 &&
      !shown.some(([c]) => c === community),
  );
  return [...shown, ...extra].map(([community, members]) => {
    const kept = withoutOutliers(members);
    const byId = new Map(kept.map((n) => [n.id, n]));
    const links: Array<[HullNode, HullNode]> = [];
    for (const [a, b] of edges) {
      const na = byId.get(a);
      const nb = byId.get(b);
      if (na && nb) links.push([na, nb]);
    }
    return { community, size: members.length, members: kept, links };
  });
}

/** A distinct, quiet hue per community rank (golden-angle spacing). */
function hueFor(rank: number): number {
  return (rank * 137.508 + 200) % 360;
}

/**
 * Which groups to paint, in what order and how strongly. With a highlight
 * (the hovered node's group), it comes last (on top) and strong, the rest faint.
 */
export function paintOrder(
  groups: CommunityGroup[],
  highlighted: ReadonlySet<string>,
): Array<{ group: CommunityGroup; rank: number; alpha: number }> {
  const ranked = groups.map((group, rank) => ({ group, rank }));
  if (highlighted.size === 0) {
    return ranked.map((r) => ({ ...r, alpha: RESTING_ALPHA }));
  }
  const isSelected = (r: { group: CommunityGroup }) =>
    highlighted.has(r.group.community);
  return [
    ...ranked
      .filter((r) => !isSelected(r))
      .map((r) => ({ ...r, alpha: FADED_ALPHA })),
    ...ranked.filter(isSelected).map((r) => ({ ...r, alpha: HIGHLIGHT_ALPHA })),
  ];
}

export interface CommunityHullOverlay {
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

/** Longest side of one group's cached bitmap, in pixels. */
const MAX_BITMAP_SIDE = 2048;
/** Re-render a group's bitmap once the view's scale differs from it by this factor. */
const RESCALE_FACTOR = 1.6;
/** Wait after the last pan or zoom before re-rendering bitmaps at the new scale. */
const SHARPEN_DELAY_MS = 180;

interface GroupBitmap {
  canvas: HTMLCanvasElement;
  x1: number;
  y1: number;
  w: number;
  h: number;
  scale: number;
  /** Geometry and colour it was rendered from; a mismatch means stale. */
  key: string;
  /** Whether `scale` was capped by `MAX_BITMAP_SIDE`. */
  capped: boolean;
}

/** Identity of a group's shape and colour: members, positions, sizes and rank. */
function groupKey(group: CommunityGroup, rank: number): string {
  let key = `${rank}|`;
  for (const n of group.members)
    key += `${n.id}:${Math.round(n.x)},${Math.round(n.y)},${Math.round(n.r)};`;
  return key + `|${group.links.length}`;
}

/** Draws a group's merged halo shape, opaque, into its own small canvas. */
function renderGroupBitmap(
  canvas: HTMLCanvasElement,
  group: CommunityGroup,
  rank: number,
  wantedScale: number,
): Omit<GroupBitmap, "key"> {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const n of group.members) {
    const r = n.r + HALO_PADDING;
    x1 = Math.min(x1, n.x - r);
    y1 = Math.min(y1, n.y - r);
    x2 = Math.max(x2, n.x + r);
    y2 = Math.max(y2, n.y + r);
  }
  const w = Math.max(1, x2 - x1);
  const h = Math.max(1, y2 - y1);
  const limit = Math.min(MAX_BITMAP_SIDE / w, MAX_BITMAP_SIDE / h);
  const scale = Math.max(0.01, Math.min(wantedScale, limit));
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(h * scale);
  const g = canvas.getContext("2d");
  if (g) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(scale, 0, 0, scale, -x1 * scale, -y1 * scale);
    const colour = `hsl(${hueFor(rank)}, 55%, 58%)`;
    // Bands along the community's own links join its members' halos into one
    // shape; halos alone read as separate bubbles once members are far apart.
    g.strokeStyle = colour;
    g.lineCap = "round";
    g.lineWidth = HALO_PADDING * 2;
    g.beginPath();
    for (const [a, b] of group.links) {
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
    }
    g.stroke();
    g.fillStyle = colour;
    g.beginPath();
    for (const n of group.members) {
      const r = n.r + HALO_PADDING;
      g.moveTo(n.x + r, n.y);
      g.arc(n.x, n.y, r, 0, Math.PI * 2);
    }
    g.fill();
  }
  return { canvas, x1, y1, w, h, scale, capped: scale < wantedScale };
}

/**
 * Paints a soft background behind each large community on `canvas`, which
 * must sit under Cytoscape's own layer and cover the same area. Each member
 * gets a padded halo and a community's halos merge into one shape, so the
 * background follows its members rather than the space between them.
 *
 * Each group is rendered once into its own small bitmap, kept until its
 * members move or the graph changes; a frame only copies those bitmaps into
 * place. Redrawing every shape on every frame cut panning from 60 to about 19
 * frames a second on a 1,625-node vault. Bitmaps are re-rendered at the new
 * scale shortly after a zoom settles, so they stay sharp.
 */
export function attachCommunityHulls(
  cy: Core,
  canvas: HTMLCanvasElement,
  {
    enabled = true,
    createLayer = () => document.createElement("canvas"),
  }: { enabled?: boolean; createLayer?: () => HTMLCanvasElement } = {},
): CommunityHullOverlay {
  let on = enabled;
  let communities: Map<string, string> | null = null;
  let groups: CommunityGroup[] | null = null;
  let keys = new Map<string, string>();
  /** Community of the hovered node: shown strongly, the rest faded. */
  let highlighted = new Set<string>();
  let frame: number | null = null;
  let sharpenTimer: ReturnType<typeof setTimeout> | undefined;
  const bitmaps = new Map<string, GroupBitmap>();
  const ctx = canvas.getContext("2d");

  const visibleNodes = (): NodeSingular[] =>
    cy
      .nodes()
      .filter((n) => n.visible())
      .toArray() as NodeSingular[];

  let edgeList: Array<readonly [string, string]> | null = null;

  const recomputeGroups = () => {
    if (!communities || !edgeList) {
      edgeList = cy
        .edges()
        .map((e) => [e.source().id(), e.target().id()] as const);
      communities = detectCommunities(
        cy.nodes().map((n) => n.id()),
        edgeList,
      );
    }
    groups = computeCommunityGroups(
      visibleNodes().map((n) => {
        const p = n.position();
        return { id: n.id(), x: p.x, y: p.y, r: n.width() / 2 };
      }),
      communities,
      { edges: edgeList, include: highlighted },
    );
    keys = new Map(groups.map((g, rank) => [g.community, groupKey(g, rank)]));
    for (const community of bitmaps.keys())
      if (!keys.has(community)) bitmaps.delete(community);
  };

  const highlight = (id: string | null) => {
    if (id !== null && !communities) recomputeGroups();
    const community = id === null ? undefined : communities!.get(id);
    const next = new Set(community === undefined ? [] : [community]);
    if ([...next].join() === [...highlighted].join()) return;
    highlighted = next;
    // Only needed when the hovered group is too small to be shown already.
    if (community !== undefined && !keys.has(community)) groups = null;
    schedule();
  };
  const onHover = (evt: { target: NodeSingular }) => highlight(evt.target.id());
  const onLeave = () => highlight(null);

  const bitmapFor = (group: CommunityGroup, rank: number, scale: number) => {
    const key = keys.get(group.community)!;
    const current = bitmaps.get(group.community);
    if (current && current.key === key) return current;
    const rendered = renderGroupBitmap(
      current?.canvas ?? createLayer(),
      group,
      rank,
      scale,
    );
    const bitmap = { ...rendered, key };
    bitmaps.set(group.community, bitmap);
    return bitmap;
  };

  const draw = () => {
    frame = null;
    if (!ctx || cy.destroyed()) return;
    const dpr = globalThis.devicePixelRatio || 1;
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!on) return;
    if (!groups) recomputeGroups();
    const zoom = cy.zoom();
    const pan = cy.pan();
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * pan.x, dpr * pan.y);
    for (const { group, rank, alpha } of paintOrder(groups!, highlighted)) {
      const bitmap = bitmapFor(group, rank, dpr * zoom);
      ctx.globalAlpha = alpha;
      ctx.drawImage(bitmap.canvas, bitmap.x1, bitmap.y1, bitmap.w, bitmap.h);
    }
    ctx.globalAlpha = 1;
  };

  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(draw);
  };
  /** After a zoom settles, re-render bitmaps that are now much too coarse or fine. */
  const sharpen = () => {
    sharpenTimer = undefined;
    const wanted = (globalThis.devicePixelRatio || 1) * cy.zoom();
    let stale = false;
    for (const bitmap of bitmaps.values()) {
      const tooCoarse =
        wanted > bitmap.scale * RESCALE_FACTOR && !bitmap.capped;
      const tooFine = wanted < bitmap.scale / (RESCALE_FACTOR * 2);
      if (tooCoarse || tooFine) {
        bitmap.key = "";
        stale = true;
      }
    }
    if (stale) schedule();
  };
  const onViewport = () => {
    schedule();
    if (sharpenTimer !== undefined) clearTimeout(sharpenTimer);
    sharpenTimer = setTimeout(sharpen, SHARPEN_DELAY_MS);
  };
  const onStructure = () => {
    communities = null;
    edgeList = null;
    groups = null;
    schedule();
  };
  const onMove = () => {
    groups = null;
    schedule();
  };

  cy.on("add remove", onStructure);
  cy.on("position style", onMove);
  cy.on("viewport resize", onViewport);
  cy.on("mouseover", "node", onHover);
  cy.on("mouseout", "node", onLeave);
  schedule();

  return {
    setEnabled(next: boolean) {
      if (next === on) return;
      on = next;
      schedule();
    },
    destroy() {
      cy.off("add remove", onStructure);
      cy.off("position style", onMove);
      cy.off("viewport resize", onViewport);
      cy.off("mouseover", "node", onHover);
      cy.off("mouseout", "node", onLeave);
      if (frame !== null) cancelAnimationFrame(frame);
      if (sharpenTimer !== undefined) clearTimeout(sharpenTimer);
      bitmaps.clear();
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
