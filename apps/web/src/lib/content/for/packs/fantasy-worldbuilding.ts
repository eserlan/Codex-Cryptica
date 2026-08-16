import type { LandingPageConfig } from "../schema";

export const fantasyWorldbuilding: LandingPageConfig = {
  slug: "fantasy-worldbuilding",
  kind: "genre",
  theme: "fantasy",
  hub: "fantasy",
  seo: {
    title: "Codex Cryptica for Fantasy Worldbuilding",
    description:
      "Connect kingdoms to dynasties, faiths to pantheons, factions to rivalries, and historical epochs to the lands they shaped in one local-first lore bible.",
  },
  hero: {
    eyebrow: "Setting Lore & World Bible",
    title: "Codex Cryptica for Fantasy Worldbuilding",
    tagline:
      "Build deep, cohesive fantasy settings without losing track of your lore. Connect realms, dynasties, sacred pantheons, trade syndicates, and centuries of history in one living web.",
    problemStatement:
      "When a setting spans multiple provinces, ancient bloodlines, rival faiths, and historical eras, flat notes and scattered documents break down. Codex Cryptica keeps your geography, factions, characters, and timelines interconnected so your world stays consistent.",
  },
  useCases: [
    {
      title: "Pantheons, Faiths & Holy Orders",
      description:
        "Map divine genealogies, religious schisms, sacred rites, monastic orders, and local superstitions across your cultures.",
      icon: "icon-[lucide--sun]",
    },
    {
      title: "Realms, Dynasties & Political Factions",
      description:
        "Track royal successions, disputed borders, feudal treaties, guild rivalries, and trade routes across your provinces.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Relics, Arcana & Ancient Mysteries",
      description:
        "Connect legendary artefacts, lost magical traditions, and forgotten ruins to the civilisations that forged them.",
      icon: "icon-[lucide--sparkles]",
    },
    {
      title: "Epochs, Eras & Living Timelines",
      description:
        "Anchor cataclysms, dynastic wars, migrations, and pivotal historical turning points to an interactive chronology.",
      icon: "icon-[lucide--hourglass]",
    },
  ],
  exampleGraph: {
    title: "Sample Setting Lore Web",
    description:
      "See how monarchies, regional capitals, outlaw syndicates, ancient relics, and court scholars link together in one connected setting graph.",
    badgeLabel: "Setting Knowledge Graph",
    steps: [
      {
        label: "High Queen Vaeloria",
        sublabel: "Sovereign of Sunreach",
        category: "character",
      },
      {
        label: "Oakhaven Citadel",
        sublabel: "Provincial Capital",
        relation: "Reigns from",
        category: "location",
      },
      {
        label: "The Iron Syndicate",
        sublabel: "Outlaw Merchant Guild",
        relation: "Opposed by",
        category: "faction",
      },
      {
        label: "Sunstone Relic",
        sublabel: "Pre-Cataclysm Artefact",
        relation: "Guards",
        category: "item",
      },
      {
        label: "Archivist Eldrin",
        sublabel: "Royal Lorekeeper",
        relation: "Advised by",
        category: "character",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Fantasy Name Generator",
      description:
        "Generate culturally consistent names for noble houses, forgotten ruins, provincial settlements, and historical figures.",
      href: "/generators/fantasy-names",
      badge: "Generator",
    },
    {
      title: "Pantheon Generator",
      description:
        "Forge custom mythologies, divine portfolios, holy symbols, and regional religious tenets.",
      href: "/generators/pantheon-generator",
      badge: "Generator",
    },
    {
      title: "Kingdom & Realm Generator",
      description:
        "Build sovereign realms, feudal hierarchies, disputed successions, regional rivalries, and trade exports.",
      href: "/generators/kingdom",
      badge: "Generator",
    },
    {
      title: "Dungeon & Ruin Generator",
      description:
        "Design multi-level ancient vaults, subterranean temples, and dangerous ruins for your setting.",
      href: "/generators/dungeon-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Build Your Living Setting",
    description:
      "Connect your realms, factions, and histories in a fast, local-first workspace built for worldbuilders and storytellers.",
    buttonText: "Start Worldbuilding Free",
    buttonHref: "/app",
  },
};
