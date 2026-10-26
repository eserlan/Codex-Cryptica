import {
  alienRaceConfig,
  constellationConfig,
  creatureConfig,
  factionConfig,
  kingdomConfig,
  languageConfig,
  nationConfig,
  newsSheetConfig,
  shipConfig,
  socialHubConfig,
  starSystemConfig,
  worldConfig,
} from "$lib/services/seo/generator-config";
import {
  SETTLEMENT_GENRE_FOR_HUB,
  mapHubGenreToShipGenre,
} from "./generator-theme-maps";
import { worldGenreForHub } from "./generator-page-world-handoff";
import {
  createSettlementFields,
  resolveSupportedHubGenre,
} from "./generator-page-hub-state";

/** Fresh, page-local setting form defaults. */
export function createSettingDefaults(initialHubGenre: string | null) {
  const initialWorldGenre = worldGenreForHub(initialHubGenre);
  const settlementGenre =
    (initialHubGenre
      ? (SETTLEMENT_GENRE_FOR_HUB[initialHubGenre] ?? initialHubGenre)
      : null) ?? "Fantasy";
  const initialNationGenre = resolveSupportedHubGenre(
    initialHubGenre,
    nationConfig.genres,
    nationConfig.genres[0],
  );
  const initialNationPolityTypes =
    nationConfig.polityTypesByGenre[initialNationGenre] ??
    nationConfig.polityTypesByGenre[nationConfig.genres[0]];
  const initialSocialHubGenre = resolveSupportedHubGenre(
    initialHubGenre,
    socialHubConfig.genres,
    socialHubConfig.genres[0],
  );
  const initialSocialHubVenueTypes =
    socialHubConfig.venueTypesByGenre[initialSocialHubGenre] ??
    socialHubConfig.venueTypesByGenre[socialHubConfig.genres[0]];
  const initialSocialHubClienteles =
    socialHubConfig.clientelesByGenre[initialSocialHubGenre] ??
    socialHubConfig.clientelesByGenre[socialHubConfig.genres[0]];
  const _shipInitialGenre = initialHubGenre
    ? mapHubGenreToShipGenre(initialHubGenre)
    : "Sci-Fi";
  const _newsSheetInitialGenre =
    initialHubGenre && newsSheetConfig.genres.includes(initialHubGenre)
      ? initialHubGenre
      : newsSheetConfig.genres[0];
  return {
    settlement: {
      ...createSettlementFields(settlementGenre),
      campaignContext: "",
    },
    tavern: {
      type: socialHubConfig.venueTypesByGenre["Fantasy"][0],
      atmosphere: socialHubConfig.atmospheres[0],
      settlementType: socialHubConfig.settlementTypes[1],
      wealthLevel: socialHubConfig.wealthLevels[2],
      clientele: socialHubConfig.clientelesByGenre["Fantasy"][4],
      campaignContext: "",
    },
    kingdom: {
      polityType: kingdomConfig.polityTypes[0],
      governmentStyle: kingdomConfig.governmentStyles[0],
      geography: kingdomConfig.geographies[0],
      scale: kingdomConfig.scales[2],
      conflictLevel: kingdomConfig.conflictLevels[0],
      magicLevel: kingdomConfig.magicLevels[2],
      campaignContext: "",
    },
    nation: {
      genre: initialNationGenre,
      polityType: initialNationPolityTypes[0],
      governmentStyle: nationConfig.governmentStyles[0],
      scale: nationConfig.scales[2],
      conflictLevel: nationConfig.conflictLevels[0],
      campaignContext: "",
    },
    socialHub: {
      genre: initialSocialHubGenre,
      venueType: initialSocialHubVenueTypes[0],
      atmosphere: socialHubConfig.atmospheres[0],
      wealthLevel: socialHubConfig.wealthLevels[2],
      clientele: initialSocialHubClienteles[0],
      campaignContext: "",
    },
    ship: {
      genre: _shipInitialGenre,
      role: (shipConfig.rolesByGenre[_shipInitialGenre] ??
        shipConfig.rolesByGenre["Sci-Fi"])[0],
      scale: shipConfig.scales[2],
      condition: shipConfig.conditions[2],
      tone: shipConfig.tones[0],
      campaignContext: "",
    },
    language: {
      genre: languageConfig.genres[0],
      tone: languageConfig.tones[0],
      role: languageConfig.roles[0],
      structure: languageConfig.structures[0],
      campaignContext: "",
    },
    newsSheet: {
      genre: _newsSheetInitialGenre,
      publicationType: (newsSheetConfig.publicationTypesByGenre[
        _newsSheetInitialGenre
      ] ?? newsSheetConfig.publicationTypesByGenre["Fantasy"])[0],
      tone: newsSheetConfig.tones[1],
      bias: newsSheetConfig.biases[0],
      censorLevel: newsSheetConfig.censorLevels[0],
      hookDensity: newsSheetConfig.hookDensities[1],
      placeName: "",
      headlineEvent: "",
      campaignContext: "",
    },
    world: {
      worldType: worldConfig.worldTypes[0],
      habitability: worldConfig.habitability[0],
      civilisation: worldConfig.civilisations[0],
      societalModel: worldConfig.societalModels[0],
      worldTagOne: worldConfig.defaultWorldTags[0],
      worldTagTwo: worldConfig.defaultWorldTags[1],
      genre: initialWorldGenre,
      lancerWorldFrame: worldConfig.lancerWorldFrames[0],
      campaignPressure:
        initialWorldGenre === "Lancer"
          ? worldConfig.lancerConflicts[0]
          : worldConfig.campaignPressures[0],
      dominantFeature: "",
      campaignContext: "",
    },
    starSystem: {
      systemType: starSystemConfig.systemTypes[0],
      genre: starSystemConfig.genres[0],
      civilisationLevel: starSystemConfig.civilisationLevels[0],
      systemCharacter: starSystemConfig.systemCharacters[0],
      scientificRealism: starSystemConfig.scientificRealism[0],
      campaignContext: "",
    } as {
      systemType: string;
      genre: string;
      civilisationLevel: string;
      systemCharacter: string;
      scientificRealism: string;
      campaignContext: string;
    },
    constellation: {
      mode: "single",
      genre: constellationConfig.genres[0],
      visualImpression: constellationConfig.visualImpressions[0],
      practicalUse: constellationConfig.practicalUses[0],
      culturalMeaning: constellationConfig.culturalMeanings[0],
      campaignContext: "",
    } as {
      mode: "single" | "night-sky";
      genre: string;
      visualImpression: string;
      practicalUse: string;
      culturalMeaning: string;
      campaignContext: string;
    },
    alienRace: {
      genre: alienRaceConfig.genres[0],
      generationMode: alienRaceConfig.generationModes[0],
      homeEnvironment: alienRaceConfig.homeEnvironments[0],
      bodyPlan: alienRaceConfig.bodyPlans[0],
      psychology: alienRaceConfig.psychologies[0],
      socialOrganisation: alienRaceConfig.socialOrganisations[0],
      technologyLevel: alienRaceConfig.technologyLevels[0],
      relationToOutsiders: alienRaceConfig.relationsToOutsiders[0],
      campaignContext: "",
    } as {
      genre: string;
      generationMode: string;
      homeEnvironment: string;
      bodyPlan: string;
      psychology: string;
      socialOrganisation: string;
      technologyLevel: string;
      relationToOutsiders: string;
      campaignContext: string;
    },
    creature: {
      genre: factionConfig.themes[0],
      category: creatureConfig.categories[0],
      threatLevel: creatureConfig.threatLevels[0],
      size: creatureConfig.sizes[0],
      temperament: creatureConfig.temperaments[0],
      habitat: creatureConfig.habitats[0],
      ecologicalRole: creatureConfig.ecologicalRoles[0],
      campaignContext: "",
    } as {
      genre: string;
      category: string;
      threatLevel: string;
      size: string;
      temperament: string;
      habitat: string;
      ecologicalRole: string;
      campaignContext: string;
    },
  };
}
