import { GraphTransformer } from "graph-engine";
import type { Entity } from "schema";

// Focus-view detail level. Zoom reveals a bounded fixed-size increment rather
// than doubling the rendered graph, so one gesture cannot synchronously add an
// unbounded set of nodes in a large vault.
export const MIN_FOCUS_DEPTH = 1;
export const MAX_FOCUS_DEPTH = 3;
export const FOCUS_BASE_COUNT = 500;
export const FOCUS_DETAIL_STEP = 150;
/** Avoid a dense focus neighbourhood overwhelming the renderer. */
export const FOCUS_EDGE_CAP = 2_000;

export type InboundConnections = Record<string, { sourceId: string }[]>;

/** The entities a viewer may see, plus the lookups the focus cull needs. */
export interface VisibleEntities {
  entities: Entity[];
  ids: Set<string>;
  /**
   * Lookups for the focus cull come from the graph slice, never the reactive
   * `vault.entities` record: reading `vault.entities[id]` subscribes a
   * derivation to every rendered record, so a content-only load (which
   * replaces the record) would rebuild and re-sync the whole focus view.
   */
  byId: Map<string, Entity>;
}

/**
 * What the focus cull reads from the store. `selectedId` and `inbound` are
 * getters so a derivation only subscribes to them when the cull needs them.
 */
export interface FocusContext {
  rootId: string | null;
  depth: number;
  selectedId: () => string | null;
  inbound: () => InboundConnections;
}

/** One pass builds the visible list and the id set, so nothing iterates twice. */
export function collectVisibleEntities(
  allEntities: Entity[],
  isVisible: (entity: Entity) => boolean,
): VisibleEntities {
  const entities: Entity[] = [];
  const ids = new Set<string>();
  const byId = new Map<string, Entity>();
  for (let i = 0; i < allEntities.length; i++) {
    const entity = allEntities[i];
    if (isVisible(entity)) {
      entities.push(entity);
      ids.add(entity.id);
      byId.set(entity.id, entity);
    }
  }
  return { entities, ids, byId };
}

/** Links that stay inside the visible set, counting both directions. */
function connectionDegree(
  entity: Entity,
  inbound: InboundConnections,
  validIds: Set<string>,
): number {
  let degree = inbound[entity.id]?.length ?? 0;
  const connections = entity.connections;
  if (connections) {
    for (let j = 0; j < connections.length; j++) {
      if (validIds.has(connections[j].target)) degree++;
    }
  }
  return degree;
}

/**
 * Picks the focus node for culling. Once established, the root stays stable
 * while selection changes, preventing visible-node selection from rebuilding
 * the rendered neighbourhood.
 */
export function resolveFocalId(
  visible: Pick<VisibleEntities, "entities" | "ids">,
  focus: Pick<FocusContext, "rootId" | "selectedId" | "inbound">,
): string | null {
  const { entities, ids } = visible;
  if (focus.rootId && ids.has(focus.rootId)) return focus.rootId;

  const selected = focus.selectedId();
  if (selected && ids.has(selected)) return selected;

  const inbound = focus.inbound();
  let bestId: string | null = null;
  let bestDegree = -1;
  for (let i = 0; i < entities.length; i++) {
    const degree = connectionDegree(entities[i], inbound, ids);
    if (degree > bestDegree) {
      bestDegree = degree;
      bestId = entities[i].id;
    }
  }
  return bestId;
}

export function getFocusTargetCount(
  depth: number,
  visibleCount: number,
): number {
  const finiteDepth = Number.isFinite(depth) ? depth : MIN_FOCUS_DEPTH;
  const level = Math.min(
    MAX_FOCUS_DEPTH,
    Math.max(MIN_FOCUS_DEPTH, Math.trunc(finiteDepth)),
  );
  return Math.min(
    visibleCount,
    FOCUS_BASE_COUNT + FOCUS_DETAIL_STEP * (level - MIN_FOCUS_DEPTH),
  );
}

/**
 * If the connected focus neighbourhood is too sparse, fill the remaining slots
 * with visible high-degree nodes so large vaults do not open on a nearly empty
 * canvas.
 */
function fillFocusRenderIds(
  result: Set<string>,
  visible: VisibleEntities,
  inbound: InboundConnections,
  targetCount: number,
) {
  if (result.size >= targetCount) return;

  const candidates: { id: string; degree: number; index: number }[] = [];
  for (let i = 0; i < visible.entities.length; i++) {
    const entity = visible.entities[i];
    if (result.has(entity.id)) continue;
    candidates.push({
      id: entity.id,
      degree: connectionDegree(entity, inbound, visible.ids),
      index: i,
    });
  }

  candidates.sort((a, b) => b.degree - a.degree || a.index - b.index);
  for (let i = 0; i < candidates.length && result.size < targetCount; i++) {
    result.add(candidates[i].id);
  }
}

/** Visible entities linked to `id`, outgoing links first and then incoming. */
function* visibleNeighbours(
  id: string,
  visible: VisibleEntities,
  inbound: InboundConnections,
): Generator<string> {
  const connections = visible.byId.get(id)?.connections ?? [];
  for (const connection of connections) {
    if (visible.ids.has(connection.target)) yield connection.target;
  }
  for (const link of inbound[id] ?? []) {
    if (visible.ids.has(link.sourceId)) yield link.sourceId;
  }
}

/**
 * Breadth-first collection around `focalId`, capped by the detail level's
 * target count, then padded with high-degree nodes when the neighbourhood
 * runs out.
 */
export function computeFocusRenderIds(
  focalId: string,
  depth: number,
  visible: VisibleEntities,
  inbound: InboundConnections,
): Set<string> {
  const targetCount = getFocusTargetCount(depth, visible.ids.size);
  const result = new Set<string>([focalId]);
  let frontier: string[] = [focalId];

  // BFS outward until either the target render count is reached or the
  // reachable neighborhood is exhausted. `depth` is a detail *level*
  // (see getFocusTargetCount), not a hop count, so it must not cap the
  // traversal here — doing so stopped sparse neighborhoods short and
  // jumped straight to high-degree filler nodes instead of continuing
  // outward to the closest reachable ones.
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbour of visibleNeighbours(id, visible, inbound)) {
        if (result.has(neighbour)) continue;
        result.add(neighbour);
        if (result.size >= targetCount) return result;
        next.push(neighbour);
      }
    }
    frontier = next;
  }
  fillFocusRenderIds(result, visible, inbound, targetCount);
  return result;
}

/** The culled elements around the focal node, or `null` when nothing is cut. */
function cullToFocus(visible: VisibleEntities, focus: FocusContext) {
  const focal = resolveFocalId(visible, focus);
  if (!focal) return null;

  const renderIds = computeFocusRenderIds(
    focal,
    focus.depth,
    visible,
    focus.inbound(),
  );
  if (renderIds.size === visible.ids.size) return null;

  const renderEntities: Entity[] = [];
  for (const id of renderIds) {
    const entity = visible.byId.get(id);
    if (entity) renderEntities.push(entity);
  }
  return {
    elements: GraphTransformer.entitiesToElements(
      renderEntities,
      renderIds,
      FOCUS_EDGE_CAP,
    ),
    renderedNodeCount: renderEntities.length,
  };
}

/**
 * Turns the visible entities into graph elements. With a focus context the
 * graph is culled to a target-sized set around the focal node; without one
 * everything renders. Also reports how many nodes were rendered.
 */
export function buildGraphElements(
  visible: VisibleEntities,
  focus: FocusContext | null,
) {
  const culled =
    focus && visible.entities.length > 0 ? cullToFocus(visible, focus) : null;
  if (culled) return culled;

  return {
    elements: GraphTransformer.entitiesToElements(
      visible.entities,
      visible.ids,
      focus ? FOCUS_EDGE_CAP : undefined,
    ),
    renderedNodeCount: visible.entities.length,
  };
}
