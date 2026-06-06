<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import NameFormFields from "$lib/components/seo/NameFormFields.svelte";
  import {
    generatorEngine,
    nameGeneratorConfig,
  } from "$lib/services/seo/generator-engine";

  let culture = $state(nameGeneratorConfig.cultures[0]);
  let gender = $state(nameGeneratorConfig.genders[0]);
  let nameType = $state(nameGeneratorConfig.nameTypes[0]);
  let count = $state(nameGeneratorConfig.counts[1]);
  let context = $state("");

  async function generate({ useAI }: { useAI: boolean }) {
    return generatorEngine.generateNames({
      culture,
      gender,
      nameType,
      count,
      context,
      useAI,
    });
  }

  const relatedLinks = [
    { href: "/worldbuilding-tool", label: "Worldbuilding tool" },
    { href: "/free-rpg-campaign-manager", label: "Free RPG campaign manager" },
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
  ];

  const faqs = [
    {
      question: "Does the fantasy name generator require an account?",
      answer:
        "No. You can generate names on the public page without logging in, then copy them or save a favourite into a local Codex Cryptica vault.",
    },
    {
      question: "What name types does it support?",
      answer:
        "The generator supports person names, place names, faction names, and item names across ten cultural styles from High Elf and Dwarven to Norse, Celtic, and Eastern-inspired.",
    },
    {
      question: "Can I use these names in my campaign or published work?",
      answer:
        "Yes. All generated names are free to use in any personal or commercial tabletop RPG work.",
    },
    {
      question: "How does saving a name to Codex Cryptica work?",
      answer:
        "The page stores the primary generated name in browser localStorage and opens the app, where it imports as a Character, Location, Faction, or Item entity depending on the selected name type.",
    },
  ];
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

  const initialDraft: GeneratorOutput = {
    type: "character",
    title: "Aelthas The Wise",
    summary:
      "A legendary High Elf wizard and scholar from the ancient library of Silverspire.",
    content:
      "### Scholar of Silverspire\nAelthas has spent centuries cataloging the planar portals and ley lines. He is quiet, calculating, and carries the weight of elven history.",
    lore: "",
    labels: ["rpg-names", "High Elf", "Wizard", "Scholar"],
    status: "draft",
  };
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/fantasy-name-generator"
  pageTitle="Fantasy Name Generator | Free RPG & Worldbuilding Name Tool | Codex Cryptica"
  metaDescription="Generate fantasy names for characters, places, factions, and items across ten cultural styles. Free for D&D, Pathfinder, worldbuilding, and any tabletop RPG."
  eyebrow="Fantasy Name Generator"
  introTitle="Fantasy Name Generator"
  introText="Generate fantasy names for characters, places, factions, and items across ten cultural styles. Works without login — copy your favourites or save them into your local Codex Cryptica vault."
  {relatedLinks}
  {faqs}
  {generate}
  {initialDraft}
>
  {#snippet formFields(_trigger)}
    <NameFormFields
      bind:culture
      bind:gender
      bind:nameType
      bind:count
      bind:context
    />
  {/snippet}
</SEOGeneratorLayout>
