
import { forGenre } from "./public-dungeon-constants";
import { themeIdToLabel, factionConfig } from "./public-faction-constants";
import { npcThemeConfig } from "./public-npc-constants";
import { settlementConfig } from "./public-settlement-constants";
import { forAdventureGenre, adventureConfig } from "./public-adventure";
import { councilVoteConfig } from "./public-council-vote-constants";

export function npcRacesForTheme(themeId: string): string[] {
  const genre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  return forGenre(npcThemeConfig.ancestries, genre);
}
export function npcRolesForTheme(themeId: string): string[] {
  const genre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  return forGenre(npcThemeConfig.roles, genre);
}
export function adventureArchetypesForTheme(themeId: string): string[] {
  const genre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  return forAdventureGenre(adventureConfig.archetypesByGenre, genre);
}
export function adventureTonesForTheme(themeId: string): string[] {
  const genre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  return forAdventureGenre(adventureConfig.tonesByGenre, genre);
}
export const NPC_RACES = npcRacesForTheme("workspace");
export const NPC_ROLES = npcRolesForTheme("workspace");
export const NPC_TRAITS = [
  "speaks in measured, deliberate sentences",
  "never removes their worn leather gloves",
  "collects small carved trinkets from every town visited",
  "laughs a beat too late at every joke",
];

export function factionTypesForTheme(themeId: string): string[] {
  const genre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  return forGenre(factionConfig.typesByTheme, genre);
}
export const FACTION_TYPES = factionTypesForTheme("workspace");

export const FACTION_GOALS = [
  "control the regional trade routes",
  "uncover a buried pre-cataclysm secret",
  "install a sympathetic ruler",
  "purge a rival faction from the city",
];

const SETTLEMENT_GENRE_ALIASES: Record<string, string> = {
  "Vampire / Gothic Noir": "Horror",
  "Modern Conspiracy": "Modern",
  "Cyberpunk / Corporate": "Cyberpunk",
  "Sci-Fi / Space Opera": "Sci-Fi",
  "Western / Frontier": "Western",
};

export function settlementTypesForTheme(themeId: string): string[] {
  const genre = themeIdToLabel[themeId] ?? "Classic Fantasy";
  const settlementGenre = SETTLEMENT_GENRE_ALIASES[genre] ?? genre;
  return forGenre(settlementConfig.sizesByGenre, settlementGenre).map(
    (tier) => tier.name,
  );
}
export const SETTLEMENT_TYPES = settlementTypesForTheme("workspace");

export const SETTLEMENT_FEATURES = [
  "a crumbling aqueduct still feeding the central well",
  "a market square that never fully closes",
  "a shrine locals leave offerings at each dawn",
  "a harbor choked with half-sunk wrecks",
];

export const ITEM_RARITIES = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"];
export const ITEM_KINDS = ["Blade", "Amulet", "Ring", "Staff", "Tome", "Cloak"];
export const ITEM_EFFECTS = [
  "hums faintly when an untruth is spoken nearby",
  "grows warm in the presence of the undead",
  "lets the bearer recall one forgotten memory each night",
  "turns aside the first blow of any duel",
];

export const EVENT_TYPES = [
  "Battle",
  "Festival",
  "Disaster",
  "Discovery",
  "Ritual",
  "Treaty",
  "Uprising",
  "Betrayal",
];
export const EVENT_OUTCOMES = [
  "reshaped the balance of power across the region",
  "left a wound the locals have never forgotten",
  "forged an uneasy alliance between former enemies",
  "uncovered a secret that should have stayed buried",
];

export const COUNCIL_VOTE_BODY_TYPES = councilVoteConfig.bodyTypes;

export const COUNCIL_VOTE_SIZES = councilVoteConfig.sizes;

export const COUNCIL_VOTE_RULES = councilVoteConfig.votingRules;

export const COUNCIL_VOTE_SCOPES = councilVoteConfig.scopes;

export const COUNCIL_VOTE_TONES = councilVoteConfig.tones;

export const COUNCIL_VOTE_ANTAGONIST_INFLUENCE =
  councilVoteConfig.antagonistInfluences;

export const COUNCIL_VOTE_ARCHETYPES = councilVoteConfig.archetypes;

export const COUNCIL_VOTE_STANCES = councilVoteConfig.stances;
