<script lang="ts">
  import { onMount } from "svelte";
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import {
    generatorEngine,
    factionConfig,
  } from "$lib/services/seo/generator-engine";

  let theme = $state(factionConfig.themes[0]);

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
      theme = reverseThemeMap[activeTheme];
    }
  });
  let type = $state(factionConfig.types[0]);
  let scope = $state(factionConfig.scopes[1]);
  let alignment = $state(factionConfig.alignments[0]);
  let campaignContext = $state("");

  async function generate({ useAI }: { useAI: boolean }) {
    return generatorEngine.generateFaction({
      theme,
      type,
      scope,
      alignment,
      campaignContext,
      useAI,
    });
  }

  const relatedLinks = [
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
    { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
    { href: "/free-rpg-campaign-manager", label: "Free RPG campaign manager" },
  ];

  const faqs = [
    {
      question: "What does the faction generator create?",
      answer:
        "It creates a fantasy RPG faction with a name, type, operating scope, public face, agenda, internal conflict, rival faction, notable NPCs, and adventure hook.",
    },
    {
      question: "Can I use the faction generator without an account?",
      answer:
        "Yes. You can generate and copy faction notes on the public page without logging in, then save the draft into a browser-local Codex Cryptica vault.",
    },
    {
      question: "Can I aim the faction at my current campaign?",
      answer:
        "Yes. Add optional campaign context such as a city, war, villain, frontier, or political tension, and the generated faction will include a campaign fit section.",
    },
    {
      question: "How does saving a generated faction work?",
      answer:
        "The page stores the generated faction draft in browser localStorage and opens the app, where it imports as a Faction entity in your local vault.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/faction-generator"
  pageTitle="RPG Faction Generator | Fantasy Guilds, Cyberpunk Megacorps & Vampire Clans | Codex Cryptica"
  metaDescription="Generate detailed RPG factions. Perfect as a fantasy guild generator, cyberpunk megacorp creator, sci-fi empire builder, or gothic vampire clan generator. Save drafts to your vault."
  eyebrow="Faction Generator"
  introTitle="RPG Faction Generator"
  introText="Forge campaign-ready organizations across any genre. Use it as a fantasy guild generator, cyberpunk megacorp creator, sci-fi empire builder, or gothic vampire clan generator with distinct agendas, conflicts, and NPCs. Works instantly without login, then imports to your local campaign database."
  {relatedLinks}
  {faqs}
  {theme}
  {generate}
>
  {#snippet formFields()}
    <FactionFormFields
      bind:theme
      bind:type
      bind:scope
      bind:alignment
      bind:campaignContext
    />
  {/snippet}
</SEOGeneratorLayout>
