<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { hubContext } from "$lib/stores/hub-context.svelte";
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";
  import RPGNPCFormFields from "$lib/components/seo/RPGNPCFormFields.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import QuestFormFields from "$lib/components/seo/QuestFormFields.svelte";
  import TavernFormFields from "$lib/components/seo/TavernFormFields.svelte";
  import SocialHubFormFields from "$lib/components/seo/SocialHubFormFields.svelte";
  import KingdomFormFields from "$lib/components/seo/KingdomFormFields.svelte";
  import NationFormFields from "$lib/components/seo/NationFormFields.svelte";
  import VampireFormFields from "$lib/components/seo/VampireFormFields.svelte";
  import NameFormFields from "$lib/components/seo/NameFormFields.svelte";
  import NPCFormFields from "$lib/components/seo/NPCFormFields.svelte";
  import PantheonFormFields from "$lib/components/seo/PantheonFormFields.svelte";
  import {
    resolveHubGeneratorGenre,
    shouldSyncGeneratorTheme,
  } from "./generator-theme";
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
    nameGeneratorConfig,
    pantheonConfig,
    themeIdToLabel,
    themeToQuestGenre,
    pickFrom,
    type GeneratorOutput,
  } from "$lib/services/seo/generator-engine";

  let { data } = $props();

  const HUB_LABELS: Record<string, string> = {
    fantasy: "Fantasy Hub",
    cyberpunk: "Cyberpunk Hub",
    "sci-fi": "Sci-Fi Hub",
    "post-apocalyptic": "Post-Apocalyptic Hub",
    modern: "Modern Hub",
    vampire: "Vampire Hub",
      western: "Western Hub",
      steampunk: "Steampunk Hub",
  };

  const backHref = $derived(
    hubContext.theme && HUB_LABELS[hubContext.theme]
      ? `/generators/${hubContext.theme}`
      : "/generators",
  );
  const backLabel = $derived(
    (hubContext.theme && HUB_LABELS[hubContext.theme]) ?? "All generators",
  );
  const initialHubGenre = resolveHubGeneratorGenre(hubContext.theme);

  type SlugMetaEntry = {
    pageTitle: string;
    metaDescription: string;
    introTitle: string;
    eyebrow: string;
    introText: string;
    canonicalPath: string;
    faqs?: { question: string; answer: string }[];
    relatedLinks?: { href: string; label: string }[];
  };

  // Per-slug SEO metadata (#1)
  const slugMeta: Record<typeof data.slug, SlugMetaEntry> = {
    npc: {
      pageTitle:
        "RPG NPC Generator | Fantasy, Cyberpunk, Gothic & Sci-Fi Characters | Codex Cryptica",
      metaDescription:
        "Generate NPCs across any genre — fantasy, cyberpunk, gothic horror, sci-fi, modern conspiracy, and post-apocalyptic. Each NPC has a secret, faction tie, and table-ready hook.",
      introTitle: "RPG NPC Generator",
      eyebrow: "RPG NPC Generator",
      introText:
        "Create NPCs across any genre with secrets, faction ties, and table-ready hooks. Works without login, then imports into your local Codex vault.",
      canonicalPath: "/generators/npc",
      faqs: [
        {
          question: "Does the D&D NPC generator require an account?",
          answer:
            "No. Generate and copy NPC notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
        },
        {
          question: "What does the RPG NPC generator create?",
          answer:
            "It generates a complete NPC with a name, ancestry, role, personality traits, a hidden secret, motivation, faction connection, and a table-ready GM hook — structured for immediate use.",
        },
        {
          question: "Can I use it outside D&D?",
          answer:
            "Yes. The output works for D&D, Pathfinder, OSR games, cyberpunk, and any genre. The generator is system-agnostic.",
        },
        {
          question: "How does saving a generated NPC work?",
          answer:
            "Clicking 'Save to Codex' stores the NPC draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Character entity, ready to link to factions, locations, and campaign notes.",
        },
      ],
      relatedLinks: [
        { href: "/solutions/ai-gm-assistant", label: "AI GM assistant" },
        {
          href: "/free-rpg-campaign-manager",
          label: "Free RPG campaign manager",
        },
      ],
    },
    settlement: {
      pageTitle:
        "Settlement Generator | RPG Inhabited Place Creator | Codex Cryptica",
      metaDescription:
        "Generate campaign-ready settlements, districts, colonies, and communities for any RPG genre. Set the function, environment, tone, and tension — get a place with a reason to exist and a problem worth solving.",
      introTitle: "Settlement Generator",
      eyebrow: "Settlement Generator",
      introText:
        "Generate an inhabited place that answers three questions: why does it exist, who really controls it, and what is about to go wrong. Works for any genre — fantasy, cyberpunk, sci-fi, horror, post-apocalyptic, and more.",
      canonicalPath: "/generators/settlement",
    },
    "magic-item": {
      pageTitle:
        "Magic Item Generator | Free Fantasy RPG Loot Tool | Codex Cryptica",
      metaDescription:
        "Generate fantasy RPG magic items with lore, abilities, quirks, and campaign hooks. Copy the draft or save it into your local campaign vault.",
      introTitle: "Magic Item Generator",
      eyebrow: "Magic Item Generator",
      introText:
        "Create a campaign-ready magic item with lore, abilities, and quirks. Works without login.",
      canonicalPath: "/generators/magic-item",
    },
    faction: {
      pageTitle:
        "RPG Faction Generator | Fantasy Guilds, Cyberpunk Megacorps & Vampire Clans | Codex Cryptica",
      metaDescription:
        "Generate detailed RPG factions. Perfect as a fantasy guild generator, cyberpunk megacorp creator, sci-fi empire builder, or gothic vampire clan generator. Save drafts to your vault.",
      introTitle: "RPG Faction Generator",
      eyebrow: "Faction Generator",
      introText:
        "Forge campaign-ready organizations across any genre. Use it as a fantasy guild generator, cyberpunk megacorp creator, sci-fi empire builder, or gothic vampire clan generator with distinct agendas, conflicts, and NPCs.",
      canonicalPath: "/generators/faction",
      faqs: [
        {
          question: "What does the faction generator create?",
          answer:
            "It generates a complete RPG faction across any genre — fantasy guilds, cyberpunk megacorps, vampire covens, space federations, and more. Each result includes a name, agenda, internal conflict, rival faction, notable NPCs, and a ready-to-use GM hook.",
        },
        {
          question: "Can I use it without an account?",
          answer:
            "Yes. Generate and copy faction notes on this page without logging in. When you're ready, save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
        },
        {
          question: "Can I aim the faction at my current campaign?",
          answer:
            "Yes. Add optional campaign context — a location, villain, ongoing conflict, or political tension — and the generator will fit the faction to your table rather than producing a generic result.",
        },
        {
          question: "How does saving a generated faction work?",
          answer:
            "Clicking 'Save to Codex' stores the faction draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, and campaign notes.",
        },
      ],
      relatedLinks: [
        { href: "/tools/dnd-npc-generator", label: "D&D NPC Generator" },
        { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
      ],
    },
    quest: {
      pageTitle:
        "RPG Quest Hook Generator | Free Fantasy & Cyberpunk Adventure Tool | Codex Cryptica",
      metaDescription:
        "Generate detailed RPG quest hooks with complications, twists, rewards, and key NPCs. Perfect for fantasy, cyberpunk, or sci-fi tabletop campaigns.",
      introTitle: "RPG Quest Generator",
      eyebrow: "Quest Hook Generator",
      introText:
        "Create campaign-ready adventure seeds and quest hooks. Set the genre, tone, threat, and twist, then import into your local vault.",
      canonicalPath: "/generators/quest",
    },
    item: {
      pageTitle:
        "RPG Loot & Magic Item Generator | Free Fantasy Equipment Tool | Codex Cryptica",
      metaDescription:
        "Generate custom RPG loot, magic items, weapons, and relics. Features customizable rarities, properties, and lore backstories.",
      introTitle: "RPG Item Generator",
      eyebrow: "Item Generator",
      introText:
        "Design magic items, weaponry, or rare relics with customizable properties and history. Works without login.",
      canonicalPath: "/generators/item",
    },
    "social-hub": {
      pageTitle:
        "Social Hub Generator | RPG Venue Generator for Any Genre | Codex Cryptica",
      metaDescription:
        "Generate a genre-agnostic social gathering location — from cyberpunk noodle bars to western saloons to fantasy inns. Works without login. Save into your Codex Cryptica campaign vault.",
      introTitle: "Social Hub Generator",
      eyebrow: "Social Hub Generator",
      introText:
        "Create a campaign-ready social venue for any genre. Pick your setting, venue type, and atmosphere — get a named location with regulars, rumours, and a hidden problem.",
      canonicalPath: "/generators/social-hub",
    },
    kingdom: {
      pageTitle:
        "Kingdom Generator | Free Fantasy Realm & Empire Creator | Codex Cryptica",
      metaDescription:
        "Generate a detailed fantasy kingdom or empire with ruler, factions, geography, conflict, and adventure hooks. Works without login. Save into your Codex Cryptica campaign vault.",
      introTitle: "Kingdom Generator",
      eyebrow: "Kingdom Generator",
      introText:
        "Create a campaign-ready fantasy realm with a ruler, major factions, internal tensions, and adventure hooks. Works without login, then imports into your local vault.",
      canonicalPath: "/generators/kingdom",
    },
    nation: {
      pageTitle:
        "Nation Generator | RPG Political Entity Creator for Any Genre | Codex Cryptica",
      metaDescription:
        "Generate a political entity for any RPG genre — fantasy kingdoms, cyberpunk megacorp-states, sci-fi federations, post-apoc warlord territories. Works without login.",
      introTitle: "Nation Generator",
      eyebrow: "Nation Generator",
      introText:
        "Create a campaign-ready political entity for any genre. Pick your setting and polity type — get a named state with power blocs, internal tensions, and adventure hooks.",
      canonicalPath: "/generators/nation",
    },
    tavern: {
      pageTitle:
        "Tavern Generator | Free RPG Inn & Alehouse Creator | Codex Cryptica",
      metaDescription:
        "Generate a detailed RPG tavern or inn with owner, patrons, rumours, trouble, and adventure hooks. Works without login. Save into your Codex Cryptica campaign vault.",
      introTitle: "Tavern Generator",
      eyebrow: "Tavern Generator",
      introText:
        "Create a campaign-ready tavern with atmosphere, owner, notable patrons, rumours, and a hidden problem. Works without login, then imports into your local vault.",
      canonicalPath: "/generators/tavern",
    },
    "vampire-clan": {
      pageTitle:
        "Vampire Clan Generator | Free RPG Bloodline & Coven Tool | Codex Cryptica",
      metaDescription:
        "Create detailed vampire clans, bloodlines, occult covens, and secret societies. Generate history, feeding habits, weaknesses, and plot hooks for your campaign.",
      introTitle: "Vampire Clan Generator",
      eyebrow: "Vampire Clan Generator",
      introText:
        "Create undead factions with bloodlines, feeding habits, dark agendas, and table-ready hooks. Works without login, then imports into your local Codex vault.",
      canonicalPath: "/generators/vampire-clan",
    },
    names: {
      pageTitle:
        "RPG Name Generator | Fantasy, Cyberpunk, Gothic & Sci-Fi Names | Codex Cryptica",
      metaDescription:
        "Generate names for characters, places, factions, and items across any genre — fantasy, cyberpunk, gothic horror, sci-fi, and more. Free for any tabletop RPG.",
      introTitle: "RPG Name Generator",
      eyebrow: "Name Generator",
      introText:
        "Generate names for characters, places, factions, and items in any genre. Pick a vibe and culture, steer with optional context, and copy your favourites.",
      canonicalPath: "/generators/names",
    },
    "fantasy-names": {
      pageTitle:
        "Fantasy Name Generator | Free RPG & Worldbuilding Name Tool | Codex Cryptica",
      metaDescription:
        "Generate fantasy names for characters, places, factions, and items across ten cultural styles. Free for D&D, Pathfinder, worldbuilding, and any tabletop RPG.",
      introTitle: "Fantasy Name Generator",
      eyebrow: "Fantasy Name Generator",
      introText:
        "Generate fantasy names for characters, places, factions, and items across ten cultural styles. Works without login — copy your favourites for your campaign.",
      canonicalPath: "/generators/fantasy-names",
    },
    "dnd-npc": {
      pageTitle:
        "D&D NPC Generator | Free Fantasy Character Creator | Codex Cryptica",
      metaDescription:
        "Create a fantasy NPC with ancestry, role, personality, secret, faction tie, and plot hook. Works without login. Save into your Codex Cryptica campaign vault.",
      introTitle: "D&D NPC Generator",
      eyebrow: "D&D NPC Generator",
      introText:
        "Create a fantasy NPC with ancestry, role, personality traits, a hidden secret, and a table-ready GM hook. Works without login, then imports into your local vault.",
      canonicalPath: "/generators/dnd-npc",
    },
    "pantheon-generator": {
      pageTitle:
        "RPG Pantheon Generator | Free Deity & Divine Assembly Tool | Codex Cryptica",
      metaDescription:
        "Generate detailed RPG pantheons with alliances, rivalries, myths, and hooks. Save drafts directly to your Codex campaign vault.",
      introTitle: "RPG Pantheon Generator",
      eyebrow: "Pantheon Generator",
      introText:
        "Create a campaign-ready pantheon with alliances, cosmic conflicts, and detailed member deities. Works without login, then imports into your local vault.",
      canonicalPath: "/generators/pantheon-generator",
    },
    "god-generator": {
      pageTitle:
        "RPG God & Deity Generator | Free Tabletop Worldbuilding Tool | Codex Cryptica",
      metaDescription:
        "Generate fantasy RPG deities, saints, spirits, and demons with domains, taboos, symbols, and hooks. Save drafts directly to your campaign vault.",
      introTitle: "RPG God & Deity Generator",
      eyebrow: "Deity Generator",
      introText:
        "Design detailed single deities, ancestors, or abstract forces with portfolio, rituals, and myths. Works without login, then imports into your local vault.",
      canonicalPath: "/generators/god-generator",
    },
  };

  const meta = $derived(slugMeta[data.slug]);

  // State grouped per generator type (#6)
  let npc = $state({
    theme: factionConfig.themes[0],
    ancestry: npcThemeConfig.ancestries[factionConfig.themes[0]][0],
    role: npcThemeConfig.roles[factionConfig.themes[0]][0],
    alignment: npcThemeConfig.moralities[factionConfig.themes[0]][0].id,
    campaignContext: "",
  });

  const settlementGenre = initialHubGenre ?? "Fantasy";
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
    type: magicItemConfig.types[0],
    rarity: magicItemConfig.rarities[1],
  });

  let faction = $state({
    theme: factionConfig.themes[0],
    type: factionConfig.types[0],
    scope: factionConfig.scopes[1],
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
    mode: (data.slug === "pantheon-generator" ? "pantheon" : "single") as
      | "single"
      | "pantheon",
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

  const socialHubGenreToTheme: Record<string, string> = {
    Fantasy: "Classic Fantasy",
    "Dark Fantasy": "Vampire / Gothic Noir",
    Pirate: "Classic Fantasy",
    Cyberpunk: "Cyberpunk / Corporate",
    "Sci-Fi": "Sci-Fi / Space Opera",
    Modern: "Modern Conspiracy",
    Horror: "Vampire / Gothic Noir",
    "Post-Apocalyptic": "Post-Apocalyptic",
    Western: "Western / Frontier",
    Steampunk: "Steampunk",
  };

  // Read localStorage at init time for slugs that respect the stored theme.
  // This prevents SEOGeneratorLayout's $effect from overriding the hub's theme
  // before onMount can read localStorage and correct activeTheme.
  const SLUGS_USING_STORED_THEME = new Set([
    "npc",
    "faction",
    "quest",
    "settlement",
    "magic-item",
    "item",
    "names",
  ]);
  const _initStoredThemeId =
    browser && SLUGS_USING_STORED_THEME.has(data.slug)
      ? localStorage.getItem("codex-cryptica-active-theme")
      : null;

  // Unified theme binding target — synced to the active generator's state
  let activeTheme = $state(
    (_initStoredThemeId && themeIdToLabel[_initStoredThemeId]) ||
      factionConfig.themes[0],
  );
  let lastSlug = $state(data.slug);

  $effect(() => {
    if (data.slug !== lastSlug) {
      lastSlug = data.slug;
      pantheon.mode =
        data.slug === "pantheon-generator" ? "pantheon" : "single";
    }
  });

  $effect(() => {
    if (data.slug === "npc") npc.theme = activeTheme;
    else if (data.slug === "faction") faction.theme = activeTheme;
    else if (data.slug === "quest")
      quest.genre = themeToQuestGenre[activeTheme] ?? "Classic Fantasy";
    else if (data.slug === "social-hub")
      activeTheme = socialHubGenreToTheme[socialHub.genre] ?? "Classic Fantasy";
    else if (data.slug === "nation")
      activeTheme = socialHubGenreToTheme[nation.genre] ?? "Classic Fantasy";
    else if (
      data.slug === "pantheon-generator" ||
      data.slug === "god-generator"
    )
      activeTheme = pantheon.genre;
  });

  onMount(() => {
    // Genre-driven generators derive their theme from the genre dropdown, not localStorage
    if (data.slug === "nation") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
      if (hubGenre) nation.genre = hubGenre;
      activeTheme = socialHubGenreToTheme[nation.genre] ?? "Classic Fantasy";
      return;
    }
    if (data.slug === "social-hub") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
      if (hubGenre) socialHub.genre = hubGenre;
      activeTheme = socialHubGenreToTheme[socialHub.genre] ?? "Classic Fantasy";
      return;
    }
    if (data.slug === "settlement") {
      const hubGenre = resolveHubGeneratorGenre(hubContext.theme);
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
      activeTheme =
        socialHubGenreToTheme[settlement.genre] ?? "Classic Fantasy";
      return;
    }
    if (data.slug === "vampire-clan") {
      activeTheme = "Vampire / Gothic Noir";
      return;
    }
    if (data.slug === "pantheon-generator" || data.slug === "god-generator") {
      activeTheme = pantheon.genre;
      return;
    }
    if (
      data.slug === "dnd-npc" ||
      data.slug === "fantasy-names" ||
      data.slug === "tavern"
    ) {
      activeTheme = "Classic Fantasy";
      return;
    }
    const stored = localStorage.getItem("codex-cryptica-active-theme");
    // quest, npc, faction all fall through to read stored theme
    if (stored && themeIdToLabel[stored]) {
      activeTheme = themeIdToLabel[stored];
    }
  });

  async function generate({ useAI }: { useAI: boolean }) {
    if (data.slug === "npc") {
      return generatorEngine.generateNPC({ ...npc, useAI });
    } else if (data.slug === "settlement") {
      return generatorEngine.generateSettlement({ ...settlement, useAI });
    } else if (data.slug === "magic-item" || data.slug === "item") {
      return generatorEngine.generateMagicItem({ ...magicItem, useAI });
    } else if (data.slug === "faction") {
      return generatorEngine.generateFaction({ ...faction, useAI });
    } else if (data.slug === "quest") {
      return generatorEngine.generateQuestHook({ ...quest, useAI });
    } else if (data.slug === "tavern") {
      return generatorEngine.generateTavern({ ...tavern, useAI });
    } else if (data.slug === "kingdom") {
      return generatorEngine.generateKingdom({ ...kingdom, useAI });
    } else if (data.slug === "nation") {
      return generatorEngine.generateNation({ ...nation, useAI });
    } else if (data.slug === "social-hub") {
      return generatorEngine.generateSocialHub({ ...socialHub, useAI });
    } else if (data.slug === "vampire-clan") {
      return generatorEngine.generateVampireClan({ ...vampireClan, useAI });
    } else if (data.slug === "names") {
      return generatorEngine.generateNames({
        ...names,
        theme: activeTheme,
        useAI,
      });
    } else if (data.slug === "fantasy-names") {
      return generatorEngine.generateNames({
        ...names,
        theme: "Classic Fantasy",
        useAI,
      });
    } else if (data.slug === "dnd-npc") {
      return generatorEngine.generateNPC({
        ...dndNpc,
        includeDndQuickStats: true,
        useAI,
      });
    } else if (
      data.slug === "pantheon-generator" ||
      data.slug === "god-generator"
    ) {
      return generatorEngine.generatePantheon({ ...pantheon, useAI });
    } else {
      throw new Error(`No generator implemented for slug: ${data.slug}`);
    }
  }

  const slugDrafts: Record<string, GeneratorOutput> = {
    npc: {
      type: "character",
      title: "Zephyrus Gray",
      summary: "A mysterious rogue with a dark past.",
      content:
        "### Description\nZephyrus wears a hooded leather cloak and speaks in low whispers. He operates in the shadow of the docks.\n\n### Secret\nHe carries a silver key that opens a vault he refuses to talk about.",
      lore: "",
      labels: ["rpg-npc", "Rogue", "Mysterious"],
      status: "draft",
    },
    settlement: {
      type: "location",
      title: "Cinderveil",
      summary: "A fortified mining town built into a dormant volcanic ridge.",
      content:
        "### Geography\nPerched above a network of ash-grey tunnels, the town's foundries run day and night.\n\n### Economy\nOre refining, black-market gems, and a militia that charges tolls on three mountain passes.",
      lore: "",
      labels: ["rpg-settlement", "Mining", "Fortified"],
      status: "draft",
    },
    "magic-item": {
      type: "item",
      title: "Frostbite Blade",
      summary: "A longsword etched with cold runes.",
      content:
        "### Properties\nDeals additional cold damage on a critical strike and glows with a faint blue light in the presence of undead.\n\n### Lore\nForged in the northern wastes by the frost smiths of old.",
      lore: "",
      labels: ["rpg-item", "Sword", "Runes"],
      status: "draft",
    },
    faction: {
      type: "faction",
      title: "The Iron Syndicate",
      summary:
        "A powerful merchants' guild that controls the city's trade routes.",
      content:
        "### Operations\nThey maintain a private army to secure their investments and lobby local lords.\n\n### Secret agenda\nThey seek to overthrow the local duke to install a puppet senate.",
      lore: "",
      labels: ["rpg-faction", "Guild", "Mercantile"],
      status: "draft",
    },
    kingdom: {
      type: "faction",
      title: "The Kingdom of Vaelthorn",
      summary:
        "A mid-sized kingdom held together by old oaths and a ruler who is running out of allies.",
      content:
        "### The Realm\nVaelthorn spans three river valleys and two mountain passes. Its capital has stood for four centuries, though the walls have not been tested in a generation.\n\n### Government & Power\nKing Aldren rules through a council of six noble houses — three of which are quietly negotiating a change of leadership.",
      lore: "",
      labels: ["rpg-kingdom", "kingdom-generator", "imported-draft"],
      status: "draft",
    },
    nation: {
      type: "faction",
      title: "Axiom Industrial Authority",
      summary:
        "A cyberpunk megacorp-state that controls three districts and is aggressively expanding into a fourth.",
      content:
        "### The State\nAxiom controls food, water, and network access across its territory. Citizens are employees. Dissent is a performance review issue.\n\n### Power Structure\nCEO-Governor Reyes holds executive authority but the board is restless.",
      lore: "",
      labels: ["rpg-nation", "nation-generator", "imported-draft"],
      status: "draft",
    },
    "social-hub": {
      type: "location",
      title: "Reyes' Noodle Hole",
      summary:
        "A cramped cyberpunk noodle bar where fixers and off-duty security share bad ramen and worse secrets.",
      content:
        "### The Place\nA steam-filled counter joint wedged under a transit overpass. Neon flickers, the broth is good, the owner asks nothing.\n\n### The Trouble\nThe owner is sitting on surveillance footage that would get someone very powerful arrested.",
      lore: "",
      labels: ["rpg-location", "social-hub-generator", "imported-draft"],
      status: "draft",
    },
    tavern: {
      type: "location",
      title: "The Copper Boar",
      summary:
        "A rowdy crossroads tavern where travellers and locals share rumours and old grudges.",
      content:
        "### The Place\nA low-ceilinged roadside inn with smoke-stained rafters and a fire that runs all year. The house ale is cheap and reliable.\n\n### The Trouble\nThe owner owes a debt to someone who has just arrived in town.",
      lore: "",
      labels: ["rpg-location", "tavern-generator", "imported-draft"],
      status: "draft",
    },
    "vampire-clan": {
      type: "faction",
      title: "House of Thorn",
      summary:
        "An aristocratic bloodline that controls the city's banking houses from behind a veil of old money and older secrets.",
      content:
        "### Heritage\nAristocratic lineage feeding on the upper-class elite. The clan operates through mortal proxies in finance, law, and the clergy.\n\n### Clan Weakness\nSilver and consecrated ground erode their power — they avoid both with practised care.",
      lore: "",
      labels: ["rpg-faction", "vampire-clan", "imported-draft"],
      status: "draft",
    },
    names: {
      type: "character",
      title: "Generic Fantasy Names — Person",
      summary: "",
      content:
        "These names blend rolling vowels with grounded, archaic surnames — built for a classic secondary-world fantasy setting.\n\n- **Iridian Vespera**: A nomadic chronicler known for weaving history into rhythmic poetry.\n- **Bramwell Hallowfist**: A retired siege engineer who now runs a quiet borderlands apothecary.\n- **Sylvara Quint**: A sharp-witted investigator who recovers stolen celestial artifacts.\n- **Mordantus Krell**: A reclusive scholar obsessed with sunken underwater civilizations.\n- **Fennelora Brightspire**: A charismatic diplomat whose family has brokered peace for generations.",
      lore: "### Culture\nDrawn from a composite culture where old trade-guild roots and nomadic mountain tongues have merged.\n\n### Style\nMulti-syllabic, rolling sounds over sharp consonants — elegant and historied rather than rugged.\n\n### Usage Suggestions\nUse the ornate first names for scholars and nobles, and the compound surnames as hooks players can ask about.",
      labels: ["fantasy-name", "name-generator", "imported-draft"],
      status: "draft",
    },
    "fantasy-names": {
      type: "character",
      title: "Generic Fantasy Names — Person",
      summary: "",
      content:
        "These names blend rolling vowels with grounded, archaic surnames — built for a classic secondary-world fantasy setting.\n\n- **Iridian Vespera**: A nomadic chronicler known for weaving history into rhythmic poetry.\n- **Bramwell Hallowfist**: A retired siege engineer who now runs a quiet borderlands apothecary.\n- **Sylvara Quint**: A sharp-witted investigator who recovers stolen celestial artifacts.\n- **Mordantus Krell**: A reclusive scholar obsessed with sunken underwater civilizations.\n- **Fennelora Brightspire**: A charismatic diplomat whose family has brokered peace for generations.",
      lore: "### Culture\nDrawn from a composite culture where old trade-guild roots and nomadic mountain tongues have merged.\n\n### Style\nMulti-syllabic, rolling sounds over sharp consonants — elegant and historied rather than rugged.\n\n### Usage Suggestions\nUse the ornate first names for scholars and nobles, and the compound surnames as hooks players can ask about.",
      labels: ["fantasy-name", "name-generator", "imported-draft"],
      status: "draft",
    },
    "dnd-npc": {
      type: "character",
      title: "Elowen Ashford",
      summary: "A half-elf rogue with a talent for leverage.",
      content:
        "### Description\nElowen moves through taverns and guild halls with the easy confidence of someone who knows where the exits are. Her smile is genuine — mostly.\n\n### Secret\nShe carries a stolen signet ring that proves a local noble's son committed a crime the family has paid to bury.",
      lore: "",
      labels: ["rpg-npc", "Rogue", "Half-Elf"],
      status: "draft",
    },
    "pantheon-generator": {
      type: "faction",
      title: "The Silent Maw",
      summary: "A small pantheon of forgotten deities.",
      content:
        "### Origin & Dogma\nThe Silent Maw is a collection of ancient entities who hold sway over the dark and forgotten corners of the world.\n\n### Divine Portfolio\nTheir tenets demand absolute silence and devotion to secrets.",
      lore: "### At a Glance\n- **Pantheon Name**: The Silent Maw\n- **Conflict Theme**: Cosmic Balance\n- **Worshippers**: Mystery Cult",
      labels: ["rpg-pantheon", "pantheon-generator", "imported-draft"],
      status: "draft",
    },
    "god-generator": {
      type: "character",
      title: "Oros, the Light of Dawn",
      summary: "A deity of the rising sun and new beginnings.",
      content:
        "### Deity Description\nOros is depicted as a radiant figure carrying a shield of polished bronze. Their altars face the east.",
      lore: "### At a Glance\n- **Deity Type**: God\n- **Primary Domain**: Light\n- **Worshippers**: State Religion",
      labels: ["rpg-deity", "deity-generator", "imported-draft"],
      status: "draft",
    },
  };

  const initialDraft = $derived(slugDrafts[data.slug]);

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
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
  isThemeCustomizable={shouldSyncGeneratorTheme(data.slug)}
  {generate}
  {initialDraft}
  {backHref}
  {backLabel}
  variant={data.slug === "names" || data.slug === "fantasy-names"
    ? "names"
    : "default"}
>
  {#snippet formFields(trigger)}
    {#if data.slug === "npc"}
      <RPGNPCFormFields
        bind:theme={activeTheme}
        bind:ancestry={npc.ancestry}
        bind:role={npc.role}
        bind:alignment={npc.alignment}
        bind:campaignContext={npc.campaignContext}
        onSurprise={trigger}
      />
    {:else if data.slug === "settlement"}
      <SelectWithCustomOption
        id="size-select"
        label="Scale"
        bind:value={settlement.size}
        choices={(
          settlementConfig.sizesByGenre[settlement.genre] ??
          settlementConfig.sizesByGenre["Fantasy"]
        ).map((s: { name: string; range: string }) => ({
          value: s.name,
          label: `${s.name} (${s.range})`,
        }))}
        className="flex flex-col gap-1.5"
        {labelClass}
        inputClass={selectClass}
        customPlaceholder="Enter a custom scale"
      />

      <SelectWithCustomOption
        id="environment-select"
        label="Environment"
        bind:value={settlement.environment}
        choices={(
          settlementConfig.environmentsByGenre[settlement.genre] ??
          settlementConfig.environmentsByGenre["Fantasy"]
        ).map((e: string) => ({
          value: e,
          label: e,
        }))}
        className="flex flex-col gap-1.5"
        {labelClass}
        inputClass={selectClass}
        customPlaceholder="Enter a custom environment"
      />

      <SelectWithCustomOption
        id="function-select"
        label="Primary Function"
        bind:value={settlement.primaryFunction}
        choices={(
          settlementConfig.primaryFunctionsByGenre[settlement.genre] ??
          settlementConfig.primaryFunctionsByGenre["Fantasy"]
        ).map((f: string) => ({
          value: f,
          label: f,
        }))}
        className="flex flex-col gap-1.5"
        {labelClass}
        inputClass={selectClass}
        customPlaceholder="Enter a custom function"
      />

      <SelectWithCustomOption
        id="tone-select"
        label="Tone"
        bind:value={settlement.tone}
        choices={(
          settlementConfig.tonesByGenre[settlement.genre] ??
          settlementConfig.tonesByGenre["Fantasy"]
        ).map((t: string) => ({
          value: t,
          label: t,
        }))}
        className="flex flex-col gap-1.5"
        {labelClass}
        inputClass={selectClass}
        customPlaceholder="Enter a custom tone"
      />

      <SelectWithCustomOption
        id="tension-select"
        label="Dominant Tension"
        bind:value={settlement.mainTension}
        choices={(
          settlementConfig.mainTensionsByGenre[settlement.genre] ??
          settlementConfig.mainTensionsByGenre["Fantasy"]
        ).map((t: string) => ({
          value: t,
          label: t,
        }))}
        className="flex flex-col gap-1.5"
        {labelClass}
        inputClass={selectClass}
        customPlaceholder="Enter a custom tension"
      />

      <div class="flex flex-col gap-1.5">
        <label for="settlement-context" class={labelClass}
          >Campaign context (optional)</label
        >
        <textarea
          id="settlement-context"
          bind:value={settlement.campaignContext}
          maxlength="240"
          rows="4"
          aria-describedby="settlement-context-help"
          class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
        ></textarea>
        <p
          id="settlement-context-help"
          class="text-[10px] text-theme-text/60 leading-relaxed"
        >
          Add a region name, nearby factions, or ongoing conflict to aim the
          result at your world.
        </p>
      </div>

      <div class="pt-2 flex justify-end">
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
          title="Randomize all options and generate a draft from the result"
          onclick={() => {
            const g = settlement.genre;
            const sizes =
              settlementConfig.sizesByGenre[g] ??
              settlementConfig.sizesByGenre["Fantasy"];
            settlement.size = pickFrom(sizes).name;
            settlement.environment = pickFrom(
              settlementConfig.environmentsByGenre[g] ??
                settlementConfig.environmentsByGenre["Fantasy"],
            );
            settlement.primaryFunction = pickFrom(
              settlementConfig.primaryFunctionsByGenre[g] ??
                settlementConfig.primaryFunctionsByGenre["Fantasy"],
            );
            settlement.tone = pickFrom(
              settlementConfig.tonesByGenre[g] ??
                settlementConfig.tonesByGenre["Fantasy"],
            );
            settlement.mainTension = pickFrom(
              settlementConfig.mainTensionsByGenre[g] ??
                settlementConfig.mainTensionsByGenre["Fantasy"],
            );
            trigger();
          }}
        >
          <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
          Surprise Me
        </button>
      </div>
    {:else if data.slug === "magic-item" || data.slug === "item"}
      <SelectWithCustomOption
        id="item-type-select"
        label="Item Type"
        bind:value={magicItem.type}
        choices={magicItemConfig.types.map((t: string) => ({
          value: t,
          label: t,
        }))}
        className="flex flex-col gap-1.5"
        {labelClass}
        inputClass={selectClass}
        customPlaceholder="Enter a custom item type"
      />

      <SelectWithCustomOption
        id="rarity-select"
        label="Rarity"
        bind:value={magicItem.rarity}
        choices={magicItemConfig.rarities.map((r: string) => ({
          value: r,
          label: r,
        }))}
        className="flex flex-col gap-1.5"
        {labelClass}
        inputClass={selectClass}
        customPlaceholder="Enter a custom rarity"
      />
    {:else if data.slug === "faction"}
      <FactionFormFields
        bind:theme={activeTheme}
        bind:type={faction.type}
        bind:scope={faction.scope}
        bind:alignment={faction.alignment}
        bind:campaignContext={faction.campaignContext}
        onSurprise={trigger}
      />
    {:else if data.slug === "quest"}
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
    {:else if data.slug === "kingdom"}
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
    {:else if data.slug === "nation"}
      <NationFormFields
        bind:genre={nation.genre}
        bind:polityType={nation.polityType}
        bind:governmentStyle={nation.governmentStyle}
        bind:scale={nation.scale}
        bind:conflictLevel={nation.conflictLevel}
        bind:campaignContext={nation.campaignContext}
        onSurprise={trigger}
      />
    {:else if data.slug === "social-hub"}
      <SocialHubFormFields
        bind:genre={socialHub.genre}
        bind:venueType={socialHub.venueType}
        bind:atmosphere={socialHub.atmosphere}
        bind:wealthLevel={socialHub.wealthLevel}
        bind:clientele={socialHub.clientele}
        bind:campaignContext={socialHub.campaignContext}
        onSurprise={trigger}
      />
    {:else if data.slug === "tavern"}
      <TavernFormFields
        bind:type={tavern.type}
        bind:atmosphere={tavern.atmosphere}
        bind:settlementType={tavern.settlementType}
        bind:wealthLevel={tavern.wealthLevel}
        bind:clientele={tavern.clientele}
        bind:campaignContext={tavern.campaignContext}
        onSurprise={trigger}
      />
    {:else if data.slug === "vampire-clan"}
      <VampireFormFields
        bind:archetype={vampireClan.archetype}
        bind:bloodline={vampireClan.bloodline}
        bind:feedingHabit={vampireClan.feedingHabit}
        bind:weakness={vampireClan.weakness}
        bind:campaignContext={vampireClan.campaignContext}
        onSurprise={trigger}
      />
    {:else if data.slug === "names"}
      <NameFormFields
        bind:theme={activeTheme}
        showTheme={true}
        bind:culture={names.culture}
        bind:gender={names.gender}
        bind:nameType={names.nameType}
        bind:context={names.context}
      />
    {:else if data.slug === "fantasy-names"}
      <NameFormFields
        bind:culture={names.culture}
        bind:gender={names.gender}
        bind:nameType={names.nameType}
        bind:context={names.context}
      />
    {:else if data.slug === "dnd-npc"}
      <NPCFormFields
        bind:race={dndNpc.race}
        bind:role={dndNpc.role}
        bind:alignment={dndNpc.alignment}
        bind:campaignContext={dndNpc.campaignContext}
        onSurprise={trigger}
      />
    {:else if data.slug === "pantheon-generator" || data.slug === "god-generator"}
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
    {/if}
  {/snippet}
</SEOGeneratorLayout>
