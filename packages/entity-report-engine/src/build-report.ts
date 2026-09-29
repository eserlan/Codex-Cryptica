import type {
  ReportDocument,
  ReportEntityInput,
  ReportInput,
  ReportOptions,
  ReportRelationshipLine,
  ReportSection,
} from "./types";

function applyInclude(
  entity: ReportEntityInput,
  include: ReportOptions["include"],
): ReportEntityInput {
  const copy: ReportEntityInput = { ...entity };
  if (!include.descriptions) {
    delete copy.summary;
    delete copy.description;
  }
  if (!include.portraits) delete copy.portraitUrl;
  if (!include.notes) delete copy.notes;
  if (!include.gmOnlySecrets) delete copy.secrets;
  return copy;
}

const byTypeThenTitle = (a: ReportEntityInput, b: ReportEntityInput) =>
  a.type.localeCompare(b.type) || a.title.localeCompare(b.title);

export function buildReport(
  input: ReportInput,
  options: ReportOptions,
): ReportDocument {
  const { include, detail } = options;
  const entities = input.entities
    .map((e) => applyInclude(e, include))
    .sort(byTypeThenTitle);
  const byId = new Map(entities.map((e) => [e.id, e]));
  const titleOf = (id: string) => byId.get(id)?.title ?? id;

  const allLines = input.relationships
    .filter((r) => byId.has(r.sourceId) && byId.has(r.targetId))
    .map((r) => ({
      sourceId: r.sourceId,
      targetId: r.targetId,
      line: {
        sourceTitle: titleOf(r.sourceId),
        label: r.label,
        targetTitle: titleOf(r.targetId),
      } satisfies ReportRelationshipLine,
    }));

  const linesFor = (id: string): ReportRelationshipLine[] =>
    include.relationships
      ? allLines
          .filter((l) => l.sourceId === id || l.targetId === id)
          .map((l) => l.line)
      : [];

  const factionsOf = (id: string): string[] =>
    include.factionsAffiliations
      ? Object.entries(input.factionMembership)
          .filter(
            ([factionId, members]) =>
              byId.has(factionId) && members.includes(id),
          )
          .map(([factionId]) => titleOf(factionId))
          .sort()
      : [];

  const sections: ReportSection[] = entities.map((entity) => {
    if (entity.type === "faction") {
      const memberIds = include.factionsAffiliations
        ? (input.factionMembership[entity.id] ?? [])
        : [];
      return {
        kind: "faction",
        entity,
        members: memberIds
          .map((id) => byId.get(id))
          .filter((m): m is ReportEntityInput => Boolean(m))
          .sort(byTypeThenTitle),
        relationships: linesFor(entity.id),
      };
    }
    if (entity.type === "character") {
      return {
        kind: "character",
        entity,
        relationships: linesFor(entity.id),
        affiliations: factionsOf(entity.id),
      };
    }
    if (entity.type === "location") {
      return {
        kind: "location",
        entity,
        parent:
          include.relationships && entity.parent
            ? byId.get(entity.parent)
            : undefined,
        contains: include.relationships
          ? entities.filter((e) => e.parent === entity.id)
          : [],
        relationships: linesFor(entity.id),
      };
    }
    return { kind: "generic", entity };
  });

  return {
    overview: {
      entityCount: entities.length,
      relationshipCount: allLines.length,
      factionCount: entities.filter((e) => e.type === "faction").length,
    },
    detail,
    includePortraits: include.portraits,
    sections,
    relationshipSummary: include.relationships
      ? allLines.map((l) => l.line)
      : [],
  };
}
