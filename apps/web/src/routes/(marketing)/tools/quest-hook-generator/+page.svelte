<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import QuestFormFields from "$lib/components/seo/QuestFormFields.svelte";
  import {
    generatorEngine,
    questConfig,
  } from "$lib/services/seo/generator-engine";

  let genre = $state(questConfig.genres[0]);
  let tone = $state(questConfig.tones[0]);
  let scope = $state(questConfig.scopes[0]);
  let locationType = $state(questConfig.locationTypes[0]);
  let threat = $state(questConfig.threats[0]);
  let twist = $state(questConfig.twists[0]);
  let reward = $state(questConfig.rewards[0]);
  let campaignContext = $state("");

  async function generate({ useAI }: { useAI: boolean }) {
    return generatorEngine.generateQuestHook({
      genre,
      tone,
      scope,
      locationType,
      threat,
      twist,
      reward,
      campaignContext,
      useAI,
    });
  }

  const relatedLinks = [
    { href: "/solutions/ai-gm-assistant", label: "AI GM assistant" },
    { href: "/free-rpg-campaign-manager", label: "Free RPG campaign manager" },
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
  ];

  const faqs = [
    {
      question: "Does the quest hook generator require an account?",
      answer:
        "No. You can generate a quest hook without logging in, then copy the result or save it directly into a local Codex Cryptica vault.",
    },
    {
      question: "What does a generated quest hook include?",
      answer:
        "Each quest includes a hook, location, key NPC, main threat, a GM-facing complication, a possible twist, and a suggested reward.",
    },
    {
      question: "Can I use it for systems other than D&D?",
      answer:
        "Yes. The output is system-agnostic and works for D&D, Pathfinder, OSR games, and any other tabletop RPG where a GM prepares sessions.",
    },
    {
      question: "How does saving a quest hook work?",
      answer:
        "The page stores the generated draft in browser localStorage and opens the app, where it imports as an Event entry in your local vault.",
    },
  ];
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

  const initialDraft: GeneratorOutput = {
    type: "event",
    title: "The Sunken Relic",
    summary:
      "A mysterious tavern owner hires the party to retrieve an ancient sunken amulet from the Whispering Reef before a rival gang finds it.",
    content:
      "### Hook\nA mysterious tavern owner hires the party to retrieve an ancient sunken amulet.\n\n### Complication\nA rival gang is also searching for the reef.",
    lore: "",
    labels: ["rpg-quest", "Retrieval", "Ocean", "Rivals"],
    status: "draft",
  };
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/quest-hook-generator"
  pageTitle="Quest Hook Generator | Free RPG Adventure Hook Tool | Codex Cryptica"
  metaDescription="Generate RPG quest hooks with a hook, complication, key NPC, twist, and reward. Works for D&D, Pathfinder, and any tabletop system. Copy or save into your local campaign vault."
  eyebrow="Quest Hook Generator"
  introTitle="Quest Hook Generator"
  introText="Create a GM-ready quest hook with a location, key NPC, complication, and twist. Works without login, then saves into your local Codex Cryptica campaign vault."
  {relatedLinks}
  {faqs}
  {generate}
  {initialDraft}
>
  {#snippet formFields(_trigger)}
    <QuestFormFields
      bind:genre
      bind:tone
      bind:scope
      bind:locationType
      bind:threat
      bind:twist
      bind:reward
      bind:campaignContext
    />
  {/snippet}
</SEOGeneratorLayout>
