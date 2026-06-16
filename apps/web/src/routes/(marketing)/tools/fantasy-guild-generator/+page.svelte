<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import {
    generatorEngine,
    factionConfig,
  } from "$lib/services/seo/generator-engine";

  let theme = $state("Classic Fantasy");
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
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
    { href: "/tools/fantasy-name-generator", label: "Fantasy name generator" },
  ];

  const faqs = [
    {
      question: "What does the fantasy guild generator create?",
      answer:
        "It generates a complete fantasy guild or order — merchant guild, temple order, arcane circle, or thieves' guild — with a name, agenda, internal conflict, rival faction, notable NPCs, and a table-ready adventure hook.",
    },
    {
      question: "Can I use it without an account?",
      answer:
        "Yes. Generate and copy guild notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
    },
    {
      question: "Which RPG systems does it work with?",
      answer:
        "It's system-agnostic. Use it for D&D 5e, Pathfinder, Old-School Essentials, or any classic fantasy campaign.",
    },
    {
      question: "Can I aim the guild at my current campaign?",
      answer:
        "Yes. Add optional campaign context — a city, patron, rival guild, or ongoing conflict — and the generator will fit the guild to your table rather than producing a generic result.",
    },
    {
      question: "How does saving a generated guild work?",
      answer:
        "Clicking 'Save to Codex' stores the draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, and campaign notes.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/fantasy-guild-generator"
  pageTitle="Fantasy Guild Generator | Free D&D Guild, Order & Faction Tool | Codex Cryptica"
  metaDescription="Generate fantasy guilds, temple orders, arcane circles, and thieves' guilds. Create agendas, rival factions, notable NPCs, and adventure hooks for D&D, Pathfinder, and more."
  eyebrow="Fantasy Guild Generator"
  introTitle="Fantasy Guild Generator"
  introText="Create guilds and orders with agendas, internal conflicts, rivals, and table-ready hooks. Works without login, then imports into your local Codex vault."
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
