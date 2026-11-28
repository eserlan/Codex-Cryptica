<script lang="ts">
  /**
   * Renders the shared generator page for the `npc` slug, with this route's
   * own copy, FAQs and canonical.
   *
   * This page used to hand-wire its own state, generate call and form bindings
   * to produce exactly what GeneratorPageContent already produces for this
   * slug. The wiring lived in two places and could drift in one; only the
   * copy and the URL were ever really this page's own.
   */
  import GeneratorPageContent from "#lib/components/seo/GeneratorPageContent.svelte";
  import { slugMeta } from "#lib/components/seo/generator-page-meta";

  const relatedLinks = [
    { href: "/tools/faction-generator", label: "Faction generator" },
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
    { href: "/tools/vampire-clan-generator", label: "Vampire clan generator" },
  ];

  const faqs = [
    {
      question: "How is this different from the D&D NPC generator?",
      answer:
        "The RPG NPC generator offers genre-specific roles, ancestries and moral stances without tying them to a particular ruleset. The D&D generator uses fantasy races and classes and can include quick rules reference statistics.",
    },
    ...(slugMeta.npc.faqs ?? []),
  ];
</script>

<GeneratorPageContent
  slug="npc"
  metaOverrides={{
    canonicalPath: "/tools/rpg-npc-generator",
    pageTitle:
      "RPG NPC Generator | Fantasy, Cyberpunk, Gothic & Sci-Fi Characters | Codex Cryptica",
    metaDescription: slugMeta.npc.metaDescription,
    eyebrow: "RPG NPC Generator",
    introTitle: "RPG NPC Generator",
    introText: slugMeta.npc.introText,
    relatedLinks,
    faqs,
  }}
/>
