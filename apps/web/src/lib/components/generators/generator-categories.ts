import type { GeneratorId } from "generator-engine";

export const GENERATOR_SECTION_CATEGORIES = [
  { id: "people-factions", label: "People & Factions" },
  { id: "locations-worlds", label: "Locations & Worlds" },
  { id: "adventures-encounters", label: "Adventures & Encounters" },
  { id: "loot-lore", label: "Loot & Lore" },
] as const;

export type GeneratorSectionId =
  (typeof GENERATOR_SECTION_CATEGORIES)[number]["id"];

export const GENERATOR_SECTION_MAP: Record<GeneratorId, GeneratorSectionId> = {
  // People & Factions
  npc: "people-factions",
  villain: "people-factions",
  faction: "people-factions",
  "secret-society": "people-factions",
  "faction-roster": "people-factions",
  creature: "people-factions",
  "alien-race": "people-factions",

  // Locations & Worlds
  settlement: "locations-worlds",
  dungeon: "locations-worlds",
  ship: "locations-worlds",
  world: "locations-worlds",
  "star-system": "locations-worlds",
  constellation: "locations-worlds",

  // Adventures & Encounters
  adventure: "adventures-encounters",
  "point-crawl": "adventures-encounters",
  business: "people-factions",
  quest: "adventures-encounters",
  encounter: "adventures-encounters",
  heist: "adventures-encounters",
  event: "adventures-encounters",
  "plot-twist": "adventures-encounters",
  puzzle: "adventures-encounters",
  rumour: "adventures-encounters",
  "council-vote": "adventures-encounters",

  // Loot & Lore
  "magic-item": "loot-lore",
  "minor-magic-item": "loot-lore",
  artifact: "loot-lore",
  tome: "loot-lore",
  language: "loot-lore",
  "news-sheet": "loot-lore",
  "random-table": "loot-lore",
  holiday: "loot-lore",
};

export function resolveGeneratorSection(gen: {
  id: GeneratorId;
  entityType: string;
}): GeneratorSectionId {
  if (GENERATOR_SECTION_MAP[gen.id]) {
    return GENERATOR_SECTION_MAP[gen.id];
  }
  if (["character", "faction", "creature"].includes(gen.entityType)) {
    return "people-factions";
  }
  if (["location"].includes(gen.entityType)) {
    return "locations-worlds";
  }
  if (["event"].includes(gen.entityType)) {
    return "adventures-encounters";
  }
  return "loot-lore";
}
