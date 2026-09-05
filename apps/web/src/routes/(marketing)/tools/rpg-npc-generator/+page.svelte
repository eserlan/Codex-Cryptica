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
  import GeneratorPageContent from "$lib/components/seo/GeneratorPageContent.svelte";

  const relatedLinks = [
    { href: "/tools/faction-generator", label: "Faction generator" },
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
    { href: "/tools/vampire-clan-generator", label: "Vampire clan generator" },
  ];

  const faqs = [
    {
      question: "What does the RPG NPC generator create?",
      answer:
        "It generates a complete NPC with a name, ancestry, role, personality traits, a hidden secret, motivation, faction connection, and a table-ready GM hook, adapted to the genre you choose.",
    },
    {
      question: "How is this different from the D&D NPC generator?",
      answer:
        "This generator spans six genres: Classic Fantasy, Cyberpunk, Gothic Noir, Sci-Fi, Modern Conspiracy, and Post-Apocalyptic. Each genre has its own ancestry types, roles, and AI writing voice. The D&D version is locked to fantasy races and classes.",
    },
    {
      question: "Can I use it without an account?",
      answer:
        "Yes. Generate and copy NPC notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault. No sign-up required.",
    },
    {
      question: "Can I aim the NPC at my current campaign?",
      answer:
        "Yes. Add optional campaign context (a location, faction, active villain, or current problem) and the generator will fit the NPC to your table rather than producing a generic result.",
    },
    {
      question: "How does saving a generated NPC work?",
      answer:
        "Clicking 'Save to Codex' stores the NPC draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Character entity, ready to link to factions, locations, and campaign notes.",
    },
  ];
</script>

<GeneratorPageContent
  slug="npc"
  metaOverrides={{
    canonicalPath: "/tools/rpg-npc-generator",
    pageTitle:
      "RPG NPC Generator | Fantasy, Cyberpunk, Gothic & Sci-Fi Characters | Codex Cryptica",
    metaDescription:
      "Generate NPCs across any genre: fantasy, cyberpunk, gothic horror, sci-fi, modern conspiracy, and post-apocalyptic. Each NPC has a secret, faction tie, and table-ready hook.",
    eyebrow: "RPG NPC Generator",
    introTitle: "RPG NPC Generator",
    introText:
      "Create NPCs across any genre with secrets, faction ties, and table-ready hooks. Works without login, then imports into your local Codex vault.",
    relatedLinks,
    faqs,
  }}
/>
