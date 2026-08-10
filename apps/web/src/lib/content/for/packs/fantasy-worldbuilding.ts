import type { LandingPageConfig } from "../schema";

export const fantasyWorldbuilding: LandingPageConfig = {
  slug: "fantasy-worldbuilding",
  kind: "genre",
  theme: "fantasy",
  seo: {
    title: "Codex Cryptica for Fantasy Worldbuilding",
    description:
      "Your fantasy world is more than a folder of notes. Connect kingdoms to rulers, gods to temples, factions to enemies, and historical events to the world they changed.",
  },
  hero: {
    eyebrow: "Fantasy Worldbuilding",
    title: "Codex Cryptica for Fantasy Worldbuilding",
    tagline:
      "Your fantasy world is more than a folder of notes. Connect kingdoms to rulers, gods to temples, factions to enemies, and historical events to the world they changed.",
    problemStatement:
      "When your world grows to dozens of towns, historical eras, and rival houses, linear notebooks break down. Codex Cryptica turns scattered world notes into an interconnected knowledge web.",
  },
  useCases: [
    {
      title: "Pantheons & Holy Orders",
      description:
        "Define divine hierarchies, clerical domains, planar cosmology, and religious orders in one linked system.",
      icon: "icon-[lucide--sun]",
    },
    {
      title: "Kingdom Dynasties & Alliances",
      description:
        "Map out noble houses, succession lines, regional rivalries, and trade routes across your continents.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Relics & Magical Artifacts",
      description:
        "Link legendary magic items to the heroes who wield them, the villains who seek them, and the vaults where they rest.",
      icon: "icon-[lucide--sparkles]",
    },
    {
      title: "World History & Eras",
      description:
        "Track historical ages, cataclysms, battles, and campaign events with an interactive timeline engine.",
      icon: "icon-[lucide--hourglass]",
    },
  ],
  exampleGraph: {
    title: "Sample Realm Relationship Graph",
    description:
      "How mages, city hubs, merchant guilds, and guard captains connect in the Fantasy demo vault.",
    steps: [
      {
        label: "Eldrin the Wise",
        sublabel: "Mysterious Archmage",
        relation: "frequents",
      },
      {
        label: "Black Iron Tavern",
        sublabel: "Lower District City Hub",
        relation: "patrolled by",
      },
      {
        label: "Captain Vaelen",
        sublabel: "Guard Captain",
        relation: "enforces order for",
      },
      {
        label: "The Gilded Hand",
        sublabel: "Wealthy Merchant Guild",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Fantasy Name Generator",
      description:
        "Generate names for noble lineages, ancient ruins, regional strongholds, and mythical figures.",
      href: "/generators/fantasy-names",
      badge: "Generator",
    },
    {
      title: "Pantheon Generator",
      description:
        "Forge custom mythologies, divine portfolios, sacred symbols, and clerical tenets.",
      href: "/generators/pantheon-generator",
      badge: "Generator",
    },
    {
      title: "Kingdom Generator",
      description:
        "Build feudal realms, government structures, regional rivalries, and economic exports.",
      href: "/generators/kingdom",
      badge: "Generator",
    },
    {
      title: "Dungeon Generator",
      description:
        "Design multi-level vaults, subterranean temples, and dangerous ruins for your campaign.",
      href: "/generators/dungeon-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Build Your World Graph",
    description:
      "Transform your scattered campaign notes into a living, visual world web with local-first privacy.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
