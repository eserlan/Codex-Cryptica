// NPC content data now lives in the generator-engine package (#1351); re-export
// it here so existing SEO consumers (form fields, random-idea) keep importing
// from this module.
export { npcConfig, npcThemeConfig, holidayConfig } from "generator-engine";
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
  factionSchema,
  nomadClanSchema,
  vampireSchema,
  darkFactionSchema,
  FACTION_PRESETS,
  NOMAD_CLAN_PRESETS,
  VAMPIRE_PRESETS,
} from "generator-engine";
export { factionRosterConfig } from "generator-engine";
export {
  settlementConfig,
  SETTLEMENT_PRESETS,
  SETTLEMENT_LEXICON,
  settlementSchema,
  presetsFor,
  analyseIntent,
  applyIntent,
  resolveSmart,
  type InferredChoice,
} from "generator-engine";
// Magic item content data now lives in the package (#1351).
export { magicItemConfig } from "generator-engine";
export { minorMagicItemConfig } from "generator-engine";
export { artifactConfig } from "generator-engine";
export {
  questConfig,
  questGenreForTheme,
  themeToQuestGenre,
} from "generator-engine";
export { rumourConfig } from "generator-engine";
export { encounterConfig } from "generator-engine";
export { puzzleConfig } from "generator-engine";
export {
  getVillainThreatScales,
  villainConfig,
  comicBookEventConfig,
  villainSchemeConfig,
} from "generator-engine";
export { originConfig } from "generator-engine";
export { personalityConfig } from "generator-engine";
export { councilVoteConfig } from "generator-engine";
export { heistConfig } from "generator-engine";
export { secretSocietyConfig } from "generator-engine";
export { socialHubConfig } from "generator-engine";
export { kingdomConfig } from "generator-engine";
export { nationConfig } from "generator-engine";
export { pantheonConfig } from "generator-engine";
export { nameGeneratorConfig } from "generator-engine";
export { shipConfig } from "generator-engine";
export { languageConfig } from "generator-engine";
export { newsSheetConfig } from "generator-engine";
export { dungeonConfig, forDungeonGenre } from "generator-engine";
export { adventureConfig, forAdventureGenre } from "generator-engine";
export { plotTwistConfig } from "generator-engine";
export { worldConfig } from "generator-engine";
export { starSystemConfig } from "generator-engine";
export { constellationConfig } from "generator-engine";
export { alienRaceConfig } from "generator-engine";
export { creatureConfig } from "generator-engine";
export { pickFrom } from "./generator-helpers";
