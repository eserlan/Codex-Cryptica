import type { Core, NodeSingular } from "cytoscape";
import { detectCommunities, linkedPieces } from "../communities";

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
  /** Shown only because it was asked for (the hovered node's small group). */
  extra?: boolean;
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

/**
 * The biggest linked piece of `members`, with its links. Leaving out an
 * outlier can cut a community in two, and pieces further apart than the halos
 * reach would read as separate groups; drawing only the biggest piece keeps
 * each background one shape. Without any edges, members are kept as given.
 */
function largestLinkedPiece(
  members: HullNode[],
  edges: ReadonlyArray<readonly [string, string]>,
): { members: HullNode[]; links: Array<[HullNode, HullNode]> } {
  const byId = new Map(members.map((n) => [n.id, n]));
  const near = new Map<string, string[]>(members.map((n) => [n.id, []]));
  const links: Array<[HullNode, HullNode]> = [];
  for (const [a, b] of edges) {
    const na = byId.get(a);
    const nb = byId.get(b);
    if (!na || !nb) continue;
    links.push([na, nb]);
    near.get(a)!.push(b);
    near.get(b)!.push(a);
  }
  if (edges.length === 0) return { members, links };

  const ids = members.map((n) => n.id).sort();
  const best = linkedPieces(ids, (id) => near.get(id) ?? []).reduce((a, b) =>
    b.length > a.length ? b : a,
  );
  const keep = new Set(best);
  return {
    members: members.filter((n) => keep.has(n.id)),
    links: links.filter(([a, b]) => keep.has(a.id) && keep.has(b.id)),
  };
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
  return [...shown, ...extra].map(([community, members], i) => {
    const { members: kept, links } = largestLinkedPiece(
      withoutOutliers(members),
      edges,
    );
    const group: CommunityGroup = {
      community,
      size: members.length,
      members: kept,
      links,
    };
    if (i >= shown.length) group.extra = true;
    return group;
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
/**
 * Pixels all cached bitmaps may use together (about 64 MiB). Without it, 24
 * groups at the side limit could hold around 384 MiB; past the budget every
 * bitmap is rendered at a proportionally lower scale.
 */
const BITMAP_PIXEL_BUDGET = 16_000_000;
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

/** Identity of a group's shape and colour: members, positions, sizes, links and rank. */
function groupKey(group: CommunityGroup, rank: number): string {
  let key = `${rank}|`;
  for (const n of group.members)
    key += `${n.id}:${Math.round(n.x)},${Math.round(n.y)},${Math.round(n.r)};`;
  key += "|";
  for (const [a, b] of group.links) key += `${a.id}-${b.id};`;
  return key;
}

type Bounds = { x1: number; y1: number; w: number; h: number };

/** The area a group's background covers, in graph units. */
function groupBounds(group: CommunityGroup): Bounds {
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
  return { x1, y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
}

/**
 * The scale all bitmaps are rendered at: the view's scale, lowered so their
 * combined pixels stay within `BITMAP_PIXEL_BUDGET`.
 */
export function budgetedScale(
  areas: readonly Bounds[],
  wanted: number,
  budget = BITMAP_PIXEL_BUDGET,
): number {
  const units = areas.reduce((sum, b) => sum + b.w * b.h, 0);
  if (units === 0) return wanted;
  return Math.min(wanted, Math.sqrt(budget / units));
}

/** Draws a group's merged halo shape, opaque, into its own small canvas. */
function renderGroupBitmap(
  canvas: HTMLCanvasElement,
  group: CommunityGroup,
  rank: number,
  { x1, y1, w, h }: Bounds,
  scaleWithinBudget: number,
  wantedScale: number,
): Omit<GroupBitmap, "key"> {
  // The side cap always wins, however small that makes the scale.
  const limit = Math.min(MAX_BITMAP_SIDE / w, MAX_BITMAP_SIDE / h);
  const scale = Math.max(1e-6, Math.min(scaleWithinBudget, limit));
  canvas.width = Math.max(1, Math.min(MAX_BITMAP_SIDE, Math.ceil(w * scale)));
  canvas.height = Math.max(1, Math.min(MAX_BITMAP_SIDE, Math.ceil(h * scale)));
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
    sharpenDelayMs = SHARPEN_DELAY_MS,
  }: {
    enabled?: boolean;
    createLayer?: () => HTMLCanvasElement;
    sharpenDelayMs?: number;
  } = {},
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

  // Nodes waiting for a layout are hidden with opacity only, so `visible()`
  // still counts them; bands between their placeholder positions would show.
  const visibleNodes = (): NodeSingular[] =>
    cy
      .nodes()
      .filter(
        (n) =>
          n.visible() &&
          !n.data("isPendingLayout") &&
          !n.hasClass("pending-layout"),
      )
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

  const communityOf = (id: string) => {
    if (!communities) recomputeGroups();
    return communities!.get(id);
  };
  /** A group shown only for the current hover, which must go when it ends. */
  const hasHoverOnlyGroup = () => groups?.some((g) => g.extra) ?? false;

  const highlight = (id: string | null) => {
    const community = id === null ? undefined : communityOf(id);
    if ([...highlighted][0] === community) return;
    // Regroup when the new group is not shown yet (too small) or when a
    // group shown only for the previous hover has to go again.
    const regroup =
      hasHoverOnlyGroup() || (community !== undefined && !keys.has(community));
    highlighted = new Set(community === undefined ? [] : [community]);
    if (regroup) groups = null;
    schedule();
  };
  const onHover = (evt: { target: NodeSingular }) => highlight(evt.target.id());
  const onLeave = () => highlight(null);

  const bitmapFor = (
    group: CommunityGroup,
    rank: number,
    budgeted: number,
    wanted: number,
  ) => {
    const key = keys.get(group.community)!;
    const current = bitmaps.get(group.community);
    if (current && current.key === key) return current;
    const rendered = renderGroupBitmap(
      current?.canvas ?? createLayer(),
      group,
      rank,
      groupBounds(group),
      budgeted,
      wanted,
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
    const wanted = dpr * zoom;
    const budgeted = budgetedScale(groups!.map(groupBounds), wanted);
    for (const { group, rank, alpha } of paintOrder(groups!, highlighted)) {
      const bitmap = bitmapFor(group, rank, budgeted, wanted);
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
    sharpenTimer = setTimeout(sharpen, sharpenDelayMs);
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
  cy.on("position style data", onMove);
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
      cy.off("position style data", onMove);
      cy.off("viewport resize", onViewport);
      cy.off("mouseover", "node", onHover);
      cy.off("mouseout", "node", onLeave);
      if (frame !== null) cancelAnimationFrame(frame);
      if (sharpenTimer !== undefined) clearTimeout(sharpenTimer);
      bitmaps.clear();
      // `draw` leaves the pan/zoom transform set; clear in pixels.
      ctx?.setTransform(1, 0, 0, 1, 0, 0);
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
