import type {
  TopicExampleLink,
  TopicGuideLink,
  TopicHubConfig,
  TopicImage,
  TopicToolLink,
  TopicWorkflowStep,
} from "./types";

export type {
  TopicExampleLink,
  TopicGuideLink,
  TopicImage,
  TopicToolLink,
  TopicWorkflowStep,
} from "./types";

export const HEIST_TOPIC_CONFIG = {
  slug: "heists",
  label: "heist",
  canonicalPath: "/topics/heists",
  title: "Running and Designing RPG Heists",
  metaTitle: "Running and Designing RPG Heists | Codex Cryptica",
  description:
    "A complete Game Master resource cluster for tabletop heists: eliminate planning paralysis with flashbacks, design dynamic targets, explore worked examples, and generate playable scores.",
  leadParagraph:
    "RPG heists work best when the objective, access vectors, security rings, complications, and getaway pressures interact dynamically rather than forming a linear corridor. Codex Cryptica's Heist cluster provides the frameworks to run them at the table, worked examples across three genres, and generator tools for rolling complete, table-ready scores.",

  ogImage:
    "https://assets.codexcryptica.com/announcements/heist-the-breakwater-vault.jpg",
  ogImageAlt:
    "Tabletop RPG Heists — Infiltration along the vacuum gantry of Last Light Outpost",

  heroImage: {
    src: "https://assets.codexcryptica.com/announcements/heist-the-breakwater-vault.jpg",
    alt: "An impounded mineral assay vault perched on the outer gantry spine of Last Light Outpost, holding seized pitch-cobalt specie behind pneumatic vacuum seals",
    caption:
      "Infiltration along the vacuum gantry of Last Light Outpost — from the Breakwater Vault score.",
    width: 1376,
    height: 768,
  } satisfies TopicImage,

  copy: {
    thesisHeading: "Why heists play differently",
    learnHeading: "Learn the framework",
    learnIntro:
      "Start here. These guides cover running the operation at the table and designing a prize worth stealing.",
    examplesHeading: "See a score, start to finish",
    examplesIntro:
      "Worked examples show the framework under load. Each one runs a different genre and a different kind of prize, so pick the one closest to your table.",
    exampleHighlightLabel: "Why run it:",
    toolsHeading: "Generate the score",
    toolsIntro:
      "Roll a complete, table-ready operation in seconds, then flesh out its defenders, locks and getaway with the supporting tools.",
    workflowHeading: "Run one tonight",
    workflowIntro:
      "Four steps from blank page to getaway. Each step points at the single resource that carries it.",
    relatedHeading: "Keep exploring",
  },

  structuredData: {
    aboutName: "Tabletop RPG Heists",
    aboutDescription:
      "Designing, preparing, and running heist adventures in tabletop roleplaying games.",
    itemListName: "RPG Heist Resources & Tools",
    itemListDescription:
      "Curated collection of RPG heist frameworks, target design checklists, worked examples, and generation tools.",
    breadcrumbLabel: "RPG Heists Topic Hub",
  },

  thesisPoints: [
    {
      title: "Eliminate planning paralysis with flashbacks",
      summary:
        "Traditional heists stall when players spend hours debating theoretical contingencies that evaporate on the first failed check. Giving the crew retroactive flashback tokens and an active alarm track turns infiltration into an escalating back-and-forth rather than a spreadsheet exercise.",
    },
    {
      title: "Prizes that generate their own complications",
      summary:
        "A featherweight magical gem that slips neatly into a pocket produces an anticlimactic getaway. Compelling heist targets are heavy, radioactive, fragile, actively monitored, or human whistleblowers who must be physically supported under fire.",
    },
    {
      title: "Escalation over binary failure states",
      summary:
        "A single failed stealth check should not instantly trigger an all-out firefight. A structured alarm track turns minor mistakes into mounting operational heat, forcing crews to burn resources, reroute, or accelerate their exit.",
    },
  ],

  coreGuides: [
    {
      title: "How to Run a Heist in a Tabletop RPG",
      href: "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
      description:
        "The complete four-phase GM framework: casing the target, engagement with flashback tokens, an active alarm track, and a chaotic getaway. Covers mechanics to borrow from Blades in the Dark, Leverage, and The Sprawl.",
      focus: "Operational Framework & Flow",
    },
    {
      title: "What Makes a Good Heist Target in a Tabletop RPG?",
      href: "/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg",
      description:
        "A design checklist for choosing a prize that complicates the operation. Covers physical transport hurdles, rival claimants, and objectives that actively resist containment.",
      focus: "Objective & Prize Design",
    },
    {
      title: "Designing RPG Puzzles That Don't Stall the Session",
      href: "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
      description:
        "Build vault combination dials, arcane biometric wards, and dual-key control puzzles that present active tactical trade-offs rather than pass/fail dead ends.",
      focus: "Vault Security & Lock Bypasses",
    },
    {
      title: "Running a Mystery Without Railroading",
      href: "/answers/how-do-you-run-a-mystery-without-railroading",
      description:
        "Apply the Three Clue Rule to the casing and reconnaissance phase so players uncover viable entry vectors without heavy-handed GM direction.",
      focus: "Reconnaissance & Casing",
    },
  ] satisfies TopicGuideLink[],

  workedExamples: [
    {
      title: "The Quell Extraction (Cyberpunk / Corporate)",
      href: "/examples/the-quell-extraction-cyberpunk-heist",
      genre: "Cyberpunk",
      description:
        "Extracting an injured whistleblower compliance architect from an executive penthouse before a twelve-minute custody roll call, with a cancelled ambulance transponder and two crew members forced to support her every step.",
      highlight: "Time-limited extraction with an encumbered, vocal objective",
      image: {
        src: "https://assets.codexcryptica.com/announcements/heist-the-quell-extraction.jpg",
        alt: "A cryogenic neural extraction tank surrounded by server racks and biometric surveillance nodes",
        width: 1024,
        height: 672,
      },
    },
    {
      title: "The Dawnheart Diadem (Classic Fantasy)",
      href: "/examples/the-dawnheart-diadem-fantasy-heist",
      genre: "Classic Fantasy",
      description:
        "A sun-gold circlet holding a captive phoenix ember, warded to a basalt cradle by three anchoring runes beneath the Argent Ledger Guild, with a hidden verification scribe and a fifteen-minute dawn deadline.",
      highlight: "Guild vault infiltration with multi-rune release timers",
      image: {
        src: "https://assets.codexcryptica.com/announcements/heist-the-dawnheart-diadem.jpg",
        alt: "A glowing sun-gold circlet holding a trapped phoenix ember, resting on a warded basalt cradle in a torch-lit vault",
        width: 1024,
        height: 672,
      },
    },
    {
      title: "The Breakwater Vault (Space Western)",
      href: "/examples/the-breakwater-vault-space-western-heist",
      genre: "Space Western",
      description:
        "An impounded mineral assay vault perched on the outer gantry spine of Last Light Outpost, holding seized pitch-cobalt specie behind pneumatic vacuum seals and a compromised getaway ship.",
      highlight: "Orbital exterior traverse with volatile hazardous cargo",
      image: {
        src: "https://assets.codexcryptica.com/announcements/heist-the-breakwater-vault.jpg",
        alt: "An impounded mineral assay vault perched on the outer gantry spine of Last Light Outpost",
        width: 1376,
        height: 768,
      },
    },
  ] satisfies TopicExampleLink[],

  generators: [
    {
      title: "Heist Generator",
      href: "/generators/heist",
      description:
        "Generate a complete table-ready score: the objective, a prize with a practical catch, casing intel, three concentric security rings with alternate approaches, an escalating five-state alarm track, and a compromised getaway route.",
      badge: "Primary Tool",
      image: {
        src: "https://assets.codexcryptica.com/screenshots/generator-heist.jpg",
        alt: "Codex Cryptica heist generator drafting a score, layered security rings, and an alarm track",
        width: 1600,
        height: 1000,
      },
    },
    {
      title: "Faction Generator",
      href: "/generators/faction",
      description:
        "Create the merchant syndicate, corporate security arm, or law enforcement division defending the vault — as well as rival crews targeting the same score.",
      badge: "Supporting Tool",
    },
    {
      title: "Puzzle Generator",
      href: "/generators/puzzle",
      description:
        "Design mechanical vault tumblers, cipher keys, biometric interlocks, and arcane ward matrices guarding restricted inner sanctums.",
      badge: "Supporting Tool",
    },
    {
      title: "NPC Generator",
      href: "/generators/npc",
      description:
        "Quickly produce corrupt vault wardens, nervous lookouts, double-crossing fixers, and underworld fence contacts.",
      badge: "Supporting Tool",
    },
    {
      title: "Castle & Fortress Floorplans",
      href: "/resources/castle-floorplans",
      description:
        "Curated historical fortification, bastion, and palace floor plans to ground your vault perimeters, patrol routes, and subterranean access tunnels in real architectural layouts.",
      badge: "Reference Layouts",
    },
  ] satisfies TopicToolLink[],

  workflow: [
    {
      step: 1,
      title: "Adopt the Operational Framework",
      description:
        "Review the four-phase heist structure. Grant each character flashback points to handle unexpected complications retrospectively, eliminating multi-hour pre-planning debates.",
      recommendedResource: {
        title: "How to Run a Heist in a Tabletop RPG",
        href: "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
      },
    },
    {
      step: 2,
      title: "Select a Dynamic Target",
      description:
        "Ensure the prize has physical weight, volatile properties, legal complications, or active surveillance that creates fresh dilemmas the moment it leaves its mount.",
      recommendedResource: {
        title: "What Makes a Good Heist Target",
        href: "/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg",
      },
    },
    {
      step: 3,
      title: "Generate the Score & Alarm Track",
      description:
        "Roll the concentric security rings, casing vectors, and a 5-tier alarm counter using the Heist Generator so failed checks escalate tension rather than ending the run.",
      recommendedResource: {
        title: "Heist Generator",
        href: "/generators/heist",
      },
    },
    {
      step: 4,
      title: "Populate Inhabitants & Compromise the Getaway",
      description:
        "Draft the defending faction, inside contacts, and prepare a getaway hurdle that forces the crew to improvise under rising heat.",
      recommendedResource: {
        title: "Worked Example: The Quell Extraction",
        href: "/examples/the-quell-extraction-cyberpunk-heist",
      },
    },
  ] satisfies TopicWorkflowStep[],

  relatedTopics: [
    {
      title: "RPG Puzzles",
      href: "/topics/puzzles",
      description:
        "Vault locks, arcane seals, and security bypasses that reward player ingenuity without causing dead-ends.",
    },
    {
      title: "Conspiracy & Intrigue",
      href: "/for/conspiracy",
      description:
        "Shadow factions, corporate espionage, and classified dossiers for campaigns with deep syndicate intrigue.",
    },
    {
      title: "All Heist Material on Explore",
      href: "/explore?label=heist",
      description:
        "Browse every guide, generator, and worked example tagged #heist across the Codex Cryptica discovery graph.",
    },
  ],
} satisfies TopicHubConfig;
