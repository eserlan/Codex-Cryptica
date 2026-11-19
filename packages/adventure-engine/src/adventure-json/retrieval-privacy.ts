import { createBoundaryMatcher, isFreeTextMatchableId } from "./term-matcher";
import type { AdventureJsonV1 } from "./schema";

function adventureJsonRecords(pkg: AdventureJsonV1) {
  return [
    ...pkg.locations,
    ...pkg.actors,
    ...pkg.factions,
    ...pkg.scenes,
    ...pkg.encounters,
    ...pkg.clues,
    ...pkg.rumours,
    ...pkg.items,
    ...pkg.secrets,
  ];
}

export function adventureJsonRecordIds(pkg: AdventureJsonV1): string[] {
  return adventureJsonRecords(pkg).map((record) => record.id);
}

export function adventureJsonHiddenRecordIds(pkg: AdventureJsonV1): string[] {
  return adventureJsonRecords(pkg)
    .filter((record) => record.visibility !== "player-visible")
    .map((record) => record.id);
}

/** Collects unrevealed GM-only text across the entire package for commit-time leak checks. */
export function adventureJsonGmOnlyText(pkg: AdventureJsonV1): string[] {
  const out = new Set<string>();
  const addText = (value: string | string[] | undefined) => {
    if (typeof value === "string") {
      if (value.length > 0) out.add(value);
    } else if (Array.isArray(value)) {
      for (const item of value) if (item.length > 0) out.add(item);
    }
  };
  for (const secret of pkg.secrets) addText(secret.text);
  for (const clue of pkg.clues) addText(clue.reveals);
  for (const record of adventureJsonRecords(pkg)) {
    if (record.visibility === "player-visible") continue;
    const fields = record as Record<string, unknown>;
    for (const key of [
      "name",
      "title",
      "summary",
      "description",
      "text",
      "body",
      "readAloud",
    ]) {
      const value = fields[key];
      if (typeof value === "string" || Array.isArray(value)) addText(value);
    }
    if (record.sourceRef?.textQuote) addText(record.sourceRef.textQuote);
  }
  return [...out];
}

/** The rule retrieval uses to decide that a line of text names a hidden record ID. */
export function createAdventureJsonHiddenIdMatcher(
  hiddenIds: Iterable<string>,
): (text: string) => boolean {
  return createBoundaryMatcher([...hiddenIds].filter(isFreeTextMatchableId));
}
