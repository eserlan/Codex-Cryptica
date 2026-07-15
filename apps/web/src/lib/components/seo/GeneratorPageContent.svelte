<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { browser } from "$app/environment";
  import { hubContext } from "$lib/stores/hub-context.svelte";
  import SEOGeneratorLayout from "./SEOGeneratorLayout.svelte";
  import RPGNPCFormFields from "$lib/components/seo/RPGNPCFormFields.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import QuestFormFields from "$lib/components/seo/QuestFormFields.svelte";
  import SettlementFormFields from "$lib/components/seo/SettlementFormFields.svelte";
  import MagicItemFormFields from "$lib/components/seo/MagicItemFormFields.svelte";
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
  import {
    generatorEngine,
    npcConfig,
    npcThemeConfig,
    settlementConfig,
    magicItemConfig,
    factionConfig,
    questConfig,
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
    themeIdToLabel,
    themeToQuestGenre,
    type GeneratorOutput,
  } from "$lib/services/seo/generator-engine";
  import { type ValidSlug, slugMeta } from "./generator-page-meta";
  import { slugDrafts } from "./generator-page-drafts";
  import {
    HUB_LABELS,
    HUB_SLUG_TO_THEME_ID,
    SETTLEMENT_GENRE_FOR_HUB,
    SLUGS_USING_STORED_THEME,
    SOCIAL_HUB_GENRE_TO_THEME,
    mapHubGenreToShipGenre,
    mapShipGenreToTheme,
    resolveHubGeneratorGenre,
    shouldSyncGeneratorTheme,
  } from "./generator-theme-maps";

  let {
    slug,
    urlHubTheme = undefined,
  }: { slug: ValidSlug; urlHubTheme?: string } = $props();

  // When arriving via a themed URL, seed hubContext immediately so derived
  // values (backHref, initialHubGenre) compute correctly on first render.
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

  const meta = $derived(slugMeta[slug]);

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

  // For themed URL: seed from hub slug. For flat URL: read localStorage.
  const _initialSlug = untrack(() => slug);
  const _initStoredThemeId =
    (_initialUrlHubTheme ? HUB_SLUG_TO_THEME_ID[_initialUrlHubTheme] : null) ??
    (browser && SLUGS_USING_STORED_THEME.has(_initialSlug)
      ? localStorage.getItem("codex-cryptica-active-theme")
      : null);

  let activeTheme = $state(
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
  });

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
    item: (useAI) => generatorEngine.generateMagicItem({ ...magicItem, useAI }),
    faction: (useAI) => generatorEngine.generateFaction({ ...faction, useAI }),
    quest: (useAI) => generatorEngine.generateQuestHook({ ...quest, useAI }),
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
  };

  async function generate({ useAI }: { useAI: boolean }) {
    const handler = GENERATE_HANDLERS[slug];
    if (!handler) throw new Error(`No generator implemented for slug: ${slug}`);
    return handler(useAI);
  }

  const initialDraft = $derived(slugDrafts[slug] ?? null);
</script>

<SEOGeneratorLayout
  pageTitle={meta.pageTitle}
  metaDescription={meta.metaDescription}
  introTitle={meta.introTitle}
  eyebrow={meta.eyebrow}
  introText={meta.introText}
  canonicalPath={meta.canonicalPath}
  faqs={meta.faqs ?? []}
  relatedLinks={meta.relatedLinks ?? []}
  bind:theme={activeTheme}
  isThemeCustomizable={shouldSyncGeneratorTheme(slug)}
  {generate}
  {initialDraft}
  {backHref}
  {backLabel}
  variant={slug === "names" || slug === "fantasy-names" ? "names" : "default"}
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
    {/if}
  {/snippet}
</SEOGeneratorLayout>
