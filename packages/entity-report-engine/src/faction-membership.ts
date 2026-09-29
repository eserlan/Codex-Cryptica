import type { ReportEntityInput, ReportRelationshipInput } from "./types";

/**
 * An in-scope relationship between a faction and a non-faction entity (either
 * direction, any label) makes that entity a member. Faction-to-faction is not
 * membership.
 */
export function deriveFactionMembership(
  entities: ReportEntityInput[],
  relationships: ReportRelationshipInput[],
): Record<string, string[]> {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const membership: Record<string, Set<string>> = {};
  for (const e of entities) {
    if (e.type === "faction") membership[e.id] = new Set();
  }
  for (const rel of relationships) {
    const source = byId.get(rel.sourceId);
    const target = byId.get(rel.targetId);
    if (!source || !target) continue;
    const sourceIsFaction = source.type === "faction";
    const targetIsFaction = target.type === "faction";
    if (sourceIsFaction === targetIsFaction) continue;
    const faction = sourceIsFaction ? source : target;
    const member = sourceIsFaction ? target : source;
    membership[faction.id].add(member.id);
  }
  return Object.fromEntries(
    Object.entries(membership).map(([id, members]) => [id, [...members]]),
  );
}
