import type { LandingPageConfig } from "../schema";

export const fantasyWorldbuilding: LandingPageConfig = {
  slug: "fantasy-worldbuilding",
  kind: "genre",
  theme: "fantasy",
  hub: "fantasy",
  seo: {
    title: "Codex Cryptica for Fantasy Worldbuilding",
    description:
      "Connect realms to dynasties, faiths to schisms, factions to treaties, and history to the lands they shape in one local-first lore bible.",
  },
  hero: {
    eyebrow: "Setting Lore & World Bible",
    title: "Codex Cryptica for Fantasy Worldbuilding",
    tagline:
      "Build a fantasy setting without losing track of how it fits together. Connect realms, dynasties, religions, factions and centuries of history in one place.",
    problemStatement:
      "When a setting spans multiple provinces, lineages, rival faiths, and historical eras, flat notes and scattered documents break down. Codex Cryptica keeps your geography, factions, characters, and timelines interconnected so your world stays consistent.",
  },
  useCases: [
    {
      title: "Pantheons, Faiths & Holy Orders",
      description:
        "Track gods, faiths, schisms, holy orders and regional religious traditions across your cultures.",
      icon: "icon-[lucide--sun]",
    },
    {
      title: "Realms, Dynasties & Political Factions",
      description:
        "Track royal successions, disputed borders, treaties, guild rivalries, and trade routes across your provinces.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Magic, Artefacts & Ruins",
      description:
        "Connect artefacts, magical traditions and ruins to the cultures, people and events that created them.",
      icon: "icon-[lucide--sparkles]",
    },
    {
      title: "History & Timelines",
      description:
        "Anchor cataclysms, dynastic wars, migrations, and major historical events to an interactive chronology.",
      icon: "icon-[lucide--hourglass]",
    },
  ],
  exampleGraph: {
    title: "Sample Setting Lore Web",
    description:
      "See how successions, treaties, trade confederations, and provincial capitals link together in one connected setting graph.",
    badgeLabel: "Setting Knowledge Graph",
    steps: [
      {
        label: "Queen Maera II",
        sublabel: "Ruler of Ardel",
        category: "character",
      },
      {
        label: "House Veren",
        sublabel: "Noble Dynasty",
        relation: "Head of",
        category: "faction",
      },
      {
        label: "The Crown of Ardel",
        sublabel: "Coronation Artefact",
        relation: "Claims",
        category: "item",
      },
      {
        label: "The Northroad League",
        sublabel: "Trade Confederation",
        relation: "Broke treaty with",
        category: "faction",
      },
      {
        label: "Old Temple District",
        sublabel: "Capital District",
        relation: "Controls",
        category: "location",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Fantasy Name Generator",
      description:
        "Generate culturally consistent names for noble houses, ruins, provincial settlements, and historical figures.",
      href: "/generators/fantasy-names",
      badge: "Generator",
    },
    {
      title: "Pantheon Generator",
      description:
        "Create pantheons, myths, divine domains, holy symbols and regional religious traditions.",
      href: "/generators/pantheon-generator",
      badge: "Generator",
    },
    {
      title: "Kingdom & Realm Generator",
      description:
        "Create kingdoms and realms with rulers, political structures, rival powers, regions and trade.",
      href: "/generators/kingdom",
      badge: "Generator",
    },
    {
      title: "Dungeon & Ruin Generator",
      description:
        "Design subterranean sites, ancient ruins, and fortified strongholds for your setting.",
      href: "/generators/dungeon-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Build Your World",
    description:
      "Connect your realms, factions, and histories in a fast, local-first workspace built for worldbuilders and storytellers.",
    buttonText: "Start Worldbuilding Free",
    buttonHref: "/app",
  },
};
