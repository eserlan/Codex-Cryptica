// NPC content data now lives in the generator-engine package (#1351); re-export
// it here so existing SEO consumers (form fields, random-idea) keep importing
// from this module.
export { npcConfig, npcThemeConfig } from "generator-engine/public-npc";
export { holidayConfig } from "generator-engine/public-holiday";
export {
  factionConfig,
  themeIdToLabel,
  vampireConfig,
  nomadClanConfig,
  darkFactionConfig,
  resolveFaction,
  resolveNomadClan,
  resolveVampire,
  resolveDarkFaction,
} from "generator-engine/public-faction";
export {
  urbanFantasyFactionConfig,
  urbanFantasyFactionSchema,
} from "generator-engine/public-urban-fantasy-faction";
export {
  factionSchema,
  nomadClanSchema,
  vampireSchema,
  darkFactionSchema,
} from "generator-engine/public-faction-schema";
export {
  FACTION_PRESETS,
  NOMAD_CLAN_PRESETS,
  VAMPIRE_PRESETS,
} from "generator-engine/public-faction-presets";
export { factionRosterConfig } from "generator-engine/public-faction-roster";
export { settlementConfig } from "generator-engine/public-settlement";
export { SETTLEMENT_PRESETS } from "generator-engine/public-settlement-presets";
export { SETTLEMENT_LEXICON } from "generator-engine/public-settlement-lexicon";
export { settlementSchema } from "generator-engine/public-settlement-schema";
export {
  presetsFor,
  analyseIntent,
  applyIntent,
  resolveSmart,
  type InferredChoice,
} from "generator-engine/smart";
// Magic item content data now lives in the package (#1351).
export { magicItemConfig } from "generator-engine/public-magic-item";
export { minorMagicItemConfig } from "generator-engine/public-minor-magic-item";
export { artifactConfig } from "generator-engine/public-artifact";
export {
  questConfig,
  questGenreForTheme,
  themedQuestPool,
  themeToQuestGenre,
} from "generator-engine/public-quest";
export { rumourConfig } from "generator-engine/public-rumour";
export { encounterConfig } from "generator-engine/public-encounter";
export { puzzleConfig } from "generator-engine/public-puzzle";
export {
  getVillainThreatScales,
  villainConfig,
} from "generator-engine/public-villain";
export { comicBookEventConfig } from "generator-engine/public-comic-book-event";
export { villainSchemeConfig } from "generator-engine/public-villain-scheme";
export { oneShotConfig } from "generator-engine/public-one-shot";
export { originConfig } from "generator-engine/public-origin";
export { personalityConfig } from "generator-engine/public-personality";
export { councilVoteConfig } from "generator-engine/public-council-vote";
export { heistConfig } from "generator-engine/public-heist";
export { secretSocietyConfig } from "generator-engine/public-secret-society";
export { socialHubConfig } from "generator-engine/public-social-hub-config";
export { kingdomConfig } from "generator-engine/public-kingdom";
export { nationConfig } from "generator-engine/public-nation";
export { pantheonConfig } from "generator-engine/public-pantheon";
export { nameGeneratorConfig } from "generator-engine/public-names";
export { shipConfig } from "generator-engine/public-ship";
export { languageConfig } from "generator-engine/public-language";
export { newsSheetConfig } from "generator-engine/public-news-sheet";
export {
  dungeonConfig,
  forGenre as forDungeonGenre,
} from "generator-engine/public-dungeon";
export {
  adventureConfig,
  forAdventureGenre,
} from "generator-engine/public-adventure";
export { plotTwistConfig } from "generator-engine/public-plot-twist";
export { worldConfig } from "generator-engine/public-world";
export { starSystemConfig } from "generator-engine/public-star-system";
export { constellationConfig } from "generator-engine/public-constellation";
export { alienRaceConfig } from "generator-engine/public-alien-race";
export { creatureConfig } from "generator-engine/public-creature";
export { tomeConfig } from "generator-engine/public-tome";
export { pointCrawlConfig } from "generator-engine/public-point-crawl";
export { businessConfig } from "generator-engine/public-business";
export { mysteryConfig } from "generator-engine/public-mystery";
export {
  nameTable,
  pickFrom,
  getRandomItems,
  generateName,
} from "./generator-helpers";
