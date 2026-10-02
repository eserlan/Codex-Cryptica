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

/**
 * Paints a soft background behind each large community on `canvas`, which
 * must sit under Cytoscape's own layer and cover the same area. Each member
 * gets a padded halo and a community's halos merge into one shape, so the
 * background follows its members rather than the space between them.
 * Communities are recomputed when elements are added or removed, shapes when
 * nodes move or change visibility, and the drawing follows pan and zoom.
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
  /** Community of the hovered node: shown strongly, the rest faded. */
  let highlighted = new Set<string>();
  let frame: number | null = null;
  const ctx = canvas.getContext("2d");
  // Each community is painted opaque here, then copied over translucent, so
  // overlapping halos merge into one shape instead of stacking darker.
  const layer = createLayer();
  const layerCtx = layer.getContext("2d");

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
  };

  const highlight = (id: string | null) => {
    if (id !== null && !communities) recomputeGroups();
    const community = id === null ? undefined : communities!.get(id);
    const next = new Set(community === undefined ? [] : [community]);
    if ([...next].join() === [...highlighted].join()) return;
    highlighted = next;
    groups = null;
    schedule();
  };
  const onHover = (evt: { target: NodeSingular }) => highlight(evt.target.id());
  const onLeave = () => highlight(null);

  /** Matches both canvases to the element's size; returns that size in device pixels. */
  const fitCanvases = () => {
    const dpr = globalThis.devicePixelRatio || 1;
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    for (const c of [canvas, layer]) {
      if (c.width !== width) c.width = width;
      if (c.height !== height) c.height = height;
    }
    return { dpr, width, height };
  };

  const paintGroup = (
    target: CanvasRenderingContext2D,
    off: CanvasRenderingContext2D,
    group: CommunityGroup,
    rank: number,
    { dpr, width, height }: { dpr: number; width: number; height: number },
    alpha: number,
  ) => {
    const zoom = cy.zoom();
    const pan = cy.pan();
    off.setTransform(1, 0, 0, 1, 0, 0);
    off.clearRect(0, 0, width, height);
    off.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * pan.x, dpr * pan.y);
    const colour = `hsl(${hueFor(rank)}, 55%, 58%)`;
    // Bands along the community's own links join its members' halos into one
    // shape; halos alone read as separate bubbles once members are far apart.
    off.strokeStyle = colour;
    off.lineCap = "round";
    off.lineWidth = HALO_PADDING * 2;
    off.beginPath();
    for (const [a, b] of group.links) {
      off.moveTo(a.x, a.y);
      off.lineTo(b.x, b.y);
    }
    off.stroke();
    off.fillStyle = colour;
    off.beginPath();
    for (const n of group.members) {
      const r = n.r + HALO_PADDING;
      off.moveTo(n.x + r, n.y);
      off.arc(n.x, n.y, r, 0, Math.PI * 2);
    }
    off.fill();
    target.globalAlpha = alpha;
    target.drawImage(layer, 0, 0);
    target.globalAlpha = 1;
  };

  const draw = () => {
    frame = null;
    if (!ctx || !layerCtx || cy.destroyed()) return;
    const size = fitCanvases();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    if (!on) return;
    if (!groups) recomputeGroups();
    for (const { group, rank, alpha } of paintOrder(groups!, highlighted)) {
      paintGroup(ctx, layerCtx, group, rank, size, alpha);
    }
  };

  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(draw);
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
  cy.on("viewport resize", schedule);
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
      cy.off("viewport resize", schedule);
      cy.off("mouseover", "node", onHover);
      cy.off("mouseout", "node", onLeave);
      if (frame !== null) cancelAnimationFrame(frame);
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
