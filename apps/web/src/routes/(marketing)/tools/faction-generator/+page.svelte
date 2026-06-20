<script lang="ts">
  import { onMount } from "svelte";
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import {
    generatorEngine,
    factionConfig,
    themeIdToLabel,
  } from "$lib/services/seo/generator-engine";

  let theme = $state(factionConfig.themes[0]);

  onMount(() => {
    const stored = localStorage.getItem("codex-cryptica-active-theme");
    if (stored && themeIdToLabel[stored]) {
      theme = themeIdToLabel[stored];
    }
  });
  let type = $state(factionConfig.typesByTheme["Classic Fantasy"][0]);
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
      question: "How do I change the genre or tone?",
      answer:
        "Use the 'Choose a vibe' selector in the left panel. Switching between Classic Fantasy, Cyberpunk, Gothic Noir, Sci-Fi, Modern Conspiracy, and Post-Apocalyptic changes the faction's language, naming, and setting details throughout.",
    },
    {
      question: "How does saving a generated faction work?",
      answer:
        "Clicking 'Save to Codex' stores the faction draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, and campaign notes.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/faction-generator"
  pageTitle="RPG Faction Generator | Fantasy Guilds, Cyberpunk Megacorps & Vampire Clans | Codex Cryptica"
  metaDescription="Generate detailed RPG factions. Perfect as a fantasy guild generator, cyberpunk megacorp creator, sci-fi empire builder, or gothic vampire clan generator. Save drafts to your vault."
  eyebrow="Faction Generator"
  introTitle="RPG Faction Generator"
  introText="Create organisations with agendas, conflicts, NPCs, and table-ready hooks. Works without login, then imports into your local Codex vault."
  {relatedLinks}
  {faqs}
  bind:theme
  isThemeCustomizable={true}
  {generate}
>
  {#snippet formFields(trigger)}
    <FactionFormFields
      bind:theme
      bind:type
      bind:scope
      bind:alignment
      bind:campaignContext
      onSurprise={trigger}
    />
  {/snippet}
</SEOGeneratorLayout>
