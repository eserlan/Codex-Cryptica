import type { ElementDefinition } from "cytoscape";
import type { Entity, ThemeTokens } from "schema";
import { imageFocusBackgroundPosition } from "schema";
import type { ConnectionNeighbor } from "./entity-connections";

/**
 * Cytoscape elements + style for the Connections tab (issue #2350): the
 * current entity centred, its direct connections in a ring — cytoscape's
 * `concentric` layout does exactly that shape natively, so this stays a data
 * mapping instead of the hand-rolled radial trig an earlier pass wrote.
 *
 * Relationship text does not render on the canvas. Cytoscape's edge labels
 * are the world graph's `text-max-width` + ellipsis, which is the exact
 * "Often found at the cor…" collision this tab was built to avoid — a
 * concentric ring compounds it further, since neighbours are no longer kept
 * off the centre's own band. Node titles alone are enough context on the
 * canvas; the Status tab already lists the full relationships as real,
 * focusable rows (cytoscape paints a `<canvas>`, so this drawing itself has
 * no DOM to make operable — see the `sr-only` note in the component).
 */

const hasPast = (entity: { labels?: string[] }) =>
  entity.labels?.some((label) => label.toLowerCase() === "past") ?? false;

export function buildConnectionsElements(
  entity: Entity,
  neighbors: ConnectionNeighbor[],
): ElementDefinition[] {
  const nodes: ElementDefinition[] = [
    {
      group: "nodes",
      data: {
        id: entity.id,
        label: entity.title || entity.id,
        type: entity.type,
        image: entity.image,
        thumbnail: entity.thumbnail,
        imageFocus: entity.imageFocus,
        isPast: hasPast(entity),
        isCentre: true,
      },
    },
    ...neighbors.map((neighbor): ElementDefinition => ({
      group: "nodes",
      data: {
        id: neighbor.id,
        label: neighbor.title,
        type: neighbor.type,
        image: neighbor.image,
        thumbnail: neighbor.thumbnail,
        imageFocus: neighbor.imageFocus,
        isPast: neighbor.hasPastLabel,
        isCentre: false,
      },
    })),
  ];

  const edges: ElementDefinition[] = neighbors.map((neighbor) => ({
    group: "edges",
    data: {
      id: `${entity.id}->${neighbor.id}`,
      source: entity.id,
      target: neighbor.id,
      // Direction the arrow should point: outbound relations read
      // centre-to-neighbour; a purely-inbound neighbour reverses it. Mixed
      // (both directions present) keeps the default centre-to-neighbour draw
      // and relies on the text list for the fuller picture.
      reversed: neighbor.relations.every((r) => r.direction === "inbound"),
    },
  }));

  return [...nodes, ...edges];
}

/**
 * A resolved portrait lives as data cytoscape attached imperatively to a
 * live node (`GraphImageManager.sync` sets it after an always-async round
 * trip, even on a cache hit) — never on the plain element objects
 * `buildConnectionsElements` returns. Two different things throw that
 * imperative data away:
 *
 *  - the elements-sync effect replaces the whole element set on every
 *    entity/theme change (simplest correct approach for a graph this small)
 *  - `EntityDetailPanel` wraps its tab body in `{#key activeEntity.id}`, so
 *    selecting a different entity destroys this component outright — a
 *    brand new cytoscape instance starts with zero resolved images, no
 *    matter what the last one knew
 *
 * `resolvedImageUrlCache` is a plain module-level map (path → blob URL,
 * *not* scoped to any one component instance or cytoscape core) that
 * survives both, so a portrait already fetched once this session can be
 * repainted immediately instead of flashing blank while it silently
 * re-resolves. It is intentionally never invalidated here: nothing today
 * releases the vault's own reference-counted URL, so nothing revokes it
 * either — see the `resolveImageUrl` wiring in the component. `sync()`
 * still runs on every rebuild regardless, so a path this cache does not yet
 * know about, or a genuinely new image, resolves the normal way.
 */
export const resolvedImageUrlCache = new Map<string, string>();

export function applyKnownImageUrls(
  elements: ElementDefinition[],
): ElementDefinition[] {
  if (resolvedImageUrlCache.size === 0) return elements;

  return elements.map((el) => {
    if (el.group !== "nodes") return el;
    const path = (el.data.thumbnail ?? el.data.image) as string | undefined;
    const url = path ? resolvedImageUrlCache.get(path) : undefined;
    return url ? { ...el, data: { ...el.data, resolvedImage: url } } : el;
  });
}

export interface ConnectionsStyleOptions {
  tokens: Pick<ThemeTokens, "text" | "border" | "primary">;
  getCategoryColor: (type: string) => string | undefined;
  getCategoryIcon?: (type: string) => string | undefined;
}

export const FALLBACK_COLOR = "#94a3b8";

/**
 * Minimal, self-contained style — not `getGraphStyles` from graph-engine,
 * which is tuned for the filterable, timeline-aware, chat-indicator-carrying
 * world graph. Category colors come from the same `categories` store every
 * other entity surface (list rows, table rows) reads, so a type's color is
 * identical here and everywhere else.
 */
// Cytoscape's own style typings are stricter than its actual accepted values
// (e.g. `background-image-crossorigin: "null"`, the documented way to disable
// CORS, is not in its own type union) — `getGraphStyle` in this same package
// works around the same gap by typing its return as `any[]`; this does the same.
export function buildConnectionsStyle(options: ConnectionsStyleOptions): any[] {
  const { tokens, getCategoryColor } = options;
  const colorForNode = (ele: { data: (key: string) => unknown }) =>
    getCategoryColor(String(ele.data("type"))) ?? FALLBACK_COLOR;
  // Edges have no `type` of their own — an edge is colored after the
  // neighbour it connects to, which cytoscape topology always keeps as the
  // edge's `target` (the `reversed` flag only flips which arrowhead draws,
  // set in buildConnectionsElements — it never swaps source/target).
  const colorForEdge = (ele: {
    target: () => { data: (key: string) => unknown };
  }) => getCategoryColor(String(ele.target().data("type"))) ?? FALLBACK_COLOR;

  return [
    {
      selector: "node",
      style: {
        "background-color": colorForNode,
        "background-opacity": 0.22,
        "border-width": 2,
        "border-color": colorForNode,
        width: 44,
        height: 44,
        label: (ele: any) => {
          const label = String(ele.data("label") ?? "");
          return ele.data("isPast") ? `${label}*` : label;
        },
        color: tokens.text,
        "font-size": 11,
        "font-weight": 600,
        "text-valign": "bottom",
        "text-margin-y": 6,
        "text-max-width": 90,
        "text-wrap": "wrap",
        "background-image": "data(resolvedImage)",
        "background-image-crossorigin": "null",
        "background-fit": "cover",
        "background-position-x": (ele: any) =>
          imageFocusBackgroundPosition(ele.data("imageFocus")).x,
        "background-position-y": (ele: any) =>
          imageFocusBackgroundPosition(ele.data("imageFocus")).y,
      },
    },
    {
      selector: "node[isCentre]",
      style: {
        width: 64,
        height: 64,
        "border-width": 3,
        "background-opacity": 0.3,
        "font-size": 13,
        "font-weight": 700,
        "text-margin-y": 8,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.5,
        "line-color": colorForEdge,
        "line-opacity": 0.45,
        "target-arrow-color": colorForEdge,
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.7,
        "curve-style": "straight",
        // No `label` here — see the module doc for why.
      },
    },
    {
      selector: "edge[reversed]",
      style: {
        "target-arrow-shape": "none",
        "source-arrow-shape": "triangle",
        "source-arrow-color": colorForEdge,
      },
    },
  ];
}
