<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import {
    generatorEngine,
    factionConfig,
  } from "$lib/services/seo/generator-engine";

  let theme = $state("Sci-Fi / Space Opera");
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
    { href: "/tools/faction-generator", label: "Faction generator" },
    {
      href: "/tools/cyberpunk-megacorp-generator",
      label: "Cyberpunk megacorp generator",
    },
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
  ];

  const faqs = [
    {
      question: "What does the sci-fi faction generator create?",
      answer:
        "It generates a complete sci-fi faction — a galactic empire, megacorp, rebel cell, or trade federation — with a name, agenda, internal conflict, rival power, notable NPCs, and a table-ready mission hook.",
    },
    {
      question: "Can I use it without an account?",
      answer:
        "Yes. Generate and copy faction notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
    },
    {
      question: "Which RPG systems does it work with?",
      answer:
        "It's system-agnostic. Use it for Stars Without Number, Traveller, Starfinder, Lancer, or any space opera campaign.",
    },
    {
      question: "Can I aim the faction at my current campaign?",
      answer:
        "Yes. Add optional campaign context — a star system, rival fleet, ongoing war, or contested resource — and the generator will fit the faction to your table rather than producing a generic result.",
    },
    {
      question: "How does saving a generated faction work?",
      answer:
        "Clicking 'Save to Codex' stores the draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, and campaign notes.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/sci-fi-faction-generator"
  pageTitle="Sci-Fi Faction Generator | Free Space Opera Empire & Fleet Tool | Codex Cryptica"
  metaDescription="Generate sci-fi factions, galactic empires, rebel cells, and trade federations. Create agendas, rival powers, notable NPCs, and mission hooks for Traveller, Stars Without Number, and more."
  eyebrow="Sci-Fi Faction Generator"
  introTitle="Sci-Fi Faction Generator"
  introText="Create star-spanning factions with agendas, internal conflicts, rivals, and table-ready hooks. Works without login, then imports into your local Codex vault."
  worldTheme="scifi"
  isThemeCustomizable={true}
  bind:theme
  {relatedLinks}
  {faqs}
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
