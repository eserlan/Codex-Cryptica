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
    npc: { race: "Human", role: "Warrior" },
    settlement: { type: "Town" },
    faction: { type: "Merchant Guild" },
    "magic-item": { rarity: "Uncommon" },
    event: { type: "Battle" },
    dungeon: {
      purpose: "Temple & Shrine",
      currentState: "Active Monster Lair",
    },
  },
  scifi: {
    npc: { race: "Human", role: "Free Trader" },
    settlement: { type: "Station" },
    faction: { type: "Corporate Extraction Crew" },
    "magic-item": { rarity: "Uncommon" },
    event: { type: "Discovery" },
    dungeon: { purpose: "Research Facility", currentState: "Abandoned Ruins" },
  },
  modern: {
    npc: { race: "Human", role: "Activist" },
    settlement: { type: "City" },
    faction: { type: "Corporate Lobby" },
    "magic-item": { rarity: "Rare" },
    event: { type: "Disaster" },
    dungeon: { purpose: "Prison & Vault", currentState: "Sealed Vault" },
  },
  horror: {
    npc: { race: "Human", role: "Private Detective" },
    settlement: { type: "Town" },
    faction: { type: "Cult of the Damned" },
    "magic-item": { rarity: "Rare" },
    event: { type: "Ritual" },
    dungeon: { purpose: "Tomb & Catacomb", currentState: "Cursed Ruin" },
  },
  cosmic_horror: {
    npc: { race: "Human", role: "Investigator" },
    settlement: { type: "Remote Village" },
    faction: { type: "Research Society" },
    "magic-item": { rarity: "Rare" },
    event: { type: "Discovery" },
    dungeon: { purpose: "Research Facility", currentState: "Sealed Vault" },
  },
  cyberpunk: {
    npc: { race: "Human", role: "Netrunner" },
    settlement: { type: "District" },
    faction: { type: "Criminal Syndicate" },
    "magic-item": { rarity: "Rare" },
    event: { type: "Uprising" },
    dungeon: {
      purpose: "Research Facility",
      currentState: "Occupied Stronghold",
    },
  },
  "space-western": {
    npc: { race: "Human", role: "Smuggler Captain" },
    settlement: { type: "Boomtown Outpost" },
    faction: { type: "Smuggler Syndicate" },
    "magic-item": { rarity: "Uncommon" },
    event: { type: "Discovery" },
    dungeon: { purpose: "Mining Complex", currentState: "Abandoned Ruins" },
  },
  "space-western_light": {
    npc: { race: "Human", role: "Smuggler Captain" },
    settlement: { type: "Boomtown Outpost" },
    faction: { type: "Smuggler Syndicate" },
    "magic-item": { rarity: "Uncommon" },
    event: { type: "Discovery" },
    dungeon: { purpose: "Mining Complex", currentState: "Abandoned Ruins" },
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
