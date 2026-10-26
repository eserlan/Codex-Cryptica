<script lang="ts">
  /**
   * Renders the shared generator page for the `fantasy-names` slug, with this route's
   * own copy and FAQs while consolidating search to the primary generator.
   *
   * This page used to hand-wire its own state, generate call and form bindings
   * to produce exactly what GeneratorPageContent already produces for this
   * slug. The wiring lived in two places and could drift in one; only the
   * copy and the URL were ever really this page's own. The preferred search URL is now /generators/fantasy-names.
   */
  import GeneratorPageContent from "#lib/components/seo/GeneratorPageContent.svelte";
  import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";

  const initialDraftOverride: GeneratorOutput = {
    type: "character",
    title: "Generic Fantasy Names — Person",
    summary: "Curated names with linguistic roots and naming conventions.",
    content:
      "A curated set of classic secondary-world fantasy names. Use them as full character names, or mix and match the given names and compound surnames to suit your setting.\n\n- **Iridian Vespera**: Ornate rolling-vowel given name paired with an archaic nightfall-root surname.\n- **Bramwell Hallowfist**: Grounded, historic compound surname; common in border valleys and craft guilds.\n- **Sylvara Quint**: Melodic sylvan given name with a sharp, numbered lineage surname.\n- **Mordantus Krell**: Austere scholar's name; heavy consonants favoured in coastal academies.\n- **Fennelora Brightspire**: Melodic diminutive given name paired with a noble beacon-house surname.\n- **Theron Greybourne**: Classical heroic given name with a river-marker geographical surname.\n- **Kaelen Stonehart**: Resilient northern given name with an ancient martial lineage surname.\n- **Mirelle Ashworth**: Soft courtly given name paired with an old hearth-estate surname.",
    lore: "### Culture & Naming Conventions\nDerived from secondary-world fantasy settings where old trade-guild roots, border lineages, and ancient court tongues merge.\n\n### Structure & Components\n- **Given Names**: Multi-syllabic, rolling vowel combinations (`Iridi-`, `Sylv-`, `Fenn-`) with soft or liquid consonants.\n- **Surnames**: Two-part compound names joining landscape or craft markers (`Hallow-`, `Grey-`, `Stone-`) with settlement or nature roots (`-fist`, `-bourne`, `-hart`).\n- **Titles & Epithets**: Frequently appended with geographical or occupational suffixes for distinguishing common names.\n\n### Usage Suggestions\n- Mix and match stems freely: drop a syllable, combine a prefix from one name with a suffix from another.\n- Use ornate given names for scholars, ambassadors, and court figures; reserve heavy compound surnames for frontier travellers and guild artisans.",
    labels: ["rpg-names", "name-generator", "imported-draft"],
    status: "draft",
  };

  const relatedLinks = [
    { href: "/generators/fantasy-names", label: "Main fantasy name generator" },
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
    canonicalPath: "/generators/fantasy-names",
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
