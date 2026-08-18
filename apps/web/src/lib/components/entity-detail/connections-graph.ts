import type { Connection, Entity } from "schema";

/**
 * Data + layout helpers for the Connections tab (issue #2350): a focused
 * 1-hop graph of a single entity and the entities it is directly connected to.
 *
 * Deliberately NOT a miniature world graph — no traversal past the first hop,
 * no physics. Positions are percentages of the container box so the view is
 * responsive by construction (the component places nodes with `left`/`top`).
 */

export type ConnectionDirection = "outbound" | "inbound";

export type ConnectionRelation = {
  /** Human-readable relationship label ("spouse", "located in", ...). */
  label: string;
  direction: ConnectionDirection;
};

export type ConnectionNeighbor = {
  id: string;
  title: string;
  type: string;
  hasPastLabel: boolean;
  /** Every relationship between the centre entity and this neighbour. */
  relations: ConnectionRelation[];
};

export type ConnectionGraphContext = {
  getEntity: (id: string) => Entity | undefined;
  /** Connections pointing *at* the centre entity, keyed by target id. */
  inbound: Record<string, { sourceId: string; connection: Connection }[]>;
  /** Used to pick up hierarchy children, which the Status tab also lists. */
  allEntities: Entity[];
  /** Guest-mode visibility gate; defaults to "everything is visible". */
  isVisible?: (entity: Entity) => boolean;
};

const hasPast = (entity: Entity) =>
  entity.labels?.some((label) => label.toLowerCase() === "past") ?? false;

/**
 * Falls back to the connection *type* when no custom label was written, so an
 * edge is never unlabelled: "located_in" reads as "located in".
 */
export function connectionLabel(connection: {
  label?: string;
  type?: string;
}): string {
  const custom = connection.label?.trim();
  if (custom) return custom;
  const type = connection.type?.trim();
  if (!type) return "related to";
  return type.replace(/[_-]+/g, " ").toLowerCase();
}

/**
 * Collects the entity's direct (1-hop) neighbours: outgoing connections,
 * incoming connections and hierarchy children — the same set the Status tab
 * lists, so the two views never disagree. One node per neighbour entity;
 * multiple relationships to the same entity collapse into one node.
 */
export function buildConnectionNeighbors(
  entity: Entity,
  context: ConnectionGraphContext,
): ConnectionNeighbor[] {
  const isVisible = context.isVisible ?? (() => true);
  const byId = new Map<string, ConnectionNeighbor>();

  const add = (
    neighborId: string,
    relation: ConnectionRelation,
  ): ConnectionNeighbor | undefined => {
    if (!neighborId || neighborId === entity.id) return undefined;
    const existing = byId.get(neighborId);
    if (existing) {
      const duplicate = existing.relations.some(
        (r) => r.label === relation.label && r.direction === relation.direction,
      );
      if (!duplicate) existing.relations.push(relation);
      return existing;
    }

    const target = context.getEntity(neighborId);
    if (!target || !isVisible(target)) return undefined;

    const neighbor: ConnectionNeighbor = {
      id: target.id,
      title: target.title || target.id,
      type: target.type,
      hasPastLabel: hasPast(target),
      relations: [relation],
    };
    byId.set(neighborId, neighbor);
    return neighbor;
  };

  for (const connection of entity.connections ?? []) {
    add(connection.target, {
      label: connectionLabel(connection),
      direction: "outbound",
    });
  }

  for (const item of context.inbound[entity.id] ?? []) {
    add(item.sourceId, {
      label: connectionLabel(item.connection),
      direction: "inbound",
    });
  }

  const entityId = entity.id.toLowerCase();
  for (const candidate of context.allEntities) {
    if (candidate.parent?.toLowerCase() !== entityId) continue;
    // A child that already has an explicit connection keeps that relationship
    // rather than gaining a second, weaker "Child" edge.
    if (byId.has(candidate.id)) continue;
    add(candidate.id, { label: "child", direction: "inbound" });
  }

  return [...byId.values()];
}

export type ConnectionNodePosition = {
  /** Percentage of the container width / height (0-100). */
  x: number;
  y: number;
  ring: number;
};

/** Rings past this get crowded; the rest are summarised as "+N more". */
export const MAX_CONNECTION_NODES = 20;
const SINGLE_RING_MAX = 9;
const INNER_RING_MAX = 6;

const RING_RADII = [
  { rx: 32, ry: 34 }, // single ring
  { rx: 22, ry: 24 }, // inner ring (two-ring layout)
  { rx: 40, ry: 42 }, // outer ring (two-ring layout)
];

function ringPositions(
  count: number,
  radius: { rx: number; ry: number },
  ring: number,
  angleOffset: number,
): ConnectionNodePosition[] {
  const positions: ConnectionNodePosition[] = [];
  const step = (Math.PI * 2) / Math.max(count, 1);
  for (let i = 0; i < count; i++) {
    // -90° puts the first neighbour straight above the centre, matching the
    // sketch in issue #2350.
    const angle = -Math.PI / 2 + angleOffset + step * i;
    positions.push({
      x: round(50 + Math.cos(angle) * radius.rx),
      y: round(50 + Math.sin(angle) * radius.ry),
      ring,
    });
  }
  return positions;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Radial layout around a fixed centre. Up to nine neighbours sit on one ring;
 * beyond that they split across two interleaved rings so labels stay legible.
 */
export function layoutConnectionGraph(count: number): ConnectionNodePosition[] {
  const shown = Math.min(Math.max(count, 0), MAX_CONNECTION_NODES);
  if (shown === 0) return [];
  if (shown <= SINGLE_RING_MAX) {
    return ringPositions(shown, RING_RADII[0], 0, 0);
  }

  const inner = Math.min(INNER_RING_MAX, Math.ceil(shown * 0.35));
  const outer = shown - inner;
  return [
    ...ringPositions(inner, RING_RADII[1], 1, 0),
    // Half-step offset so outer nodes fall between the inner ones instead of
    // hiding behind them.
    ...ringPositions(outer, RING_RADII[2], 2, Math.PI / Math.max(outer, 1)),
  ];
}

/** Point along the centre→node line where the relationship label is drawn. */
export function edgeLabelPosition(
  node: ConnectionNodePosition,
  fraction = 0.55,
): { x: number; y: number } {
  return {
    x: round(50 + (node.x - 50) * fraction),
    y: round(50 + (node.y - 50) * fraction),
  };
}
