<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import NPCFormFields from "$lib/components/seo/NPCFormFields.svelte";
  import {
    generatorEngine,
    npcConfig,
  } from "$lib/services/seo/generator-engine";

  let race = $state(npcConfig.races[0]);
  let role = $state(npcConfig.roles[0]);
  let alignment = $state(npcConfig.alignments[0]);
  let campaignContext = $state("");

  async function generate({ useAI }: { useAI: boolean }) {
    return generatorEngine.generateNPC({
      race,
      role,
      alignment,
      campaignContext,
      includeDndQuickStats: true,
      useAI,
    });
  }

  const relatedLinks = [
    { href: "/tools/faction-generator", label: "Faction generator" },
    { href: "/solutions/ai-gm-assistant", label: "AI GM assistant" },
    { href: "/free-rpg-campaign-manager", label: "Free RPG campaign manager" },
  ];

  const faqs = [
    {
      question: "What does the NPC generator create?",
      answer:
        "It generates a complete RPG NPC with a name, ancestry, role, personality traits, a hidden secret, motivation, faction connection, and a table-ready GM hook — structured for immediate use.",
    },
    {
      question: "Can I use it without an account?",
      answer:
        "Yes. Generate and copy NPC notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
    },
    {
      question: "Can I use it outside D&D?",
      answer:
        "Yes. The output works for D&D, Pathfinder, OSR games, and any fantasy or homebrew campaign. The generator is system-agnostic.",
    },
    {
      question: "Can I aim the NPC at my current campaign?",
      answer:
        "Yes. Add optional campaign context — a city, faction, active villain, or current problem — and the generator will fit the NPC to your table rather than producing a generic result.",
    },
    {
      question: "How does saving a generated NPC work?",
      answer:
        "Clicking 'Save to Codex' stores the NPC draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Character entity, ready to link to factions, locations, and campaign notes.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/dnd-npc-generator"
  pageTitle="D&D NPC Generator | Free Fantasy RPG Character Tool | Codex Cryptica"
  metaDescription="Generate D&D NPCs with ancestry, role, personality, secret, motivation, faction connection, and plot hook. Copy the draft or save it into your local campaign vault."
  eyebrow="D&D NPC Generator"
  introTitle="D&D NPC Generator"
  introText="Create NPCs with secrets, faction ties, and table-ready hooks. Works without login, then imports into your local Codex vault."
  {relatedLinks}
  {faqs}
  {generate}
>
  {#snippet formFields(trigger)}
    <NPCFormFields
      bind:race
      bind:role
      bind:alignment
      bind:campaignContext
      onSurprise={trigger}
    />
  {/snippet}
</SEOGeneratorLayout>
