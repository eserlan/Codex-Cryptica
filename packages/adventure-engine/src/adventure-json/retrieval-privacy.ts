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

type AdventureJsonRecord = ReturnType<typeof adventureJsonRecords>[number];

function addText(out: Set<string>, value: unknown): void {
  if (typeof value === "string") {
    if (value.length > 0) out.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.length > 0) out.add(item);
    }
  }
}

function addAlternativeSolutionText(out: Set<string>, value: unknown): void {
  if (!Array.isArray(value)) return;
  for (const solution of value) {
    if (!solution || typeof solution !== "object") continue;
    const { method, description } = solution as Record<string, unknown>;
    addText(out, method);
    addText(out, description);
  }
}

function addHiddenRecordText(out: Set<string>, record: AdventureJsonRecord) {
  const fields = record as Record<string, unknown>;
  for (const key of [
    "name",
    "title",
    "summary",
    "description",
    "text",
    "body",
    "readAloud",
    "conditions",
  ]) {
    addText(out, fields[key]);
  }
  addAlternativeSolutionText(out, fields.alternativeSolutions);
  addText(out, record.sourceRef?.textQuote);
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
  for (const secret of pkg.secrets) addText(out, secret.text);
  for (const clue of pkg.clues) addText(out, clue.reveals);
  for (const record of adventureJsonRecords(pkg)) {
    if (record.visibility === "player-visible") continue;
    addHiddenRecordText(out, record);
  }
  return [...out];
}

/** The rule retrieval uses to decide that a line of text names a hidden record ID. */
export function createAdventureJsonHiddenIdMatcher(
  hiddenIds: Iterable<string>,
): (text: string) => boolean {
  return createBoundaryMatcher([...hiddenIds].filter(isFreeTextMatchableId));
}
