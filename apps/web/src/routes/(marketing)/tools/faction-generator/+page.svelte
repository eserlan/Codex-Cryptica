<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import {
    generatorEngine,
    factionConfig,
  } from "$lib/services/seo/generator-engine";

  let theme = $state(factionConfig.themes[0]);
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
  pageTitle="Faction Generator | Free Fantasy RPG Organization Tool | Codex Cryptica"
  metaDescription="Generate fantasy RPG factions with goals, internal conflict, rival groups, notable NPCs, and adventure hooks. Copy the draft or save it into your local campaign vault."
  eyebrow="Faction Generator"
  introTitle="Faction Generator"
  introText="Create a campaign-ready fantasy faction with a public face, agenda, internal conflict, rival group, notable NPCs, and adventure hook. Works without login, then saves into your local Codex Cryptica campaign vault."
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
