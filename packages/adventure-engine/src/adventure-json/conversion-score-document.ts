import type { SourceReference } from "./schema";
import {
  containsTokens,
  normaliseText,
  textFoundIn,
} from "./conversion-score-text";

export type Entity = {
  id: string;
  epistemicStatus?: string | undefined;
  sourceRef?: SourceReference | undefined;
  [key: string]: unknown;
};

export type DocLike = Record<string, unknown> & {
  [K in (typeof ENTITY_COLLECTIONS)[number]]: Entity[];
};

export const ENTITY_COLLECTIONS = [
  "locations",
  "actors",
  "factions",
  "scenes",
  "encounters",
  "clues",
  "rumours",
  "items",
  "secrets",
  "endings",
  "unresolved",
] as const;

export function citesSourceId(entity: Entity, sourceId: string): boolean {
  return entity.id === sourceId || entity.sourceRef?.anchor === sourceId;
}

export function citesSection(
  entity: Entity,
  section: { sourceId: string; title: string },
): boolean {
  if (citesSourceId(entity, section.sourceId)) return true;
  const refSection = entity.sourceRef?.section;
  return (
    typeof refSection === "string" &&
    normaliseText(refSection) === normaliseText(section.title)
  );
}

export function allEntities(doc: DocLike): Entity[] {
  return ENTITY_COLLECTIONS.flatMap((name) => doc[name] ?? []);
}

function premiseStrings(
  doc: Record<string, unknown>,
  push: (field: string, value: unknown) => void,
): void {
  push("title", doc["title"]);
  push("description", doc["description"]);
  const premise = doc["premise"] as Record<string, unknown> | undefined;
  if (!premise || typeof premise !== "object") return;
  push("premise.background", premise["background"]);
  push("premise.hook", premise["hook"]);
  push("premise.tone", premise["tone"]);
  const theme = premise["theme"];
  if (Array.isArray(theme))
    theme.forEach((t, i) => push(`premise.theme[${i}]`, t));
}

function walkStrings(
  field: string,
  value: unknown,
  push: (field: string, value: string) => void,
): void {
  if (typeof value === "string") push(field, value);
  else if (Array.isArray(value))
    value.forEach((v, i) => walkStrings(`${field}[${i}]`, v, push));
  else if (value && typeof value === "object")
    for (const [key, v] of Object.entries(value))
      walkStrings(`${field}.${key}`, v, push);
}

export function recordStrings(
  name: string,
  rec: Record<string, unknown>,
  push: (field: string, value: unknown) => void,
): void {
  const id = typeof rec["id"] === "string" ? rec["id"] : "?";
  for (const [key, value] of Object.entries(rec))
    walkStrings(`${name} ${id}.${key}`, value, push);
}

function collectionStrings(
  doc: Record<string, unknown>,
  push: (field: string, value: unknown) => void,
): void {
  for (const name of ENTITY_COLLECTIONS) {
    const items = doc[name];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      if (rec["visibility"] === "player-visible")
        recordStrings(name, rec, push);
    }
  }
}

export function playerVisibleStrings(
  doc: Record<string, unknown>,
): Array<{ field: string; value: string }> {
  const out: Array<{ field: string; value: string }> = [];
  const push = (field: string, value: unknown): void => {
    if (typeof value === "string") out.push({ field, value });
  };
  premiseStrings(doc, push);
  collectionStrings(doc, push);
  return out;
}

export function entityTextStrings(entity: Entity): string[] {
  const strings: string[] = [];
  for (const [field, value] of Object.entries(entity)) {
    if (
      field !== "id" &&
      field !== "sourceRef" &&
      field !== "epistemicStatus"
    ) {
      walkStrings(field, value, (_field, text) => strings.push(text));
    }
  }
  return strings;
}

export function sourceReferenceMatches(
  actual: SourceReference | undefined,
  expected: SourceReference,
): boolean {
  if (!actual) return false;
  return Object.entries(expected).every(
    ([field, value]) => actual[field as keyof SourceReference] === value,
  );
}

export function hasScoredText(
  entity: Entity,
  expectedText: string,
  distinguishingTerm: string,
): boolean {
  return entityTextStrings(entity).some(
    (value) =>
      textFoundIn(expectedText, value) &&
      containsTokens(value, distinguishingTerm),
  );
}
