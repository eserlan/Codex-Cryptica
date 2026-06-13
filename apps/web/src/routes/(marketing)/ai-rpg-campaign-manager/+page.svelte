<script lang="ts">
  import SEOPageLayout from "$lib/components/seo/SEOPageLayout.svelte";
  import type { SEOPageData } from "$lib/config/seo-pages";

  const data: SEOPageData = {
    slug: "ai-rpg-campaign-manager",
    eyebrow: "AI-Powered Campaign Management",
    title: "AI RPG Campaign Manager | AI-Assisted TTRPG Prep | Codex Cryptica",
    description:
      "Manage your TTRPG campaigns with AI assistance. Generate NPCs, factions, and quest hooks, revise session notes, and build your world with a local-first AI co-author.",
    h1: "AI RPG Campaign Manager",
    subheading:
      "Prep sessions faster with an AI co-author that knows your campaign.",
    introText:
      "Codex Cryptica combines a local-first campaign wiki with an integrated AI writing layer. Ask the Lore Oracle to draft an NPC for tonight's session, suggest a plot complication, or expand a location stub — all without leaving your notes and all stored privately on your device.",
    ctaText: "Start Your AI-Assisted Campaign",
    secondaryCtaText: "Try free generators",
    secondaryCtaHref: "/tools",
    keywords: [
      "ai rpg campaign manager",
      "ai campaign manager",
      "ai dungeon master tool",
      "ai ttrpg campaign helper",
      "ai dnd campaign manager",
    ],
    features: [
      {
        title: "Lore Oracle AI",
        description:
          "Context-aware AI that reads your existing campaign notes before generating new content, keeping everything consistent.",
        icon: "icon-[lucide--bot]",
      },
      {
        title: "Local-First Privacy",
        description:
          "All notes stay on your device. AI calls use your own API key or the shared proxy — nothing is stored on Codex servers.",
        icon: "icon-[lucide--shield-check]",
      },
      {
        title: "Instant Vault Import",
        description:
          "Generated NPCs, factions, and locations import directly as structured entities in your campaign vault.",
        icon: "icon-[lucide--database]",
      },
    ],
    relatedLinks: [
      { href: "/", label: "RPG campaign manager" },
      { href: "/solutions/ai-dm-assistant", label: "AI DM assistant" },
      {
        href: "/solutions/ai-worldbuilding-tool",
        label: "AI worldbuilding tool",
      },
      {
        href: "/free-rpg-campaign-manager",
        label: "Free RPG campaign manager",
      },
      { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
    ],
    faq: [
      {
        question: "Do I need an AI subscription to use this?",
        answer:
          "No. You can use the shared system proxy for free, or bring your own Gemini or OpenAI API key for unlimited usage. Codex never charges for AI usage.",
      },
      {
        question: "Can the AI see all my campaign notes?",
        answer:
          "Only what you share with it. The Oracle reads selected entities you explicitly include in a prompt — nothing is sent automatically.",
      },
      {
        question: "Does it work offline?",
        answer:
          "The campaign wiki and graph work fully offline. AI generation requires an internet connection to reach your API provider.",
      },
    ],
  };
</script>

<SEOPageLayout {data} canonicalUrl="/ai-rpg-campaign-manager" />
