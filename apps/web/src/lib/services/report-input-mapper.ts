import type { Entity } from "schema";
import type {
  ReportEntityInput,
  ReportInput,
  ReportRelationshipInput,
} from "entity-report-engine";

const HEADING = /^#{1,6}\s/m;

function firstLine(text: string): string | undefined {
  const paragraph = text.split(/\n\s*\n/)[0]?.trim();
  if (!paragraph) return undefined;
  return paragraph.replace(/\s*\n\s*/g, " ");
}

export function toReportEntityInput(entity: Entity): ReportEntityInput {
  const content = entity.content ?? "";
  const headingAt = content.search(HEADING);
  const description = (
    headingAt === -1 ? content : content.slice(0, headingAt)
  ).trim();
  const notes = headingAt === -1 ? "" : content.slice(headingAt).trim();
  const summary = firstLine(description);

  return {
    id: entity.id,
    title: entity.title,
    type: entity.type,
    summary,
    description: description || undefined,
    notes: notes || undefined,
    secrets: entity.lore?.trim() || undefined,
    portraitUrl: entity.image || undefined,
    silhouette: entity.silhouette || undefined,
    labels: entity.labels ?? [],
  };
}

export interface RelationshipPair {
  sourceId: string;
  targetId: string;
  label?: string;
}

/** Keeps only pairs where both endpoints are in `entityIds` (FR-006/FR-006a). */
export function buildRelationshipInputs(
  entityIds: Iterable<string>,
  pairs: Iterable<RelationshipPair>,
): ReportRelationshipInput[] {
  const ids = new Set(entityIds);
  const seen = new Set<string>();
  const result: ReportRelationshipInput[] = [];
  for (const pair of pairs) {
    if (pair.sourceId === pair.targetId) continue;
    if (!ids.has(pair.sourceId) || !ids.has(pair.targetId)) continue;
    const label = pair.label?.trim() || "related";
    const key = `${pair.sourceId}\u0000${pair.targetId}\u0000${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ sourceId: pair.sourceId, targetId: pair.targetId, label });
  }
  return result;
}

/** Graph/Table path: relationships from each entity's own `connections`. */
export function connectionPairs(entities: Entity[]): RelationshipPair[] {
  const pairs: RelationshipPair[] = [];
  for (const entity of entities) {
    for (const conn of entity.connections ?? []) {
      pairs.push({
        sourceId: entity.id,
        targetId: conn.target,
        label: conn.label || conn.type,
      });
    }
  }
  return pairs;
}

/**
 * FR-019: an in-scope relationship between a faction and a non-faction entity
 * (either direction, any label) makes that entity a member. Faction-to-faction
 * is not membership.
 */
export function buildFactionMembership(
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

export function assembleReportInput(
  entities: Entity[],
  pairs: RelationshipPair[],
): ReportInput {
  const mapped = entities.map(toReportEntityInput);
  const relationships = buildRelationshipInputs(
    mapped.map((e) => e.id),
    pairs,
  );
  return {
    entities: mapped,
    relationships,
    factionMembership: buildFactionMembership(mapped, relationships),
  };
}
