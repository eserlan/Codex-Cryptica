<script lang="ts">
  import { onMount } from "svelte";
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import RPGNPCFormFields from "$lib/components/seo/RPGNPCFormFields.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import QuestFormFields from "$lib/components/seo/QuestFormFields.svelte";
  import TavernFormFields from "$lib/components/seo/TavernFormFields.svelte";
  import SocialHubFormFields from "$lib/components/seo/SocialHubFormFields.svelte";
  import {
    generatorEngine,
    npcThemeConfig,
    settlementConfig,
    magicItemConfig,
    factionConfig,
    questConfig,
    tavernConfig,
    socialHubConfig,
    themeIdToLabel,
    type GeneratorOutput,
  } from "$lib/services/seo/generator-engine";

  let { data } = $props();

  // Per-slug SEO metadata (#1)
  const slugMeta = {
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
    },
    settlement: {
      pageTitle:
        "Settlement Generator | Free Fantasy RPG Town Tool | Codex Cryptica",
      metaDescription:
        "Generate fantasy RPG settlements with economy, geography, power structure, and adventure hooks. Copy the draft or save it into your local campaign vault.",
      introTitle: "Settlement Generator",
      eyebrow: "Settlement Generator",
      introText:
        "Create a campaign-ready fantasy settlement with an economy, power structure, notable locations, and adventure hook. Works without login.",
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
  } as const;

  const meta = $derived(slugMeta[data.slug]);

  // State grouped per generator type (#6)
  let npc = $state({
    theme: factionConfig.themes[0],
    ancestry: npcThemeConfig.ancestries[factionConfig.themes[0]][0],
    role: npcThemeConfig.roles[factionConfig.themes[0]][0],
    alignment: npcThemeConfig.moralities[factionConfig.themes[0]][0].id,
    campaignContext: "",
  });

  let settlement = $state({
    size: settlementConfig.sizes[2].name,
    economy: settlementConfig.economies[0],
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
    type: tavernConfig.types[0],
    atmosphere: tavernConfig.atmospheres[0],
    settlementType: tavernConfig.settlementTypes[1],
    wealthLevel: tavernConfig.wealthLevels[2],
    clientele: tavernConfig.clienteles[4],
    campaignContext: "",
  });

  let socialHub = $state({
    genre: socialHubConfig.genres[0],
    venueType: socialHubConfig.venueTypesByGenre[socialHubConfig.genres[0]][0],
    atmosphere: socialHubConfig.atmospheres[0],
    wealthLevel: socialHubConfig.wealthLevels[2],
    clientele: socialHubConfig.clientelesByGenre[socialHubConfig.genres[0]][0],
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
    Western: "Modern Conspiracy",
  };

  // Unified theme binding target — synced to the active generator's state
  let activeTheme = $state(factionConfig.themes[0]);

  $effect(() => {
    if (data.slug === "npc") npc.theme = activeTheme;
    else if (data.slug === "faction") faction.theme = activeTheme;
    else if (data.slug === "social-hub")
      activeTheme = socialHubGenreToTheme[socialHub.genre] ?? "Classic Fantasy";
  });

  onMount(() => {
    const stored = localStorage.getItem("codex-cryptica-active-theme");
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
    } else if (data.slug === "social-hub") {
      return generatorEngine.generateSocialHub({ ...socialHub, useAI });
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
      title: "Oakhaven",
      summary: "A quiet timber outpost nestled in the Great Forest.",
      content:
        "### Geography\nSurrounded by ancient oaks and swift-running creeks.\n\n### Economy\nLumber, rare forest herbs, and hunting trade.",
      lore: "",
      labels: ["rpg-settlement", "Outpost", "Forest"],
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
  };

  const initialDraft = $derived(slugDrafts[data.slug]);

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
</script>

<SEOGeneratorLayout
  pageTitle={meta.pageTitle}
  metaDescription={meta.metaDescription}
  introTitle={meta.introTitle}
  eyebrow={meta.eyebrow}
  introText={meta.introText}
  canonicalPath={meta.canonicalPath}
  bind:theme={activeTheme}
  isThemeCustomizable={data.slug === "faction" ||
    data.slug === "npc" ||
    data.slug === "social-hub"}
  {generate}
  {initialDraft}
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
      <div class="flex flex-col gap-1.5">
        <label for="size-select" class={labelClass}>Settlement Size</label>
        <select
          id="size-select"
          bind:value={settlement.size}
          class={selectClass}
        >
          {#each settlementConfig.sizes as s (s.name)}
            <option value={s.name}>{s.name} ({s.range})</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="economy-select" class={labelClass}>Primary Economy</label>
        <select
          id="economy-select"
          bind:value={settlement.economy}
          class={selectClass}
        >
          {#each settlementConfig.economies as e (e)}
            <option value={e}>{e}</option>
          {/each}
        </select>
      </div>
    {:else if data.slug === "magic-item" || data.slug === "item"}
      <div class="flex flex-col gap-1.5">
        <label for="item-type-select" class={labelClass}>Item Type</label>
        <select
          id="item-type-select"
          bind:value={magicItem.type}
          class={selectClass}
        >
          {#each magicItemConfig.types as t (t)}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="rarity-select" class={labelClass}>Rarity</label>
        <select
          id="rarity-select"
          bind:value={magicItem.rarity}
          class={selectClass}
        >
          {#each magicItemConfig.rarities as r (r)}
            <option value={r}>{r}</option>
          {/each}
        </select>
      </div>
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
        bind:genre={quest.genre}
        bind:tone={quest.tone}
        bind:scope={quest.scope}
        bind:locationType={quest.locationType}
        bind:threat={quest.threat}
        bind:twist={quest.twist}
        bind:reward={quest.reward}
        bind:campaignContext={quest.campaignContext}
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
    {/if}
  {/snippet}
</SEOGeneratorLayout>
