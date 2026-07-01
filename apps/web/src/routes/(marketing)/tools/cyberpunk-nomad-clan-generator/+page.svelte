<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import NomadClanFormFields from "$lib/components/seo/NomadClanFormFields.svelte";
  import {
    generatorEngine,
    nomadClanConfig,
  } from "$lib/services/seo/generator-engine";

  let role = $state(nomadClanConfig.roles[0]);
  let tone = $state(nomadClanConfig.tones[0]);
  let territory = $state(nomadClanConfig.territories[0]);
  let conflict = $state(nomadClanConfig.conflicts[0]);
  let campaignContext = $state("");

  async function generate({ useAI }: { useAI: boolean }) {
    return generatorEngine.generateNomadClan({
      role,
      tone,
      territory,
      conflict,
      campaignContext,
      useAI,
    });
  }

  const relatedLinks = [
    { href: "/tools/faction-generator", label: "Faction generator" },
    { href: "/tools/vampire-clan-generator", label: "Vampire clan generator" },
    { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
  ];

  const faqs = [
    {
      question: "What does the nomad clan generator create?",
      answer:
        "It generates a complete cyberpunk nomad clan with a name, role, territory, convoy composition, clan code, internal crisis, rival faction, notable members, and table-ready GM hooks.",
    },
    {
      question: "Can I use it without an account?",
      answer:
        "Yes. Generate and copy clan notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
    },
    {
      question: "Which RPG systems does it work with?",
      answer:
        "The generator is system-agnostic. It works for Cyberpunk Red, Starfinder, GURPS, Neon City Overdrive, or any near-future or post-apocalyptic campaign where mobile communities matter.",
    },
    {
      question: "Can I aim the clan at my current campaign?",
      answer:
        "Yes. Add optional campaign context — a city, megacorp, rival clan, or active threat — and the generator will fit the clan to your table rather than producing a generic result.",
    },
    {
      question: "How does saving a generated clan work?",
      answer:
        "Clicking 'Save to Codex' stores the clan draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, vehicles, routes, and campaign notes.",
    },
  ];

  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

  const initialDraft: GeneratorOutput = {
    type: "faction",
    title: "Dustborn Convoy",
    summary:
      "A fuel-scarce smuggler band running corporate contraband along closed highway corridors.",
    content:
      "### Who they are\nDustborn Convoy is a tight-knit smuggler band running the sealed highway corridors between Arcology 7 and the outer settlements.\n\n### How they survive\nCargo runs, contraband, and repair work at waystations. Nothing moves through their territory without them knowing — or taking a cut.",
    lore: "",
    labels: ["rpg-faction", "nomad-clan", "imported-draft"],
    status: "draft",
  };
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/cyberpunk-nomad-clan-generator"
  pageTitle="Cyberpunk Nomad Clan Generator | Free RPG Road Faction Tool | Codex Cryptica"
  metaDescription="Generate cyberpunk nomad clans with convoy culture, road codes, corporate enemies, and table-ready hooks. Create mobile communities for any near-future or post-apocalyptic campaign."
  eyebrow="Nomad Clan Generator"
  introTitle="Cyberpunk Nomad Clan Generator"
  introText="Create road-hardened nomad clans with convoy culture, territory routes, internal tensions, and campaign-ready hooks. Works without login, then imports into your local Codex vault."
  worldTheme="cyberpunk"
  isThemeCustomizable={true}
  theme="Cyberpunk / Corporate"
  {relatedLinks}
  {faqs}
  {generate}
  {initialDraft}
>
  {#snippet formFields(trigger)}
    <NomadClanFormFields
      bind:role
      bind:tone
      bind:territory
      bind:conflict
      bind:campaignContext
      onSurprise={trigger}
    />
  {/snippet}
</SEOGeneratorLayout>
