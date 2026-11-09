import type { GeneratorId } from "./campaign-generator-types";

/**
 * Generator id -> default vault category id.
 *
 * The generator id is a content concept and is NOT the vault category. Only
 * `faction` matches by name; the rest map to distinct categories.
 */
export const GENERATOR_ENTITY_TYPE: Record<GeneratorId, string> = {
  "mystery-investigation": "note",
  business: "faction",
  npc: "character",
  faction: "faction",
  "faction-roster": "note",
  settlement: "location",
  "magic-item": "item",
  "minor-magic-item": "item",
  artifact: "item",
  event: "event",
  ship: "location",
  language: "note",
  "news-sheet": "note",
  dungeon: "location",
  adventure: "note",
  quest: "event",
  rumour: "note",
  puzzle: "note",
  villain: "character",
  world: "location",
  "council-vote": "note",
  "secret-society": "faction",
  "star-system": "location",
  constellation: "note",
  // A species, not an individual — creature rather than character.
  "alien-race": "creature",
  creature: "creature",
  "plot-twist": "note",
  "random-table": "table",
  encounter: "note",
  heist: "note",
  holiday: "note",
  tome: "item",
  "point-crawl": "note",
};

/** Fallback category used when a mapped category is absent from the campaign. */
export const FALLBACK_CATEGORY = "note";

/**
 * Resolve the vault category for a generator against the campaign's available
 * categories. Falls back to `note` when present, otherwise the first available
 * category, so generation never produces an unknown entity type.
 */
export function resolveEntityType(
  generatorId: GeneratorId,
  availableCategoryIds?: string[],
): string {
  const mapped = GENERATOR_ENTITY_TYPE[generatorId];
  if (!availableCategoryIds || availableCategoryIds.length === 0) return mapped;
  if (availableCategoryIds.includes(mapped)) return mapped;
  if (availableCategoryIds.includes(FALLBACK_CATEGORY))
    return FALLBACK_CATEGORY;
  return availableCategoryIds[0];
}
