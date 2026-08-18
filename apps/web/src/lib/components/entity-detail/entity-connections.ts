import type { Connection, Entity } from "schema";
import { isEntityVisible } from "schema";

/**
 * One source of truth for "what is this entity directly connected to?".
 *
 * Both the Status tab's editable list and the Connections tab's 1-hop graph
 * (issue #2350) read from here, so a rule added to one surface can't silently
 * skip the other. The set is: outgoing connections, incoming connections and
 * hierarchy children, all gated by guest visibility.
 */

export type ConnectionDirection = "outbound" | "inbound";

export type ConnectionRelation = {
  /** Connection type ("friendly", "located_in", ...), or "child" for hierarchy. */
  type: string;
  /** Custom label, when the connection carries one. */
  label?: string;
  /** What to render on a graph edge: the custom label, else a readable type. */
  displayLabel: string;
  direction: ConnectionDirection;
  /** True for a hierarchy child (`entity.parent`), which is not a stored connection. */
  isChild: boolean;
  strength: number;
};

export type ConnectionNeighbor = {
  id: string;
  title: string;
  type: string;
  image?: string;
  thumbnail?: string;
  hasPastLabel: boolean;
  /** Every relationship between the centre entity and this neighbour. */
  relations: ConnectionRelation[];
};

export type ConnectionContext = {
  getEntity: (id: string) => Entity | undefined;
  /** Connections pointing *at* an entity, keyed by target id. */
  inbound: Record<string, { sourceId: string; connection: Connection }[]>;
  /** Scanned for hierarchy children. */
  allEntities: Entity[];
  /** Guest-mode visibility gate; defaults to "everything is visible". */
  isVisible?: (entity: Entity) => boolean;
};

/** The slice of the vault store these helpers read. */
export type VaultConnectionSource = {
  entities: Record<string, Entity>;
  allEntities?: Entity[];
  inboundConnections: Record<
    string,
    { sourceId: string; connection: Connection }[]
  >;
  isGuest: boolean;
  defaultVisibility: "visible" | "hidden";
};

/**
 * Builds a context from the vault store. Call it inside the component's
 * `$derived` so every property read stays tracked.
 */
export function vaultConnectionContext(
  vault: VaultConnectionSource,
): ConnectionContext {
  const sharedMode = vault.isGuest;
  const defaultVisibility = vault.defaultVisibility;
  return {
    getEntity: (id) => vault.entities[id],
    inbound: vault.inboundConnections,
    allEntities: vault.allEntities ?? [],
    isVisible: (candidate) =>
      !sharedMode ||
      isEntityVisible(candidate, { sharedMode, defaultVisibility }),
  };
}

const hasPast = (entity: Entity) =>
  entity.labels?.some((label) => label.toLowerCase() === "past") ?? false;

/**
 * Falls back to the connection *type* when no custom label was written, so a
 * graph edge is never unlabelled: "located_in" reads as "located in".
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
 * Collects the entity's direct (1-hop) neighbours. One entry per neighbour
 * entity; several relationships to the same entity collapse into one entry.
 */
export function buildConnectionNeighbors(
  entity: Entity,
  context: ConnectionContext,
): ConnectionNeighbor[] {
  const isVisible = context.isVisible ?? (() => true);
  const byId = new Map<string, ConnectionNeighbor>();

  const add = (neighborId: string, relation: ConnectionRelation) => {
    if (!neighborId || neighborId === entity.id) return;
    const existing = byId.get(neighborId);
    if (existing) {
      const duplicate = existing.relations.some(
        (r) =>
          r.type === relation.type &&
          r.label === relation.label &&
          r.direction === relation.direction,
      );
      if (!duplicate) existing.relations.push(relation);
      return;
    }

    const target = context.getEntity(neighborId);
    if (!target || !isVisible(target)) return;

    byId.set(neighborId, {
      id: target.id,
      title: target.title || target.id,
      type: target.type,
      image: target.image,
      thumbnail: target.thumbnail,
      hasPastLabel: hasPast(target),
      relations: [relation],
    });
  };

  const toRelation = (
    connection: Connection,
    direction: ConnectionDirection,
  ): ConnectionRelation => ({
    type: connection.type,
    label: connection.label,
    displayLabel: connectionLabel(connection),
    direction,
    isChild: false,
    strength: connection.strength ?? 1,
  });

  for (const connection of entity.connections ?? []) {
    add(connection.target, toRelation(connection, "outbound"));
  }

  for (const item of context.inbound[entity.id] ?? []) {
    add(item.sourceId, toRelation(item.connection, "inbound"));
  }

  const entityId = entity.id.toLowerCase();
  for (const candidate of context.allEntities) {
    if (candidate.parent?.toLowerCase() !== entityId) continue;
    // A child that already has an explicit connection keeps that relationship
    // rather than gaining a second, weaker "child" edge.
    if (byId.has(candidate.id)) continue;
    add(candidate.id, {
      type: "child",
      displayLabel: "child",
      direction: "inbound",
      isChild: true,
      strength: 1,
    });
  }

  return [...byId.values()];
}

/**
 * One row per relationship, in the shape the Status tab's editable list needs
 * (it is passed straight to `ConnectionEditor`, which reads `target`/`type`/
 * `label`).
 */
export type ConnectionRow = Connection & {
  targetId: string;
  displayTitle: string;
  hasPastLabel: boolean;
  isOutbound: boolean;
  isChild: boolean;
};

export function toConnectionRows(
  neighbors: ConnectionNeighbor[],
): ConnectionRow[] {
  const rows: ConnectionRow[] = [];
  for (const neighbor of neighbors) {
    for (const relation of neighbor.relations) {
      rows.push({
        target: neighbor.id,
        type: relation.type,
        label: relation.label,
        strength: relation.strength,
        targetId: neighbor.id,
        displayTitle: neighbor.title,
        hasPastLabel: neighbor.hasPastLabel,
        isOutbound: relation.direction === "outbound",
        isChild: relation.isChild,
      });
    }
  }
  return rows;
}
