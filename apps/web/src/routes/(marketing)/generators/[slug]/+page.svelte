<script lang="ts">
  import { onMount } from "svelte";
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import NPCFormFields from "$lib/components/seo/NPCFormFields.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import {
    generatorEngine,
    npcConfig,
    settlementConfig,
    magicItemConfig,
    factionConfig,
  } from "$lib/services/seo/generator-engine";

  let { data } = $props();

  // Per-slug SEO metadata (#1)
  const slugMeta = {
    npc: {
      pageTitle:
        "D&D NPC Generator | Free Fantasy RPG Character Tool | Codex Cryptica",
      metaDescription:
        "Generate D&D NPCs with ancestry, role, personality, secret, motivation, faction connection, and plot hook. Copy the draft or save it into your local campaign vault.",
      introTitle: "D&D NPC Generator",
      eyebrow: "D&D NPC Generator",
      introText:
        "Create a ready-to-run fantasy NPC with structured GM notes, a secret, faction tie, and plot hook. Works without login.",
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
  } as const;

  const meta = slugMeta[data.slug];

  // State grouped per generator type (#6)
  let npc = $state({
    race: npcConfig.races[0],
    role: npcConfig.roles[0],
    alignment: npcConfig.alignments[0],
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

  const reverseThemeMap: Record<string, string> = {
    fantasy: "Classic Fantasy",
    fantasy_dark: "Classic Fantasy",
    cyberpunk: "Cyberpunk / Corporate",
    cyberpunk_light: "Cyberpunk / Corporate",
    horror: "Vampire / Gothic Noir",
    horror_light: "Vampire / Gothic Noir",
    scifi: "Sci-Fi / Space Opera",
    scifi_light: "Sci-Fi / Space Opera",
    modern: "Modern Conspiracy",
    modern_dark: "Modern Conspiracy",
    apocalyptic: "Post-Apocalyptic",
    apocalyptic_light: "Post-Apocalyptic",
  };

  onMount(() => {
    const activeTheme = localStorage.getItem("codex-cryptica-active-theme");
    if (activeTheme && reverseThemeMap[activeTheme]) {
      faction.theme = reverseThemeMap[activeTheme];
    }
  });

  let triggerGen = $state<(() => void) | undefined>(undefined);

  async function generate({ useAI }: { useAI: boolean }) {
    if (data.slug === "npc") {
      return generatorEngine.generateNPC({ ...npc, useAI });
    } else if (data.slug === "settlement") {
      return generatorEngine.generateSettlement({ ...settlement, useAI });
    } else if (data.slug === "magic-item") {
      return generatorEngine.generateMagicItem({ ...magicItem, useAI });
    } else if (data.slug === "faction") {
      return generatorEngine.generateFaction({ ...faction, useAI });
    } else {
      throw new Error(`No generator implemented for slug: ${data.slug}`);
    }
  }

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
  theme={data.slug === "faction" ? faction.theme : "Classic Fantasy"}
  {generate}
  bind:triggerGenerate={triggerGen}
>
  {#snippet formFields()}
    {#if data.slug === "npc"}
      <NPCFormFields
        bind:race={npc.race}
        bind:role={npc.role}
        bind:alignment={npc.alignment}
        bind:campaignContext={npc.campaignContext}
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
    {:else if data.slug === "magic-item"}
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
        bind:theme={faction.theme}
        bind:type={faction.type}
        bind:scope={faction.scope}
        bind:alignment={faction.alignment}
        bind:campaignContext={faction.campaignContext}
        onSurprise={triggerGen}
      />
    {/if}
  {/snippet}
</SEOGeneratorLayout>
