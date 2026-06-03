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
        "It generates a vampire clan or occult coven with a name, archetype, bloodline heritage, feeding habits, clan weakness, dark agenda, internal conflicts, and adventure hooks.",
    },
    {
      question: "Which vampire systems or RPGs is this compatible with?",
      answer:
        "This tool is system-agnostic and works perfectly for Vampire: The Masquerade, D&D, Pathfinder, Gothic Earth, or any customized gothic noir worldbuilding setting.",
    },
    {
      question:
        "Can I customize the generated clan to fit my current campaign?",
      answer:
        "Yes. Add optional campaign context such as a specific gothic metropolis, an investigator faction, or active threats, and the generator will integrate them.",
    },
    {
      question: "How does the save function integrate with the app?",
      answer:
        "Clicking 'Save to Codex' serializes the generated coven draft into browser localStorage and opens the main app interface, auto-importing it as a new Faction in your vault.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/vampire-clan-generator"
  pageTitle="Vampire Clan Generator | Free RPG Bloodline & Coven Tool | Codex Cryptica"
  metaDescription="Create detailed vampire clans, bloodlines, occult covens, and secret societies. Generate history, feeding habits, weaknesses, and plot hooks for your campaign."
  eyebrow="Vampire Clan Generator"
  introTitle="Vampire Clan Generator"
  introText="Forge a secret society of the undead. Customize bloodlines, feeding preferences, and weaknesses, then instantly generate details or save the draft into your Codex Cryptica campaign vault."
  worldTheme="horror"
  {relatedLinks}
  {faqs}
  {generate}
>
  {#snippet formFields()}
    <VampireFormFields
      bind:archetype
      bind:bloodline
      bind:feedingHabit
      bind:weakness
      bind:campaignContext
    />
  {/snippet}
</SEOGeneratorLayout>
