import type { Entity } from "schema";

export const MOBILE_ENTRY_MIN_ZOOM = 0.75;

type InboundConnections = Record<string, Array<unknown> | undefined>;

/**
 * Chooses a useful first focal point for a phone-sized graph viewport. The
 * ordering deliberately favors explicit user intent, then campaign intent,
 * then recency, before falling back to the most connected entity.
 */
export function resolveMobileEntryId(
  entities: Entity[],
  selectedId: string | null,
  inboundConnections: InboundConnections,
): string | null {
  if (entities.length === 0) return null;

  if (selectedId && entities.some((entity) => entity.id === selectedId)) {
    return selectedId;
  }

  const important = entities.find((entity) =>
    entity.labels?.some((label) => label.toLowerCase() === "important"),
  );
  if (important) return important.id;

  let mostRecent = entities[0];
  let mostRecentTimestamp = getEntityTimestamp(mostRecent);
  for (let index = 1; index < entities.length; index++) {
    const candidate = entities[index];
    const timestamp = getEntityTimestamp(candidate);
    if (timestamp > mostRecentTimestamp) {
      mostRecent = candidate;
      mostRecentTimestamp = timestamp;
    }
  }
  if (mostRecentTimestamp > 0) return mostRecent.id;

  let hub = entities[0];
  let hubDegree = getDegree(hub, inboundConnections);
  for (let index = 1; index < entities.length; index++) {
    const candidate = entities[index];
    const degree = getDegree(candidate, inboundConnections);
    if (degree > hubDegree) {
      hub = candidate;
      hubDegree = degree;
    }
  }
  return hub.id;
}

function getEntityTimestamp(entity: Entity): number {
  return entity.modifiedAt ?? entity.updatedAt ?? entity.lastUpdated ?? 0;
}

function getDegree(entity: Entity, inboundConnections: InboundConnections) {
  return (
    (entity.connections?.length ?? 0) +
    (inboundConnections[entity.id]?.length ?? 0)
  );
}
