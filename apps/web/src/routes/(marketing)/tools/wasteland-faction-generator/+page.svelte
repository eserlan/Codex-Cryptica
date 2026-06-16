<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import {
    generatorEngine,
    factionConfig,
  } from "$lib/services/seo/generator-engine";

  let theme = $state("Post-Apocalyptic");
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
      href: "/tools/sci-fi-faction-generator",
      label: "Sci-fi faction generator",
    },
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
  ];

  const faqs = [
    {
      question: "What does the wasteland faction generator create?",
      answer:
        "It generates a complete post-apocalyptic faction — a raider gang, settlement council, scavenger crew, or doomsday cult — with a name, agenda, internal conflict, rival group, notable survivors, and a table-ready hook.",
    },
    {
      question: "Can I use it without an account?",
      answer:
        "Yes. Generate and copy faction notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
    },
    {
      question: "Which RPG systems does it work with?",
      answer:
        "It's system-agnostic. Use it for Fallout-style games, Mutant: Year Zero, Apocalypse World, or any wasteland survival campaign.",
    },
    {
      question: "Can I aim the faction at my current campaign?",
      answer:
        "Yes. Add optional campaign context — a settlement, scarce resource, rival warlord, or looming threat — and the generator will fit the faction to your table rather than producing a generic result.",
    },
    {
      question: "How does saving a generated faction work?",
      answer:
        "Clicking 'Save to Codex' stores the draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, and campaign notes.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/wasteland-faction-generator"
  pageTitle="Wasteland Faction Generator | Free Post-Apocalyptic Raider & Settlement Tool | Codex Cryptica"
  metaDescription="Generate post-apocalyptic factions, raider gangs, settlements, and doomsday cults. Create agendas, rival groups, survivors, and plot hooks for Fallout-style and wasteland campaigns."
  eyebrow="Wasteland Faction Generator"
  introTitle="Wasteland Faction Generator"
  introText="Create survivor factions with agendas, internal conflicts, rivals, and table-ready hooks. Works without login, then imports into your local Codex vault."
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
