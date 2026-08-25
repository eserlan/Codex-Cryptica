<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { browser } from "$app/environment";
  import { afterNavigate, goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { hubContext } from "$lib/stores/hub-context.svelte";
  import { sessionHubStore } from "$lib/stores/session-hub.svelte";
  import {
    collectSessionNames,
    collectSessionTraits,
    extractPartialJsonStringFields,
  } from "generator-engine";
  import SEOGeneratorLayout from "./SEOGeneratorLayout.svelte";
  import RPGNPCFormFields from "$lib/components/seo/RPGNPCFormFields.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import QuestFormFields from "$lib/components/seo/QuestFormFields.svelte";
  import EncounterFormFields from "$lib/components/seo/EncounterFormFields.svelte";
  import PuzzleFormFields from "$lib/components/seo/PuzzleFormFields.svelte";
  import CouncilVoteFormFields from "$lib/components/seo/CouncilVoteFormFields.svelte";
  import SecretSocietyFormFields from "$lib/components/seo/SecretSocietyFormFields.svelte";
  import SettlementFormFields from "$lib/components/seo/SettlementFormFields.svelte";
  import MagicItemFormFields from "$lib/components/seo/MagicItemFormFields.svelte";
  import MinorMagicItemFormFields from "$lib/components/seo/MinorMagicItemFormFields.svelte";
  import ArtifactFormFields from "$lib/components/seo/ArtifactFormFields.svelte";
  import TavernFormFields from "$lib/components/seo/TavernFormFields.svelte";
  import SocialHubFormFields from "$lib/components/seo/SocialHubFormFields.svelte";
  import KingdomFormFields from "$lib/components/seo/KingdomFormFields.svelte";
  import NationFormFields from "$lib/components/seo/NationFormFields.svelte";
  import VampireFormFields from "$lib/components/seo/VampireFormFields.svelte";
  import NomadClanFormFields from "$lib/components/seo/NomadClanFormFields.svelte";
  import NameFormFields from "$lib/components/seo/NameFormFields.svelte";
  import NPCFormFields from "$lib/components/seo/NPCFormFields.svelte";
  import PantheonFormFields from "$lib/components/seo/PantheonFormFields.svelte";
  import ShipFormFields from "$lib/components/seo/ShipFormFields.svelte";
  import LanguageFormFields from "$lib/components/seo/LanguageFormFields.svelte";
  import NewsSheetFormFields from "$lib/components/seo/NewsSheetFormFields.svelte";
  import DungeonFormFields from "$lib/components/seo/DungeonFormFields.svelte";
  import AdventureFormFields from "$lib/components/seo/AdventureFormFields.svelte";
  import PlotTwistFormFields from "$lib/components/seo/PlotTwistFormFields.svelte";
  import VillainFormFields from "$lib/components/seo/VillainFormFields.svelte";
  import WorldFormFields from "$lib/components/seo/WorldFormFields.svelte";
  import StarSystemFormFields from "$lib/components/seo/StarSystemFormFields.svelte";
  import AlienRaceFormFields from "$lib/components/seo/AlienRaceFormFields.svelte";
  import CreatureFormFields from "$lib/components/seo/CreatureFormFields.svelte";
  import {
    generatorEngine,
    npcConfig,
    npcThemeConfig,
    settlementConfig,
    magicItemConfig,
    minorMagicItemConfig,
    artifactConfig,
    factionConfig,
    questConfig,
    encounterConfig,
    puzzleConfig,
    councilVoteConfig,
    secretSocietyConfig,
    socialHubConfig,
    kingdomConfig,
    nationConfig,
    vampireConfig,
    nomadClanConfig,
    nameGeneratorConfig,
    pantheonConfig,
    shipConfig,
    languageConfig,
    newsSheetConfig,
    dungeonConfig,
    adventureConfig,
    plotTwistConfig,
    villainConfig,
    worldConfig,
    starSystemConfig,
    alienRaceConfig,
    creatureConfig,
    themeIdToLabel,
    themeToQuestGenre,
    type GeneratorOutput,
  } from "$lib/services/seo/generator-engine";
  import {
    type SlugMetaEntry,
    type ValidSlug,
    slugMeta,
  } from "./generator-page-meta";
  import { slugDrafts } from "./generator-page-drafts";
  import {
    buildPlotTwistPremise,
    resolvePlotTwistPremiseForGeneration,
  } from "$lib/services/seo/generator-handoffs";
  import {
    HUB_LABELS,
    HUB_SLUG_TO_THEME_ID,
    SETTLEMENT_GENRE_FOR_HUB,
    SLUGS_USING_STORED_THEME,
    SOCIAL_HUB_GENRE_TO_THEME,
    mapHubGenreToShipGenre,
    mapShipGenreToTheme,
    mapWorldGenreToTheme,
    mapStarSystemGenreToTheme,
    mapAlienRaceGenreToTheme,
    resolveHubGeneratorGenre,
    shouldSyncGeneratorTheme,
  } from "./generator-theme-maps";

  let {
    slug,
    urlHubTheme = undefined,
    metaOverrides = undefined,
    initialDraftOverride = undefined,
  }: {
    slug: ValidSlug;
    urlHubTheme?: string;
    /**
     * Page copy that differs from the slug's own, for routes that present the
     * same generator under a different URL and pitch.
     *
     * The `/tools/*` pages each hand-wired their own state, generate call and
     * form bindings to say the same thing this component already says for
     * their slug. They now render this and pass their title, description,
     * FAQs, related links and canonical here, so the generator wiring exists
     * once while the pages keep their distinct content and URLs.
     */
    metaOverrides?: Partial<SlugMetaEntry>;
    /**
     * Replaces the slug's default initial draft (from slugDrafts) when provided.
     * Used by alternative routes that need a different default draft on first load.
     */
    initialDraftOverride?: GeneratorOutput;
  } = $props();

  // When arriving via a themed URL, seed hubContext immediately so derived
  // values (backHref, initialHubGenre) compute correctly on first render.
  const _initialSlug = untrack(() => slug);
  const _initialUrlHubTheme = untrack(() => urlHubTheme);
  if (_initialUrlHubTheme) {
    hubContext.set(_initialUrlHubTheme);
  }

  const backHref = $derived(
    hubContext.theme && HUB_LABELS[hubContext.theme]
      ? `/generators/${hubContext.theme}`
      : "/generators",
  );
  const backLabel = $derived(
    (hubContext.theme && HUB_LABELS[hubContext.theme]) ?? "All generators",
  );
  const initialHubGenre = resolveHubGeneratorGenre(hubContext.theme);

  function worldGenreForHub(hubGenre: string | null): string {
    if (hubGenre === "Cyberpunk") return "Cyberpunk";
    if (hubGenre === "Optimistic Exploration Sci-Fi") return "Hopeful Sci-Fi";
    if (hubGenre === "Space Opera Resistance") return "Space Opera";
    if (hubGenre === "Lancer") return "Lancer";
    return "Hard Sci-Fi";
  }

  const initialWorldGenre = worldGenreForHub(initialHubGenre);

  const meta = $derived({ ...slugMeta[slug], ...(metaOverrides ?? {}) });

  let npc = $state({
    theme: factionConfig.themes[0],
    ancestry: npcThemeConfig.ancestries[factionConfig.themes[0]][0],
    role: npcThemeConfig.roles[factionConfig.themes[0]][0],
    alignment: npcThemeConfig.moralities[factionConfig.themes[0]][0].id,
    campaignContext: "",
  });

  const settlementGenre =
    (initialHubGenre
      ? (SETTLEMENT_GENRE_FOR_HUB[initialHubGenre] ?? initialHubGenre)
      : null) ?? "Fantasy";
  const settlementSizes =
    settlementConfig.sizesByGenre[settlementGenre] ??
    settlementConfig.sizesByGenre["Fantasy"];
  let settlement = $state({
    genre: settlementGenre,
    size: settlementSizes[2].name,
    environment: (settlementConfig.environmentsByGenre[settlementGenre] ??
      settlementConfig.environmentsByGenre["Fantasy"])[0],
    primaryFunction: (settlementConfig.primaryFunctionsByGenre[
      settlementGenre
    ] ?? settlementConfig.primaryFunctionsByGenre["Fantasy"])[0],
    tone: (settlementConfig.tonesByGenre[settlementGenre] ??
      settlementConfig.tonesByGenre["Fantasy"])[0],
    mainTension: (settlementConfig.mainTensionsByGenre[settlementGenre] ??
      settlementConfig.mainTensionsByGenre["Fantasy"])[0],
    campaignContext: "",
  });

  let magicItem = $state({
    type: magicItemConfig.typesByTheme["Classic Fantasy"][0],
    rarity: magicItemConfig.rarities[1],
    campaignContext: "",
  });

  let minorMagicItem = $state({
    genre: factionConfig.themes[0],
    form: "",
    usageLimit: minorMagicItemConfig.usageLimits[0],
    utility: minorMagicItemConfig.utilities[0],
    activation: minorMagicItemConfig.activations[0],
    quirkSeverity: minorMagicItemConfig.quirkSeverities[0],
    campaignContext: "",
  });

  let artifact = $state({
    genre: factionConfig.themes[0],
    form: artifactConfig.forms[0],
    originEra: artifactConfig.originEras[0],
    powerTier: artifactConfig.powerTiers[0],
    currentStatus: artifactConfig.currentStatuses[0],
    curseCost: artifactConfig.curseCosts[0],
    campaignContext: "",
  });

  let faction = $state({
    theme: factionConfig.themes[0],
    type: factionConfig.typesByTheme["Classic Fantasy"][0],
    scope: factionConfig.scopesByTheme["Classic Fantasy"][1],
    alignment: factionConfig.alignments[0],
    campaignContext: "",
  });

  let quest = $state({
    genre: questConfig.genres[0],
    tone: questConfig.tones[0],
    scope: questConfig.scopes[0],
    locationType: questConfig.locationTypes[0],
    threat: questConfig.threats[0],
    twist: questConfig.twists[0],
    reward: questConfig.rewards[0],
    campaignContext: "",
  });
  let encounter = $state({
    genre: factionConfig.themes[0],
    encounterType:
      encounterConfig.encounterTypes.find((t) => t !== "Random") ??
      encounterConfig.encounterTypes[0],
    environment: encounterConfig.environments[0],
    threat: encounterConfig.threats[0],
    tone: encounterConfig.tones[0],
    context: "",
  });
  let puzzle = $state({
    genre: puzzleConfig.genres[0],
    purpose: puzzleConfig.purposes[0],
    complexity: puzzleConfig.complexities[0],
    style: puzzleConfig.styles[0],
    partyLevel: "",
    playerCount: "",
    capabilities: "",
    participationStyle: puzzleConfig.participationStyles[0],
    failurePressure: puzzleConfig.failurePressures[0],
    system: puzzleConfig.systems[0],
    downstreamConsequence: "",
    campaignContext: "",
  });

  let councilVote = $state({
    genre: factionConfig.themes[0],
    proposal: "",
    governingBodyType: councilVoteConfig.bodyTypes[0],
    councilSize: councilVoteConfig.sizes[1],
    votingRule: councilVoteConfig.votingRules[0],
    deadline: "",
    scope: councilVoteConfig.scopes[0],
    tone: councilVoteConfig.tones[0],
    antagonistInfluence: councilVoteConfig.antagonistInfluences[0],
    campaignContext: "",
  });
  let secretSociety = $state({
    theme: factionConfig.themes[0],
    tone: secretSocietyConfig.tones[0],
    scale: secretSocietyConfig.scales[0],
    publicFace: secretSocietyConfig.publicFaces[0],
    dangerLevel: secretSocietyConfig.dangers[0],
    truthRelationship: secretSocietyConfig.truths[0],
    campaignContext: "",
  });

  let tavern = $state({
    type: socialHubConfig.venueTypesByGenre["Fantasy"][0],
    atmosphere: socialHubConfig.atmospheres[0],
    settlementType: socialHubConfig.settlementTypes[1],
    wealthLevel: socialHubConfig.wealthLevels[2],
    clientele: socialHubConfig.clientelesByGenre["Fantasy"][4],
    campaignContext: "",
  });

  let kingdom = $state({
    polityType: kingdomConfig.polityTypes[0],
    governmentStyle: kingdomConfig.governmentStyles[0],
    geography: kingdomConfig.geographies[0],
    scale: kingdomConfig.scales[2],
    conflictLevel: kingdomConfig.conflictLevels[0],
    magicLevel: kingdomConfig.magicLevels[2],
    campaignContext: "",
  });

  let nation = $state({
    genre: initialHubGenre ?? nationConfig.genres[0],
    polityType:
      nationConfig.polityTypesByGenre[
        initialHubGenre ?? nationConfig.genres[0]
      ][0],
    governmentStyle: nationConfig.governmentStyles[0],
    scale: nationConfig.scales[2],
    conflictLevel: nationConfig.conflictLevels[0],
    campaignContext: "",
  });

  let socialHub = $state({
    genre: initialHubGenre ?? socialHubConfig.genres[0],
    venueType:
      socialHubConfig.venueTypesByGenre[
        initialHubGenre ?? socialHubConfig.genres[0]
      ][0],
    atmosphere: socialHubConfig.atmospheres[0],
    wealthLevel: socialHubConfig.wealthLevels[2],
    clientele:
      socialHubConfig.clientelesByGenre[
        initialHubGenre ?? socialHubConfig.genres[0]
      ][0],
    campaignContext: "",
  });

  let vampireClan = $state({
    archetype: vampireConfig.archetypes[0],
    bloodline: vampireConfig.bloodlines[0],
    feedingHabit: vampireConfig.feedingHabits[0],
    weakness: vampireConfig.weaknesses[0],
    campaignContext: "",
  });

  let nomadClan = $state({
    role: nomadClanConfig.roles[0],
    tone: nomadClanConfig.tones[0],
    territory: nomadClanConfig.territories[0],
    conflict: nomadClanConfig.conflicts[0],
    campaignContext: "",
  });

  let names = $state({
    culture: nameGeneratorConfig.cultures[0],
    gender: nameGeneratorConfig.genders[0],
    nameType: nameGeneratorConfig.nameTypes[0],
    context: "",
  });

  let dndNpc = $state({
    race: npcConfig.races[0],
    role: npcConfig.roles[0],
    alignment: npcConfig.alignments[0],
    campaignContext: "",
  });

  let pantheon = $state({
    mode: (untrack(() => slug) === "pantheon-generator"
      ? "pantheon"
      : "single") as "single" | "pantheon",
    size: "small" as "small" | "medium" | "large",
    width: "balanced" as "balanced" | "focused" | "wide",
    genre: pantheonConfig.genres[0],
    divineType: pantheonConfig.divineTypes[0],
    domain: pantheonConfig.domains[0],
    tone: pantheonConfig.tones[0],
    worshippers: pantheonConfig.worshippers[0],
    conflictTheme: pantheonConfig.conflictThemes[0],
    campaignContext: "",
  });

  const _shipInitialGenre = initialHubGenre
    ? mapHubGenreToShipGenre(initialHubGenre)
    : "Sci-Fi";

  let ship = $state({
    genre: _shipInitialGenre,
    role: (shipConfig.rolesByGenre[_shipInitialGenre] ??
      shipConfig.rolesByGenre["Sci-Fi"])[0],
    scale: shipConfig.scales[2],
    condition: shipConfig.conditions[2],
    tone: shipConfig.tones[0],
    campaignContext: "",
  });

  let language = $state({
    genre: languageConfig.genres[0],
    tone: languageConfig.tones[0],
    role: languageConfig.roles[0],
    structure: languageConfig.structures[0],
    campaignContext: "",
  });

  const _newsSheetInitialGenre =
    initialHubGenre && newsSheetConfig.genres.includes(initialHubGenre)
      ? initialHubGenre
      : newsSheetConfig.genres[0];

  let newsSheet = $state({
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
  });

  let dungeon = $state({
    genre: factionConfig.themes[0],
    purpose: dungeonConfig.purposes[0],
    currentState: dungeonConfig.currentStates[0],
    scale: dungeonConfig.scales[1],
    campaignContext: "",
  });

  let adventure = $state({
    genre: factionConfig.themes[0],
    archetype: adventureConfig.archetypes[0],
    scale: adventureConfig.scales[1],
    tone: adventureConfig.tones[0],
    seed: "",
    campaignContext: "",
  });

  const initialHandedOffQuestPremise =
    browser && _initialSlug === "plot-twist-generator"
      ? (new URLSearchParams(window.location.search).get("questPremise") ?? "")
      : "";
  let handedOffQuestPremise = $state(initialHandedOffQuestPremise);

  let plotTwist = $state({
    genre: factionConfig.themes[0],
    twistType: plotTwistConfig.twistTypes[0],
    impact: plotTwistConfig.impacts[1],
    timing: plotTwistConfig.timings[4],
    foreshadowing: plotTwistConfig.foreshadowing[0],
    premise: initialHandedOffQuestPremise,
    constraints: "",
    campaignContext: "",
  });

  // Dynamic generator routes reuse this component during client navigation.
  // Read the URL only in the browser so static prerendering remains valid.
  afterNavigate(({ to }) => {
    const premise =
      slug === "plot-twist-generator"
        ? (to?.url.searchParams.get("questPremise") ?? "")
        : "";
    handedOffQuestPremise = premise;
    if (premise) plotTwist.premise = premise;
  });

  let villain = $state({
    genre: factionConfig.themes[0],
    tone: villainConfig.tones[0],
    threatScale: villainConfig.threatScales[0],
    archetype: villainConfig.archetypes[0],
    sympathy: villainConfig.sympathyLevels[0],
    worldRelation: villainConfig.worldRelations[0],
    campaignContext: "",
  });

  let world = $state({
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
  });

  let starSystem = $state<{
    systemType: string;
    genre: string;
    civilisationLevel: string;
    systemCharacter: string;
    scientificRealism: string;
    campaignContext: string;
  }>({
    systemType: starSystemConfig.systemTypes[0],
    genre: starSystemConfig.genres[0],
    civilisationLevel: starSystemConfig.civilisationLevels[0],
    systemCharacter: starSystemConfig.systemCharacters[0],
    scientificRealism: starSystemConfig.scientificRealism[0],
    campaignContext: "",
  });

  let alienRace = $state<{
    genre: string;
    generationMode: string;
    homeEnvironment: string;
    bodyPlan: string;
    psychology: string;
    socialOrganisation: string;
    technologyLevel: string;
    relationToOutsiders: string;
    campaignContext: string;
  }>({
    genre: alienRaceConfig.genres[0],
    generationMode: alienRaceConfig.generationModes[0],
    homeEnvironment: alienRaceConfig.homeEnvironments[0],
    bodyPlan: alienRaceConfig.bodyPlans[0],
    psychology: alienRaceConfig.psychologies[0],
    socialOrganisation: alienRaceConfig.socialOrganisations[0],
    technologyLevel: alienRaceConfig.technologyLevels[0],
    relationToOutsiders: alienRaceConfig.relationsToOutsiders[0],
    campaignContext: "",
  });

  let creature = $state<{
    genre: string;
    category: string;
    threatLevel: string;
    size: string;
    temperament: string;
    habitat: string;
    ecologicalRole: string;
    campaignContext: string;
  }>({
    genre: factionConfig.themes[0],
    category: creatureConfig.categories[0],
    threatLevel: creatureConfig.threatLevels[0],
    size: creatureConfig.sizes[0],
    temperament: creatureConfig.temperaments[0],
    habitat: creatureConfig.habitats[0],
    ecologicalRole: creatureConfig.ecologicalRoles[0],
    campaignContext: "",
  });

  // For themed URL: seed from hub slug. For flat URL: read localStorage.
  const _initStoredThemeId =
    (_initialUrlHubTheme ? HUB_SLUG_TO_THEME_ID[_initialUrlHubTheme] : null) ??
    (browser && SLUGS_USING_STORED_THEME.has(_initialSlug)
      ? localStorage.getItem("codex-cryptica-active-theme")
      : null);
  const _worldInitialTheme = _initialUrlHubTheme
    ? (SOCIAL_HUB_GENRE_TO_THEME[
        resolveHubGeneratorGenre(_initialUrlHubTheme) ?? ""
      ] ?? null)
    : null;

  let activeTheme = $state(
    _worldInitialTheme ||
      (_initStoredThemeId && themeIdToLabel[_initStoredThemeId]) ||
      factionConfig.themes[0],
  );
  let lastSlug = $state(_initialSlug);

  $effect(() => {
    if (slug !== lastSlug) {
      lastSlug = slug;
      pantheon.mode = slug === "pantheon-generator" ? "pantheon" : "single";
    }
  });

  $effect(() => {
    if (slug === "npc") npc.theme = activeTheme;
    else if (slug === "faction") faction.theme = activeTheme;
    else if (slug === "quest")
      quest.genre = themeToQuestGenre[activeTheme] ?? "Classic Fantasy";
    else if (slug === "puzzle") puzzle.genre = activeTheme;
    else if (slug === "encounter") encounter.genre = activeTheme;
    else if (slug === "council-vote") councilVote.genre = activeTheme;
    else if (slug === "secret-society") secretSociety.theme = activeTheme;
    else if (slug === "social-hub")
      activeTheme =
        SOCIAL_HUB_GENRE_TO_THEME[socialHub.genre] ?? "Classic Fantasy";
    else if (slug === "nation")
      activeTheme =
        SOCIAL_HUB_GENRE_TO_THEME[nation.genre] ?? "Classic Fantasy";
    else if (slug === "pantheon-generator" || slug === "god-generator")
      activeTheme = pantheon.genre;
    // Language genre is a fixed select using the theme labels directly
    // (Classic Fantasy, …), so it maps straight to activeTheme.
    else if (slug === "language-generator") activeTheme = language.genre;
    else if (slug === "news-sheet-generator")
      activeTheme =
        SOCIAL_HUB_GENRE_TO_THEME[newsSheet.genre] ?? "Classic Fantasy";
    else if (slug === "world") activeTheme = mapWorldGenreToTheme(world.genre);
    else if (slug === "star-system")
      activeTheme = mapStarSystemGenreToTheme(starSystem.genre);
    else if (slug === "alien-race")
      activeTheme = mapAlienRaceGenreToTheme(alienRace.genre);
    else if (slug === "dungeon-generator") dungeon.genre = activeTheme;
    else if (
      slug === "adventure-generator" ||
      slug === "adventure-idea-generator"
    )
      adventure.genre = activeTheme;
    else if (slug === "plot-twist-generator") plotTwist.genre = activeTheme;
    else if (slug === "bbeg-generator") villain.genre = activeTheme;
    else if (slug === "minor-magic-item") minorMagicItem.genre = activeTheme;
    else if (slug === "artifact-generator") artifact.genre = activeTheme;
    else if (slug === "creature") creature.genre = activeTheme;
  });

  // Consumes the "Develop this world" handoff from a generated star system
  // (#1935): a linked major body opens this page with its name, type, and
  // system context in the query string so the World Generator draft starts
  // pre-populated instead of blank. Cleans the URL after reading it.
  function applyPendingDevelopWorld(): void {
    const params = page.url.searchParams;
    const systemTitle = params.get("developSystem");
    const bodyName = params.get("developBody");
    if (!systemTitle && !bodyName) return;
    const bodyType = params.get("developBodyType");
    const context = params.get("developContext");
    world.dominantFeature = bodyName
      ? `${bodyName}${bodyType ? ` (${bodyType})` : ""} — ${context || `part of the ${systemTitle} system.`}`
      : (context ?? "");

    const cleanUrl = new URL(page.url);
    for (const key of [
      "developSystem",
      "developBody",
      "developBodyType",
      "developContext",
    ]) {
      cleanUrl.searchParams.delete(key);
    }
    goto(cleanUrl, { replaceState: true, noScroll: true, keepFocus: true });
  }

  onMount(() => {
    if (slug === "nation") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
      if (hubGenre) nation.genre = hubGenre;
      activeTheme =
        SOCIAL_HUB_GENRE_TO_THEME[nation.genre] ?? "Classic Fantasy";
      return;
    }
    if (slug === "social-hub") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
      if (hubGenre) socialHub.genre = hubGenre;
      activeTheme =
        SOCIAL_HUB_GENRE_TO_THEME[socialHub.genre] ?? "Classic Fantasy";
      return;
    }
    if (slug === "settlement") {
      const rawHubGenre = resolveHubGeneratorGenre(hubContext.theme);
      const hubGenre = rawHubGenre
        ? (SETTLEMENT_GENRE_FOR_HUB[rawHubGenre] ?? rawHubGenre)
        : null;
      if (hubGenre) {
        settlement.genre = hubGenre;
        const sizes =
          settlementConfig.sizesByGenre[hubGenre] ??
          settlementConfig.sizesByGenre["Fantasy"];
        settlement.size = sizes[2].name;
        settlement.environment = (settlementConfig.environmentsByGenre[
          hubGenre
        ] ?? settlementConfig.environmentsByGenre["Fantasy"])[0];
        settlement.primaryFunction = (settlementConfig.primaryFunctionsByGenre[
          hubGenre
        ] ?? settlementConfig.primaryFunctionsByGenre["Fantasy"])[0];
        settlement.tone = (settlementConfig.tonesByGenre[hubGenre] ??
          settlementConfig.tonesByGenre["Fantasy"])[0];
        settlement.mainTension = (settlementConfig.mainTensionsByGenre[
          hubGenre
        ] ?? settlementConfig.mainTensionsByGenre["Fantasy"])[0];
      }
      // Use raw hub genre (before settlement remapping) so e.g. Lancer hub
      // keeps Lancer theming even though settlement.genre is mapped to Sci-Fi.
      activeTheme =
        (rawHubGenre ? SOCIAL_HUB_GENRE_TO_THEME[rawHubGenre] : "") ||
        SOCIAL_HUB_GENRE_TO_THEME[settlement.genre] ||
        "Classic Fantasy";
      return;
    }
    if (slug === "vampire-clan") {
      activeTheme = "Vampire / Gothic Noir";
      return;
    }
    if (slug === "nomad-clan") {
      activeTheme = "Cyberpunk / Corporate";
      return;
    }
    if (slug === "pantheon-generator" || slug === "god-generator") {
      activeTheme = pantheon.genre;
      return;
    }
    if (slug === "dnd-npc" || slug === "fantasy-names" || slug === "tavern") {
      activeTheme = "Classic Fantasy";
      return;
    }
    if (slug === "ship-generator") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
      if (hubGenre) {
        const mapped = mapHubGenreToShipGenre(hubGenre);
        ship.genre = mapped;
        ship.role = (shipConfig.rolesByGenre[mapped] ??
          shipConfig.rolesByGenre["Sci-Fi"])[0];
      }
      activeTheme =
        (hubGenre ? SOCIAL_HUB_GENRE_TO_THEME[hubGenre] : "") ||
        "Sci-Fi / Space Opera";
      return;
    }
    if (slug === "world") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
      world.genre = worldGenreForHub(hubGenre);
      activeTheme = mapWorldGenreToTheme(world.genre);
      applyPendingDevelopWorld();
      return;
    }
    if (slug === "star-system") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
      if (
        hubGenre &&
        (starSystemConfig.genres as readonly string[]).includes(hubGenre)
      ) {
        starSystem.genre = hubGenre;
      }
      activeTheme = mapStarSystemGenreToTheme(starSystem.genre);
      return;
    }
    if (slug === "alien-race") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
      if (
        hubGenre &&
        (alienRaceConfig.genres as readonly string[]).includes(hubGenre)
      ) {
        alienRace.genre = hubGenre;
      }
      activeTheme = mapAlienRaceGenreToTheme(alienRace.genre);
      return;
    }
    if (slug === "news-sheet-generator") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
      if (hubGenre && newsSheetConfig.genres.includes(hubGenre)) {
        newsSheet.genre = hubGenre;
        newsSheet.publicationType = (newsSheetConfig.publicationTypesByGenre[
          hubGenre
        ] ?? newsSheetConfig.publicationTypesByGenre["Fantasy"])[0];
      }
      activeTheme =
        SOCIAL_HUB_GENRE_TO_THEME[newsSheet.genre] ?? "Classic Fantasy";
      return;
    }
    if (slug === "language-generator") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
      if (hubGenre) {
        // Language genres follow the theme labels (Classic Fantasy,
        // Cyberpunk / Corporate, …); the genre select only offers a fixed
        // list, so hubs without a matching language genre (e.g. Western,
        // Steampunk) are left on the default rather than an unselectable value.
        const mapped = SOCIAL_HUB_GENRE_TO_THEME[hubGenre] ?? hubGenre;
        if ((languageConfig.genres as string[]).includes(mapped)) {
          language.genre = mapped;
        }
      }
    }
    // For quest/npc/faction on flat URL: read localStorage.
    // On themed URL: urlHubTheme already seeded activeTheme above — skip.
    if (!urlHubTheme) {
      const stored = localStorage.getItem("codex-cryptica-active-theme");
      if (stored && themeIdToLabel[stored]) {
        activeTheme = themeIdToLabel[stored];
      }
    }
  });

  const GENERATE_HANDLERS: Record<
    ValidSlug,
    (useAI: boolean) => Promise<GeneratorOutput>
  > = {
    npc: (useAI) => generatorEngine.generateNPC({ ...npc, useAI }),
    settlement: (useAI) =>
      generatorEngine.generateSettlement({ ...settlement, useAI }),
    "magic-item": (useAI) =>
      generatorEngine.generateMagicItem({ ...magicItem, useAI }),
    "minor-magic-item": (useAI) =>
      generatorEngine.generateMinorMagicItem({
        ...minorMagicItem,
        genre: activeTheme,
        useAI,
        avoidNames: collectSessionNames(sessionHubStore.entities),
      }),
    "artifact-generator": (useAI) =>
      generatorEngine.generateArtifact({
        ...artifact,
        genre: activeTheme,
        useAI,
        avoidNames: collectSessionNames(sessionHubStore.entities),
      }),
    item: (useAI) => generatorEngine.generateMagicItem({ ...magicItem, useAI }),
    faction: (useAI) => generatorEngine.generateFaction({ ...faction, useAI }),
    quest: (useAI) => generatorEngine.generateQuestHook({ ...quest, useAI }),
    encounter: (useAI) =>
      generatorEngine.generateEncounter({ ...encounter, useAI }),
    puzzle: (useAI) => generatorEngine.generatePuzzle({ ...puzzle, useAI }),
    "council-vote": (useAI) =>
      generatorEngine.generateCouncilVote({ ...councilVote, useAI }),
    "secret-society": (useAI) =>
      generatorEngine.generateSecretSociety({ ...secretSociety, useAI }),
    tavern: (useAI) => generatorEngine.generateTavern({ ...tavern, useAI }),
    kingdom: (useAI) => generatorEngine.generateKingdom({ ...kingdom, useAI }),
    nation: (useAI) => generatorEngine.generateNation({ ...nation, useAI }),
    "social-hub": (useAI) =>
      generatorEngine.generateSocialHub({ ...socialHub, useAI }),
    "vampire-clan": (useAI) =>
      generatorEngine.generateVampireClan({ ...vampireClan, useAI }),
    "nomad-clan": (useAI) =>
      generatorEngine.generateNomadClan({ ...nomadClan, useAI }),
    names: (useAI) =>
      generatorEngine.generateNames({ ...names, theme: activeTheme, useAI }),
    "fantasy-names": (useAI) =>
      generatorEngine.generateNames({
        ...names,
        theme: "Classic Fantasy",
        useAI,
      }),
    "dnd-npc": (useAI) =>
      generatorEngine.generateNPC({
        ...dndNpc,
        includeDndQuickStats: true,
        useAI,
      }),
    "pantheon-generator": (useAI) =>
      generatorEngine.generatePantheon({ ...pantheon, useAI }),
    "god-generator": (useAI) =>
      generatorEngine.generatePantheon({ ...pantheon, useAI }),
    "ship-generator": (useAI) =>
      generatorEngine.generateShip({ ...ship, useAI }),
    "language-generator": (useAI) =>
      generatorEngine.generateLanguage({ ...language, useAI }),
    "news-sheet-generator": (useAI) =>
      generatorEngine.generateNewsSheet({ ...newsSheet, useAI }),
    "dungeon-generator": (useAI) =>
      generatorEngine.generateDungeon({
        ...dungeon,
        useAI,
        // Names already drafted this session, so the model does not fall back
        // on the same faction it invented for the last delve.
        avoidNames: collectSessionNames(sessionHubStore.entities),
        avoidTraits: collectSessionTraits(sessionHubStore.entities),
      }),
    "adventure-generator": (useAI) =>
      generatorEngine.generateAdventure({
        ...adventure,
        themeId: activeTheme,
        genre: activeTheme,
        useAI,
        avoidNames: collectSessionNames(sessionHubStore.entities),
      }),
    "adventure-idea-generator": (useAI) =>
      generatorEngine.generateAdventure({
        ...adventure,
        themeId: activeTheme,
        genre: activeTheme,
        useAI,
        avoidNames: collectSessionNames(sessionHubStore.entities),
      }),
    "plot-twist-generator": (useAI) =>
      generatorEngine.generatePlotTwist({
        ...plotTwist,
        premise: resolvePlotTwistPremiseForGeneration(
          plotTwist.premise,
          handedOffQuestPremise,
        ),
        themeId: activeTheme,
        genre: activeTheme,
        useAI,
      }),
    "bbeg-generator": (useAI) =>
      generatorEngine.generateVillain({
        ...villain,
        genre: activeTheme,
        useAI,
      }),
    world: (useAI) =>
      generatorEngine.generateWorld({
        ...world,
        useAI,
        // Keep world titles and named factions varied within the current session.
        avoidNames: collectSessionNames(sessionHubStore.entities),
      }),
    "star-system": (useAI) =>
      generatorEngine.generateStarSystem({
        ...starSystem,
        useAI,
        avoidNames: collectSessionNames(sessionHubStore.entities),
      }),
    "alien-race": (useAI) =>
      generatorEngine.generateAlienRace({
        ...alienRace,
        useAI,
        avoidNames: collectSessionNames(sessionHubStore.entities),
      }),
    creature: (useAI) =>
      generatorEngine.generateCreature({
        ...creature,
        useAI,
        avoidNames: collectSessionNames(sessionHubStore.entities),
      }),
  };

  async function generate({
    useAI,
    onPreview,
  }: {
    useAI: boolean;
    onPreview?: (preview: GeneratorOutput) => void;
  }) {
    const handler = GENERATE_HANDLERS[slug];
    if (!handler) throw new Error(`No generator implemented for slug: ${slug}`);
    const streamable = ![
      "council-vote",
      "dungeon-generator",
      "adventure-generator",
      "adventure-idea-generator",
      "language-generator",
    ].includes(slug);
    if (useAI && onPreview && streamable) {
      return generatorEngine.generateWithPreview(
        () => handler(useAI),
        (raw) => {
          const fields = extractPartialJsonStringFields(raw);
          onPreview({
            type: "note",
            title: fields.title || "Generating…",
            summary: fields.summary || "",
            content: fields.content || "",
            lore: fields.lore || "",
            labels: [],
            status: "draft",
          });
        },
      );
    }
    return handler(useAI);
  }

  function openPlotTwistFromQuest(draft: GeneratorOutput) {
    const params = new URLSearchParams({
      questPremise: buildPlotTwistPremise(draft),
    });
    void goto(resolve(`/generators/plot-twist-generator?${params}`));
  }

  const initialDraft = $derived(
    handedOffQuestPremise && slug === "plot-twist-generator"
      ? null
      : (initialDraftOverride ?? slugDrafts[slug] ?? null),
  );
</script>

<SEOGeneratorLayout
  pageTitle={meta.pageTitle}
  metaDescription={meta.metaDescription}
  introTitle={meta.introTitle}
  eyebrow={meta.eyebrow}
  introText={meta.introText}
  canonicalPath={meta.canonicalPath}
  ogImage={meta.ogImage}
  ogImageAlt={meta.ogImageAlt}
  keywords={meta.keywords ?? []}
  faqs={meta.faqs ?? []}
  relatedLinks={meta.relatedLinks ?? []}
  bind:theme={activeTheme}
  isThemeCustomizable={shouldSyncGeneratorTheme(slug)}
  supportsStreaming={![
    "council-vote",
    "dungeon-generator",
    "adventure-generator",
    "adventure-idea-generator",
    "language-generator",
  ].includes(slug)}
  {generate}
  {initialDraft}
  {backHref}
  {backLabel}
  variant={slug === "names" || slug === "fantasy-names" ? "names" : "default"}
  onGeneratePlotTwist={slug === "quest" ? openPlotTwistFromQuest : undefined}
>
  {#snippet formFields(trigger)}
    {#if slug === "npc"}
      <RPGNPCFormFields
        bind:theme={activeTheme}
        bind:ancestry={npc.ancestry}
        bind:role={npc.role}
        bind:alignment={npc.alignment}
        bind:campaignContext={npc.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "settlement"}
      <SettlementFormFields
        genre={settlement.genre}
        bind:size={settlement.size}
        bind:environment={settlement.environment}
        bind:primaryFunction={settlement.primaryFunction}
        bind:tone={settlement.tone}
        bind:mainTension={settlement.mainTension}
        bind:campaignContext={settlement.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "magic-item" || slug === "item"}
      <MagicItemFormFields
        bind:type={magicItem.type}
        bind:rarity={magicItem.rarity}
        bind:campaignContext={magicItem.campaignContext}
      />
    {:else if slug === "minor-magic-item"}
      <MinorMagicItemFormFields
        bind:theme={activeTheme}
        bind:form={minorMagicItem.form}
        bind:usageLimit={minorMagicItem.usageLimit}
        bind:utility={minorMagicItem.utility}
        bind:activation={minorMagicItem.activation}
        bind:quirkSeverity={minorMagicItem.quirkSeverity}
        bind:campaignContext={minorMagicItem.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "artifact-generator"}
      <ArtifactFormFields
        bind:theme={activeTheme}
        bind:form={artifact.form}
        bind:originEra={artifact.originEra}
        bind:powerTier={artifact.powerTier}
        bind:currentStatus={artifact.currentStatus}
        bind:curseCost={artifact.curseCost}
        bind:campaignContext={artifact.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "faction"}
      <FactionFormFields
        bind:theme={activeTheme}
        bind:type={faction.type}
        bind:scope={faction.scope}
        bind:alignment={faction.alignment}
        bind:campaignContext={faction.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "quest"}
      <QuestFormFields
        bind:theme={activeTheme}
        bind:tone={quest.tone}
        bind:scope={quest.scope}
        bind:locationType={quest.locationType}
        bind:threat={quest.threat}
        bind:twist={quest.twist}
        bind:reward={quest.reward}
        bind:campaignContext={quest.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "encounter"}
      <EncounterFormFields
        bind:theme={activeTheme}
        bind:encounterType={encounter.encounterType}
        bind:environment={encounter.environment}
        bind:threat={encounter.threat}
        bind:tone={encounter.tone}
        bind:context={encounter.context}
        onSurprise={trigger}
      />
    {:else if slug === "puzzle"}
      <PuzzleFormFields
        bind:genre={puzzle.genre}
        bind:purpose={puzzle.purpose}
        bind:complexity={puzzle.complexity}
        bind:style={puzzle.style}
        bind:partyLevel={puzzle.partyLevel}
        bind:playerCount={puzzle.playerCount}
        bind:capabilities={puzzle.capabilities}
        bind:participationStyle={puzzle.participationStyle}
        bind:failurePressure={puzzle.failurePressure}
        bind:system={puzzle.system}
        bind:downstreamConsequence={puzzle.downstreamConsequence}
        bind:campaignContext={puzzle.campaignContext}
        onGenreChange={(genre) => {
          // Custom genre text still flavors the output, but only established
          // CC themes can select a visual skin.
          if ((puzzleConfig.genres as readonly string[]).includes(genre)) {
            activeTheme = genre;
          }
        }}
        onSurprise={trigger}
      />
    {:else if slug === "council-vote"}
      <CouncilVoteFormFields
        bind:theme={activeTheme}
        bind:proposal={councilVote.proposal}
        bind:governingBodyType={councilVote.governingBodyType}
        bind:councilSize={councilVote.councilSize}
        bind:votingRule={councilVote.votingRule}
        bind:deadline={councilVote.deadline}
        bind:scope={councilVote.scope}
        bind:tone={councilVote.tone}
        bind:antagonistInfluence={councilVote.antagonistInfluence}
        bind:campaignContext={councilVote.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "secret-society"}
      <SecretSocietyFormFields
        bind:theme={activeTheme}
        bind:tone={secretSociety.tone}
        bind:scale={secretSociety.scale}
        bind:publicFace={secretSociety.publicFace}
        bind:dangerLevel={secretSociety.dangerLevel}
        bind:truthRelationship={secretSociety.truthRelationship}
        bind:campaignContext={secretSociety.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "kingdom"}
      <KingdomFormFields
        bind:polityType={kingdom.polityType}
        bind:governmentStyle={kingdom.governmentStyle}
        bind:geography={kingdom.geography}
        bind:scale={kingdom.scale}
        bind:conflictLevel={kingdom.conflictLevel}
        bind:magicLevel={kingdom.magicLevel}
        bind:campaignContext={kingdom.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "nation"}
      <NationFormFields
        bind:genre={nation.genre}
        bind:polityType={nation.polityType}
        bind:governmentStyle={nation.governmentStyle}
        bind:scale={nation.scale}
        bind:conflictLevel={nation.conflictLevel}
        bind:campaignContext={nation.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "social-hub"}
      <SocialHubFormFields
        bind:genre={socialHub.genre}
        bind:venueType={socialHub.venueType}
        bind:atmosphere={socialHub.atmosphere}
        bind:wealthLevel={socialHub.wealthLevel}
        bind:clientele={socialHub.clientele}
        bind:campaignContext={socialHub.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "tavern"}
      <TavernFormFields
        bind:type={tavern.type}
        bind:atmosphere={tavern.atmosphere}
        bind:settlementType={tavern.settlementType}
        bind:wealthLevel={tavern.wealthLevel}
        bind:clientele={tavern.clientele}
        bind:campaignContext={tavern.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "vampire-clan"}
      <VampireFormFields
        bind:archetype={vampireClan.archetype}
        bind:bloodline={vampireClan.bloodline}
        bind:feedingHabit={vampireClan.feedingHabit}
        bind:weakness={vampireClan.weakness}
        bind:campaignContext={vampireClan.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "nomad-clan"}
      <NomadClanFormFields
        bind:role={nomadClan.role}
        bind:tone={nomadClan.tone}
        bind:territory={nomadClan.territory}
        bind:conflict={nomadClan.conflict}
        bind:campaignContext={nomadClan.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "names"}
      <NameFormFields
        bind:theme={activeTheme}
        showTheme={true}
        bind:culture={names.culture}
        bind:gender={names.gender}
        bind:nameType={names.nameType}
        bind:context={names.context}
      />
    {:else if slug === "fantasy-names"}
      <NameFormFields
        bind:culture={names.culture}
        bind:gender={names.gender}
        bind:nameType={names.nameType}
        bind:context={names.context}
      />
    {:else if slug === "dnd-npc"}
      <NPCFormFields
        bind:race={dndNpc.race}
        bind:role={dndNpc.role}
        bind:alignment={dndNpc.alignment}
        bind:campaignContext={dndNpc.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "pantheon-generator" || slug === "god-generator"}
      <PantheonFormFields
        bind:mode={pantheon.mode}
        bind:genre={pantheon.genre}
        bind:divineType={pantheon.divineType}
        bind:domain={pantheon.domain}
        bind:tone={pantheon.tone}
        bind:worshippers={pantheon.worshippers}
        bind:conflictTheme={pantheon.conflictTheme}
        bind:size={pantheon.size}
        bind:width={pantheon.width}
        bind:campaignContext={pantheon.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "ship-generator"}
      <ShipFormFields
        bind:genre={ship.genre}
        bind:role={ship.role}
        bind:scale={ship.scale}
        bind:condition={ship.condition}
        bind:tone={ship.tone}
        bind:campaignContext={ship.campaignContext}
        onGenreChange={(genre) => {
          const mappedTheme = mapShipGenreToTheme(genre);
          if (mappedTheme) activeTheme = mappedTheme;
        }}
        onSurprise={trigger}
      />
    {:else if slug === "language-generator"}
      <LanguageFormFields
        bind:genre={language.genre}
        bind:tone={language.tone}
        bind:role={language.role}
        bind:structure={language.structure}
        bind:campaignContext={language.campaignContext}
        preserveGenreOnSurprise={Boolean(urlHubTheme)}
        onSurprise={trigger}
      />
    {:else if slug === "news-sheet-generator"}
      <NewsSheetFormFields
        bind:genre={newsSheet.genre}
        bind:publicationType={newsSheet.publicationType}
        bind:tone={newsSheet.tone}
        bind:bias={newsSheet.bias}
        bind:censorLevel={newsSheet.censorLevel}
        bind:hookDensity={newsSheet.hookDensity}
        bind:placeName={newsSheet.placeName}
        bind:headlineEvent={newsSheet.headlineEvent}
        bind:campaignContext={newsSheet.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "dungeon-generator"}
      <DungeonFormFields
        bind:theme={activeTheme}
        bind:purpose={dungeon.purpose}
        bind:currentState={dungeon.currentState}
        bind:scale={dungeon.scale}
        bind:campaignContext={dungeon.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "adventure-generator" || slug === "adventure-idea-generator"}
      <AdventureFormFields
        bind:theme={activeTheme}
        bind:archetype={adventure.archetype}
        bind:scale={adventure.scale}
        bind:tone={adventure.tone}
        bind:seed={adventure.seed}
        bind:campaignContext={adventure.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "plot-twist-generator"}
      <PlotTwistFormFields
        bind:theme={activeTheme}
        bind:twistType={plotTwist.twistType}
        bind:impact={plotTwist.impact}
        bind:timing={plotTwist.timing}
        bind:foreshadowing={plotTwist.foreshadowing}
        bind:premise={plotTwist.premise}
        bind:constraints={plotTwist.constraints}
        bind:campaignContext={plotTwist.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "bbeg-generator"}
      <VillainFormFields
        bind:theme={activeTheme}
        bind:tone={villain.tone}
        bind:threatScale={villain.threatScale}
        bind:archetype={villain.archetype}
        bind:sympathy={villain.sympathy}
        bind:worldRelation={villain.worldRelation}
        bind:campaignContext={villain.campaignContext}
        onSurprise={trigger}
      />
    {:else if slug === "world"}
      <WorldFormFields
        bind:worldType={world.worldType}
        bind:habitability={world.habitability}
        bind:civilisation={world.civilisation}
        bind:societalModel={world.societalModel}
        bind:worldTagOne={world.worldTagOne}
        bind:worldTagTwo={world.worldTagTwo}
        bind:genre={world.genre}
        bind:lancerWorldFrame={world.lancerWorldFrame}
        bind:campaignPressure={world.campaignPressure}
        bind:dominantFeature={world.dominantFeature}
        bind:campaignContext={world.campaignContext}
        onGenreChange={(genre) => {
          activeTheme = mapWorldGenreToTheme(genre);
        }}
        onSurprise={trigger}
      />
    {:else if slug === "star-system"}
      <StarSystemFormFields
        bind:systemType={starSystem.systemType}
        bind:genre={starSystem.genre}
        bind:civilisationLevel={starSystem.civilisationLevel}
        bind:systemCharacter={starSystem.systemCharacter}
        bind:scientificRealism={starSystem.scientificRealism}
        bind:campaignContext={starSystem.campaignContext}
        onGenreChange={(genre) => {
          activeTheme = mapStarSystemGenreToTheme(genre);
        }}
        onSurprise={trigger}
      />
    {:else if slug === "alien-race"}
      <AlienRaceFormFields
        bind:genre={alienRace.genre}
        bind:generationMode={alienRace.generationMode}
        bind:homeEnvironment={alienRace.homeEnvironment}
        bind:bodyPlan={alienRace.bodyPlan}
        bind:psychology={alienRace.psychology}
        bind:socialOrganisation={alienRace.socialOrganisation}
        bind:technologyLevel={alienRace.technologyLevel}
        bind:relationToOutsiders={alienRace.relationToOutsiders}
        bind:campaignContext={alienRace.campaignContext}
        onGenreChange={(genre) => {
          activeTheme = mapAlienRaceGenreToTheme(genre);
        }}
        onSurprise={trigger}
      />
    {:else if slug === "creature"}
      <CreatureFormFields
        bind:genre={creature.genre}
        bind:category={creature.category}
        bind:threatLevel={creature.threatLevel}
        bind:size={creature.size}
        bind:temperament={creature.temperament}
        bind:habitat={creature.habitat}
        bind:ecologicalRole={creature.ecologicalRole}
        bind:campaignContext={creature.campaignContext}
        onGenreChange={(genre) => {
          activeTheme = genre;
        }}
        onSurprise={trigger}
      />
    {/if}
  {/snippet}
</SEOGeneratorLayout>
