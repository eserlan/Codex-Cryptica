<script lang="ts">
  /**
   * Renders the shared generator page for the `nomad-clan` slug, with this route's
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
    { href: "/tools/vampire-clan-generator", label: "Vampire clan generator" },
    { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
  ];

  const faqs = [
    {
      question: "What does the nomad clan generator create?",
      answer:
        "It generates a complete cyberpunk nomad clan with a name, role, territory, convoy composition, clan code, internal crisis, rival faction, notable members, and table-ready GM hooks.",
    },
    {
      question: "Can I use it without an account?",
      answer:
        "Yes. Generate and copy clan notes on this page without logging in. Save the draft directly into a browser-local Codex Cryptica vault — no sign-up required.",
    },
    {
      question: "Which RPG systems does it work with?",
      answer:
        "The generator is system-agnostic. It works for Cyberpunk Red, Starfinder, GURPS, Neon City Overdrive, or any near-future or post-apocalyptic campaign where mobile communities matter.",
    },
    {
      question: "Can I aim the clan at my current campaign?",
      answer:
        "Yes. Add optional campaign context — a city, megacorp, rival clan, or active threat — and the generator will fit the clan to your table rather than producing a generic result.",
    },
    {
      question: "How does saving a generated clan work?",
      answer:
        "Clicking 'Save to Codex' stores the clan draft in your browser's local storage. Open Codex Cryptica and it imports automatically as a Faction entity, ready to link to NPCs, locations, vehicles, routes, and campaign notes.",
    },
  ];
</script>

<GeneratorPageContent
  slug="nomad-clan"
  metaOverrides={{
    canonicalPath: "/tools/cyberpunk-nomad-clan-generator",
    pageTitle:
      "Cyberpunk Nomad Clan Generator | Free RPG Road Faction Tool | Codex Cryptica",
    metaDescription:
      "Generate cyberpunk nomad clans with convoy culture, road codes, corporate enemies, and table-ready hooks. Create mobile communities for any near-future or post-apocalyptic campaign.",
    eyebrow: "Nomad Clan Generator",
    introTitle: "Cyberpunk Nomad Clan Generator",
    introText:
      "Create road-hardened nomad clans with convoy culture, territory routes, internal tensions, and campaign-ready hooks. Works without login, then imports into your local Codex vault.",
    relatedLinks,
    faqs,
  }}
/>
