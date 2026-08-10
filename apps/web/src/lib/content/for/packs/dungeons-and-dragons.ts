import type { LandingPageConfig } from "../schema";

export const dungeonsAndDragons: LandingPageConfig = {
  slug: "dungeons-and-dragons",
  kind: "system",
  theme: "fantasy",
  seo: {
    title: "Codex Cryptica for D&D 5e Campaign Management",
    description:
      "Organize D&D 5e adventuring parties, villainous factions, regional maps, dungeon vaults, session prep, and magic item registries in one connected campaign workspace.",
  },
  hero: {
    eyebrow: "5e Campaign & Lore Management",
    title: "Codex Cryptica for Dungeons & Dragons 5e",
    tagline:
      "Keep adventuring parties, villainous factions, regional strongholds, quest hooks, and magic item vaults connected in one local-first campaign space.",
    problemStatement:
      "D&D campaigns quickly grow into a web of player backstories, patron quests, regional factions, and dungeon vaults. When your party decides to follow a minor rumor to a distant stronghold, you shouldn't have to scramble through loose notes to remember which faction controls the region.",
  },
  useCases: [
    {
      title: "Adventuring Parties & Factions",
      description:
        "Map player characters, party patrons, rival adventuring guilds, and villainous factions with visual relationship webs.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Dungeon Vaults & Wilderness Regions",
      description:
        "Organize subterranean complexes, regional maps, wilderness strongholds, and planar portals into linked world hubs.",
      icon: "icon-[lucide--castle]",
    },
    {
      title: "Session Prep & Quest Registries",
      description:
        "Track active quest hooks, mystery clues, session recaps, and campaign milestones with local-first privacy.",
      icon: "icon-[lucide--scroll]",
    },
    {
      title: "Magic Items & Divine Pantheons",
      description:
        "Catalog rare artifacts, attunement histories, deity domains, and sacred holy orders alongside your entity lore.",
      icon: "icon-[lucide--sparkles]",
    },
  ],
  exampleGraph: {
    title: "Sample D&D 5e Campaign Web",
    description:
      "See how adventuring parties, patron guilds, villainous cults, and ancient vaults connect in a campaign graph.",
    steps: [
      {
        label: "The Ashen Company",
        sublabel: "Adventuring Party",
        relation: "sponsored by",
      },
      {
        label: "Lord Caspian Vane",
        sublabel: "Patron • High Warden",
        relation: "investigating",
      },
      {
        label: "Cult of the Black Flame",
        sublabel: "Villainous Faction",
        relation: "operating in",
      },
      {
        label: "Sunken Citadel of Ash",
        sublabel: "Dungeon Vault",
        relation: "houses",
      },
      {
        label: "Eye of the Sun God",
        sublabel: "Artifact of Power",
      },
    ],
  },
  recommendedTools: [
    {
      title: "D&D NPC Generator",
      description:
        "Instantly spin up D&D 5e NPCs with distinct motives, quirks, personality traits, and party roles.",
      href: "/tools/dnd-npc-generator",
      badge: "Generator",
    },
    {
      title: "Dungeon Generator",
      description:
        "Generate multi-level dungeon vaults, lair encounters, and subterranean hazards.",
      href: "/generators/dungeon-generator",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Create compelling quest hooks, patron assignments, and campaign plot twists.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
    {
      title: "Magic Item Generator",
      description:
        "Design unique magic items, ancient artifacts, and attunement lore for your campaign rewards.",
      href: "/generators/magic-item",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organize Your D&D Campaign",
    description:
      "Take control of your D&D 5e world with visual relationship graphs, interactive maps, and local-first privacy.",
    buttonText: "Start D&D Campaign Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC or Hasbro, Inc. Dungeons & Dragons and D&D are registered trademarks of Wizards of the Coast LLC.",
};
