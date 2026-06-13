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
    npc: { race: "Human", role: "Adventurer" },
    settlement: { type: "Town" },
    faction: { type: "Guild" },
    "magic-item": { rarity: "Uncommon" },
  },
  scifi: {
    npc: { race: "Human", role: "Crew" },
    settlement: { type: "Station" },
    faction: { type: "Corporation" },
    "magic-item": { rarity: "Uncommon" },
  },
  modern: {
    npc: { race: "Human", role: "Civilian" },
    settlement: { type: "City" },
    faction: { type: "Guild" },
    "magic-item": { rarity: "Rare" },
  },
  horror: {
    npc: { race: "Human", role: "Survivor" },
    settlement: { type: "Town" },
    faction: { type: "Cult" },
    "magic-item": { rarity: "Rare" },
  },
  cyberpunk: {
    npc: { race: "Human", role: "Runner" },
    settlement: { type: "City" },
    faction: { type: "Syndicate" },
    "magic-item": { rarity: "Rare" },
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
