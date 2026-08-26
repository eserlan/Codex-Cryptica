import type { LandingPageConfig } from "../schema";

export const pathfinder2e: LandingPageConfig = {
  slug: "pathfinder-2e",
  kind: "system",
  theme: "fantasy",
  hub: "fantasy",
  seo: {
    title: "Codex Cryptica for Pathfinder 2e Campaign Management",
    description:
      "Organise your Pathfinder 2e campaign with connected nations, secret societies, deities, Adventure Paths, session recaps, and worldbuilding tools.",
  },
  hero: {
    eyebrow: "Campaign Management for Pathfinder 2e GMs",
    title: "Codex Cryptica for Pathfinder 2e",
    tagline:
      "Keep every NPC, faction, nation, and deity in your Adventure Path connected — and still findable three books later.",
    problemStatement:
      "An Adventure Path runs for months. By book three the party has crossed two nations, sworn an oath to one deity, and made an enemy of a society you invented as background colour. You are the one who has to remember which — usually mid-session, while four players wait.",
  },
  useCases: [
    {
      title: "Deities, Edicts & Holy Orders",
      description:
        "Track a deity's domains, edicts, and anathema alongside the temples that serve them — and the cleric quietly testing where the line is.",
      icon: "icon-[lucide--sun]",
    },
    {
      title: "Nations, Settlements & Factions",
      description:
        "Connect nations, city-states, and the societies working quietly inside them to the NPCs who run each one — or are working to bring it down.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Adventure Paths & Session Notes",
      description:
        "Keep each book of an Adventure Path — its clues, its recaps, and the threads you are quietly seeding for book five — tied to the people and places involved.",
      icon: "icon-[lucide--scroll]",
    },
    {
      title: "Ancestries, Heritages & History",
      description:
        "Connect an ancestry and its heritages to the regions it settled, the events that scattered it, and the NPCs still carrying that history.",
      icon: "icon-[lucide--book-open]",
    },
  ],
  exampleGraph: {
    title: "Sample Pathfinder 2e Campaign Web",
    description:
      "See how a party, their patron at the sun temple, the society that has infiltrated their ranks, and the relic they are chasing connect in one campaign graph.",
    // Hub and spoke, not a chain: every `relation` below describes an edge
    // from the first step (the party) to that node, so each one has to read
    // as "The Ninth Lantern <relation> X" on its own.
    steps: [
      {
        label: "The Ninth Lantern",
        sublabel: "The Party",
        category: "faction",
      },
      {
        label: "Champion Vaelis",
        sublabel: "Patron • Sun Temple",
        relation: "Sworn to",
        category: "character",
      },
      {
        label: "The Cinderveil",
        sublabel: "Necromantic Society",
        relation: "Infiltrated by",
        category: "faction",
      },
      {
        label: "Blackstone Keep",
        sublabel: "Ancient Fortress",
        relation: "Bound for",
        category: "location",
      },
      {
        // "Artifact" is deliberate American spelling: it is an official PF2e
        // item category, so it takes the official-terminology exception to
        // this page's British English rather than becoming "artefact".
        label: "The Ember Reliquary",
        sublabel: "Sealed Artifact",
        relation: "Chasing",
        category: "item",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
      description:
        "Create a society with a hierarchy, a purpose, and a reason to be standing in the party's way.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create an NPC with a motive, a manner, and a stake in whatever the party just walked into.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Pantheon Generator",
      description:
        "Create deities with domains, rituals, and taboos — the raw material for edicts and anathema.",
      href: "/generators/pantheon-generator",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate hooks, patron requests, and complications for the side quest your party invented themselves.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Keep Book One Connected to Book Six",
    description:
      "Keep your Pathfinder 2e campaign connected between sessions, with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Paizo Inc. Pathfinder and its logos are registered trademarks of Paizo Inc.",
};
