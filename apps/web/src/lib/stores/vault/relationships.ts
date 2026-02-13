import type { Connection } from "schema";
import type { LocalEntity } from "./types";

export type InboundMap = Record<
  string,
  { sourceId: string; connection: Connection }[]
>;

/**
 * Rebuilds the entire inbound connection map from a flat record of entities.
 * Highly efficient in Svelte 5 as a $derived.by calculation.
 */
export function rebuildInboundMap(
  entities: Record<string, LocalEntity>,
): InboundMap {
  const newInboundMap: InboundMap = {};

  // We use a simple loop over entities and their connections.
  // For large vaults (1000+ nodes), this is still extremely fast (< 5ms).
  for (const id in entities) {
    const entity = entities[id];
    for (const conn of entity.connections) {
      const targetId = conn.target;
      if (!targetId) continue;

      if (!newInboundMap[targetId]) {
        newInboundMap[targetId] = [];
      }

      newInboundMap[targetId].push({
        sourceId: entity.id,
        connection: conn,
      });
    }
  }

  return newInboundMap;
}
