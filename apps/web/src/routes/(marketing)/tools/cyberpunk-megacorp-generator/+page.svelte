<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import {
    generatorEngine,
    factionConfig,
  } from "$lib/services/seo/generator-engine";

  let theme = $state("Cyberpunk / Corporate");
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
      question: "What does the cyberpunk megacorp generator create?",
      answer:
        "It generates a complete cyberpunk corporation — a megacorp, syndicate, or fixer crew — with a name, public face, hidden agenda, internal conflict, rival corp, notable executives, and a table-ready run hook.",
    },
    {
      question: "Can I use it without an account?",
      answer:
        "Yes. Generate and copy corp notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
    },
    {
      question: "Which RPG systems does it work with?",
      answer:
        "It's system-agnostic. Use it for Cyberpunk RED, Shadowrun, The Sprawl, or any near-future dystopian setting.",
    },
    {
      question: "Can I aim the corp at my current campaign?",
      answer:
        "Yes. Add optional campaign context — a sprawl district, rival fixer, ongoing corporate war, or piece of stolen tech — and the generator will fit the megacorp to your table.",
    },
    {
      question: "How does saving a generated corp work?",
      answer:
        "Clicking 'Save to Codex' stores the draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, and campaign notes.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/cyberpunk-megacorp-generator"
  pageTitle="Cyberpunk Megacorp Generator | Free RPG Corporation & Syndicate Tool | Codex Cryptica"
  metaDescription="Generate cyberpunk megacorps, corporate syndicates, and fixer crews. Create agendas, executives, rival corps, and run hooks for Cyberpunk RED, Shadowrun, and more."
  eyebrow="Cyberpunk Megacorp Generator"
  introTitle="Cyberpunk Megacorp Generator"
  introText="Create corporations with hidden agendas, boardroom conflicts, rival corps, and table-ready run hooks. Works without login, then imports into your local Codex vault."
  worldTheme="cyberpunk"
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
