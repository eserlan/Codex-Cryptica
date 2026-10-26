<script lang="ts">
  /**
   * Renders the shared generator page for the `vampire-clan` slug, with this route's
   * own copy, FAQs and canonical.
   *
   * This page used to hand-wire its own state, generate call and form bindings
   * to produce exactly what GeneratorPageContent already produces for this
   * slug. The wiring lived in two places and could drift in one; only the
   * copy and the URL were ever really this page's own.
   */
  import GeneratorPageContent from "$lib/components/seo/GeneratorPageContent.svelte";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

  const initialDraftOverride: GeneratorOutput = {
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
        "Yes. Generate and copy clan notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault. No sign-up required.",
    },
    {
      question: "Which RPG systems does it work with?",
      answer:
        "The generator is system-agnostic. It works for Vampire: The Masquerade, D&D, Pathfinder, Gothic Earth, or any gothic noir worldbuilding campaign.",
    },
    {
      question: "Can I aim the clan at my current campaign?",
      answer:
        "Yes. Add optional campaign context (a gothic city, investigator guild, rival faction, or active threat) and the generator will fit the clan to your table rather than producing a generic result.",
    },
    {
      question: "How does saving a generated clan work?",
      answer:
        "Clicking 'Save to Codex' stores the clan draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, and campaign notes.",
    },
  ];
</script>

<GeneratorPageContent
  slug="vampire-clan"
  {initialDraftOverride}
  metaOverrides={{
    canonicalPath: "/tools/vampire-clan-generator",
    pageTitle:
      "Vampire Clan Generator | Free RPG Bloodline & Coven Tool | Codex Cryptica",
    metaDescription:
      "Create detailed vampire clans, bloodlines, occult covens, and secret societies. Generate history, feeding habits, weaknesses, and plot hooks for your campaign.",
    eyebrow: "Vampire Clan Generator",
    introTitle: "Vampire Clan Generator",
    introText:
      "Create undead factions with bloodlines, feeding habits, dark agendas, and table-ready hooks. Works without login, then imports into your local Codex vault.",
    relatedLinks,
    faqs,
  }}
/>
