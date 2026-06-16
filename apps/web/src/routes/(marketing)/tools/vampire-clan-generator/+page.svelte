<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import VampireFormFields from "$lib/components/seo/VampireFormFields.svelte";
  import {
    generatorEngine,
    vampireConfig,
  } from "$lib/services/seo/generator-engine";

  let archetype = $state(vampireConfig.archetypes[0]);
  let bloodline = $state(vampireConfig.bloodlines[0]);
  let feedingHabit = $state(vampireConfig.feedingHabits[0]);
  let weakness = $state(vampireConfig.weaknesses[0]);
  let campaignContext = $state("");

  async function generate({ useAI }: { useAI: boolean }) {
    return generatorEngine.generateVampireClan({
      archetype,
      bloodline,
      feedingHabit,
      weakness,
      campaignContext,
      useAI,
    });
  }

  const relatedLinks = [
    { href: "/tools/faction-generator", label: "Faction generator" },
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
    { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
  ];

  const faqs = [
    {
      question: "What does the vampire clan generator create?",
      answer:
        "It generates a complete vampire clan or occult coven with a name, bloodline heritage, feeding habits, clan weakness, dark agenda, internal conflict, rival faction, notable NPCs, and a table-ready GM hook.",
    },
    {
      question: "Can I use it without an account?",
      answer:
        "Yes. Generate and copy clan notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
    },
    {
      question: "Which RPG systems does it work with?",
      answer:
        "The generator is system-agnostic. It works for Vampire: The Masquerade, D&D, Pathfinder, Gothic Earth, or any gothic noir worldbuilding campaign.",
    },
    {
      question: "Can I aim the clan at my current campaign?",
      answer:
        "Yes. Add optional campaign context — a gothic city, investigator guild, rival faction, or active threat — and the generator will fit the clan to your table rather than producing a generic result.",
    },
    {
      question: "How does saving a generated clan work?",
      answer:
        "Clicking 'Save to Codex' stores the clan draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, and campaign notes.",
    },
  ];
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

  const initialDraft: GeneratorOutput = {
    type: "faction",
    title: "House of Thorn",
    summary:
      "An aristocratic lineage of gothic vampires controlling the local banking system.",
    content:
      "### Heritage\nAristocratic bloodline with feeding habits centered around the upper-class elite.\n\n### Clan Weakness\nExtremely vulnerable to silver and holy ground, causing severe degradation of power.",
    lore: "",
    labels: ["rpg-faction", "Vampire", "Aristocratic"],
    status: "draft",
  };
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/vampire-clan-generator"
  pageTitle="Vampire Clan Generator | Free RPG Bloodline & Coven Tool | Codex Cryptica"
  metaDescription="Create detailed vampire clans, bloodlines, occult covens, and secret societies. Generate history, feeding habits, weaknesses, and plot hooks for your campaign."
  eyebrow="Vampire Clan Generator"
  introTitle="Vampire Clan Generator"
  introText="Create undead factions with bloodlines, feeding habits, dark agendas, and table-ready hooks. Works without login, then imports into your local Codex vault."
  isThemeCustomizable={true}
  theme="Vampire / Gothic Noir"
  {relatedLinks}
  {faqs}
  {generate}
  {initialDraft}
>
  {#snippet formFields(trigger)}
    <VampireFormFields
      bind:archetype
      bind:bloodline
      bind:feedingHabit
      bind:weakness
      bind:campaignContext
      onSurprise={trigger}
    />
  {/snippet}
</SEOGeneratorLayout>
