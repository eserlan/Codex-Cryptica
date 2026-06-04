<script lang="ts">
  import { onMount } from "svelte";
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import RPGNPCFormFields from "$lib/components/seo/RPGNPCFormFields.svelte";
  import {
    generatorEngine,
    factionConfig,
    npcThemeConfig,
    npcConfig,
  } from "$lib/services/seo/generator-engine";

  let theme = $state(factionConfig.themes[0]);
  let ancestry = $state(npcThemeConfig.ancestries[factionConfig.themes[0]][0]);
  let role = $state(npcThemeConfig.roles[factionConfig.themes[0]][0]);
  let alignment = $state(npcConfig.alignments[0]);
  let campaignContext = $state("");

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

  async function generate({ useAI }: { useAI: boolean }) {
    return generatorEngine.generateNPC({
      theme,
      race: ancestry,
      role,
      alignment,
      campaignContext,
      useAI,
    });
  }

  const relatedLinks = [
    { href: "/tools/faction-generator", label: "Faction generator" },
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
    { href: "/tools/vampire-clan-generator", label: "Vampire clan generator" },
  ];

  const faqs = [
    {
      question: "What does the RPG NPC generator create?",
      answer:
        "It generates a complete NPC with a name, ancestry, role, personality traits, a hidden secret, motivation, faction connection, and a table-ready GM hook — adapted to the genre you choose.",
    },
    {
      question: "How is this different from the D&D NPC generator?",
      answer:
        "This generator spans six genres: Classic Fantasy, Cyberpunk, Gothic Noir, Sci-Fi, Modern Conspiracy, and Post-Apocalyptic. Each genre has its own ancestry types, roles, and AI writing voice. The D&D version is locked to fantasy races and classes.",
    },
    {
      question: "Can I use it without an account?",
      answer:
        "Yes. Generate and copy NPC notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
    },
    {
      question: "Can I aim the NPC at my current campaign?",
      answer:
        "Yes. Add optional campaign context — a location, faction, active villain, or current problem — and the generator will fit the NPC to your table rather than producing a generic result.",
    },
    {
      question: "How does saving a generated NPC work?",
      answer:
        "Clicking 'Save to Codex' stores the NPC draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Character entity, ready to link to factions, locations, and campaign notes.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/rpg-npc-generator"
  pageTitle="RPG NPC Generator | Fantasy, Cyberpunk, Gothic & Sci-Fi Characters | Codex Cryptica"
  metaDescription="Generate NPCs across any genre — fantasy, cyberpunk, gothic horror, sci-fi, modern conspiracy, and post-apocalyptic. Each NPC has a secret, faction tie, and table-ready hook."
  eyebrow="RPG NPC Generator"
  introTitle="RPG NPC Generator"
  introText="Create NPCs across any genre with secrets, faction ties, and table-ready hooks. Works without login, then imports into your local Codex vault."
  {relatedLinks}
  {faqs}
  bind:theme
  isThemeCustomizable={true}
  {generate}
>
  {#snippet formFields(trigger)}
    <RPGNPCFormFields
      bind:theme
      bind:ancestry
      bind:role
      bind:alignment
      bind:campaignContext
      onSurprise={trigger}
    />
  {/snippet}
</SEOGeneratorLayout>
