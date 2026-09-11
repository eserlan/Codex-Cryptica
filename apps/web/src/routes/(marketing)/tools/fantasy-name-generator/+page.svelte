<script lang="ts">
  /**
   * Renders the shared generator page for the `fantasy-names` slug, with this route's
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
    type: "character",
    title: "Generic Fantasy Names — Person",
    summary: "",
    content:
      "These names blend rolling vowels with grounded, archaic surnames, built for a classic secondary-world fantasy setting.\n\n- **Iridian Vespera**: A nomadic chronicler known for weaving history into rhythmic poetry.\n- **Bramwell Hallowfist**: A retired siege engineer who now runs a quiet borderlands apothecary.\n- **Sylvara Quint**: A sharp-witted investigator who recovers stolen celestial artifacts.\n- **Mordantus Krell**: A reclusive scholar obsessed with sunken underwater civilizations.\n- **Fennelora Brightspire**: A charismatic diplomat whose family has brokered peace for generations.",
    lore: "### Culture\nDrawn from a composite culture where old trade-guild roots and nomadic mountain tongues have merged.\n\n### Style\nMulti-syllabic, rolling sounds over sharp consonants: elegant and historied rather than rugged.\n\n### Usage Suggestions\nUse the ornate first names for scholars and nobles, and the compound surnames as hooks players can ask about.",
    labels: ["rpg-names", "name-generator", "imported-draft"],
    status: "draft",
  };

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
</script>

<GeneratorPageContent
  slug="fantasy-names"
  {initialDraftOverride}
  metaOverrides={{
    canonicalPath: "/tools/fantasy-name-generator",
    pageTitle:
      "Fantasy Name Generator | Free RPG & Worldbuilding Name Tool | Codex Cryptica",
    metaDescription:
      "Generate fantasy names for characters, places, factions, and items across ten cultural styles. Free for D&D, Pathfinder, worldbuilding, and any tabletop RPG.",
    eyebrow: "Fantasy Name Generator",
    introTitle: "Fantasy Name Generator",
    introText:
      "Generate fantasy names for characters, places, factions, and items across ten cultural styles. Works without login: copy your favourites or save them into your local Codex Cryptica vault.",
    relatedLinks,
    faqs,
  }}
/>
