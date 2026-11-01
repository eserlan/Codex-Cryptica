import type { Entity } from "schema";
import type { ConnectionSummary } from "#lib/components/table/entityTableSort.js";
import { evaluateEntityMissingFields } from "#lib/components/explorer/entityListFiltering.js";

export function computeConnectionCounts(
  entities: Entity[],
  inboundConnections: Record<string, readonly unknown[]> = {},
) {
  const result: Record<string, ConnectionSummary> = {};
  for (const entity of entities) {
    const inbound = inboundConnections[entity.id]?.length ?? 0;
    let outbound = 0;
    for (const connection of entity.connections ?? []) {
      if (connection.target) outbound++;
    }
    result[entity.id] = { inbound, outbound, total: inbound + outbound };
  }
  return result;
}

export function countIncompleteEntities(
  entities: Entity[],
  connectionCounts: Record<string, ConnectionSummary>,
) {
  let count = 0;
  for (const entity of entities) {
    if (
      evaluateEntityMissingFields(entity, connectionCounts[entity.id])
        .isIncomplete
    )
      count++;
  }
  return count;
}
