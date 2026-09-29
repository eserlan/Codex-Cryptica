import type { Entity } from "schema";
import {
  deriveFactionMembership,
  type RelationshipSource,
  type ReportEntityInput,
  type ReportInput,
  type ReportRelationshipInput,
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
  const summary =
    firstLine(description) ??
    firstLine(notes.replace(/^#{1,6}\s.*$/gm, "").trim());

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
    parent: entity.parent || undefined,
    labels: entity.labels ?? [],
  };
}

export interface RelationshipPair {
  sourceId: string;
  targetId: string;
  label?: string;
  source?: RelationshipSource;
}

/** Keeps only pairs where both endpoints are in `entityIds` (FR-006/FR-006a). */
export function buildRelationshipInputs(
  entityIds: Iterable<string>,
  pairs: Iterable<RelationshipPair>,
): ReportRelationshipInput[] {
  const ids = new Set(entityIds);
  const seen = new Map<string, ReportRelationshipInput>();
  const result: ReportRelationshipInput[] = [];
  for (const pair of pairs) {
    if (pair.sourceId === pair.targetId) continue;
    if (!ids.has(pair.sourceId) || !ids.has(pair.targetId)) continue;
    const label = pair.label?.trim() || "related";
    const key = `${pair.sourceId}\u0000${pair.targetId}\u0000${label}`;
    const existing = seen.get(key);
    if (existing) {
      // The same relationship from a second place stays one relationship.
      if (
        pair.source &&
        existing.sources &&
        !existing.sources.includes(pair.source)
      ) {
        existing.sources.push(pair.source);
      }
      continue;
    }
    const relationship: ReportRelationshipInput = {
      sourceId: pair.sourceId,
      targetId: pair.targetId,
      label,
      ...(pair.source && { sources: [pair.source] }),
    };
    seen.set(key, relationship);
    result.push(relationship);
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
        source: "graph",
      });
    }
  }
  return pairs;
}

/** FR-019: see `deriveFactionMembership`. */
export const buildFactionMembership = deriveFactionMembership;

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
