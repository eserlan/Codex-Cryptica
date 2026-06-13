import type { GeneratorId } from "./campaign-generator-types";

/**
 * Maps a supported world-theme id to sensible per-generator label defaults.
 * Keys match the real world-theme ids from the web app's themeStore.
 * "workspace" is the neutral fallback (no world theme active).
 */
export const THEME_GENERATOR_DEFAULTS: Record<
  string,
  Partial<Record<GeneratorId, Record<string, string>>>
> = {
  workspace: {},
  fantasy: {
    npc: { raceLabel: "Human", classLabel: "Adventurer" },
    settlement: { settlementType: "Town" },
    faction: { factionType: "Guild" },
    "magic-item": { itemRarity: "Uncommon" },
  },
  scifi: {
    npc: { raceLabel: "Human", classLabel: "Crew" },
    settlement: { settlementType: "Station" },
    faction: { factionType: "Corporation" },
    "magic-item": { itemRarity: "Prototype" },
  },
  modern: {
    npc: { raceLabel: "Human", classLabel: "Civilian" },
    settlement: { settlementType: "City" },
    faction: { factionType: "Organization" },
    "magic-item": { itemRarity: "Rare" },
  },
  horror: {
    npc: { raceLabel: "Human", classLabel: "Survivor" },
    settlement: { settlementType: "Town" },
    faction: { factionType: "Cult" },
    "magic-item": { itemRarity: "Cursed" },
  },
  cyberpunk: {
    npc: { raceLabel: "Human", classLabel: "Runner" },
    settlement: { settlementType: "Sprawl" },
    faction: { factionType: "Gang" },
    "magic-item": { itemRarity: "Illegal Mod" },
  },
};

/**
 * Returns theme-derived generator defaults for the given theme and generator.
 * Returns an empty object if the theme or generator has no special defaults.
 * User-edited options must always override these.
 */
export function getThemeDefaults(
  themeId: string,
  generatorId: GeneratorId,
): Record<string, string> {
  return THEME_GENERATOR_DEFAULTS[themeId]?.[generatorId] ?? {};
}
