import type { LandingPageConfig } from "../schema";

export const dungeonsAndDragons: LandingPageConfig = {
  slug: "dungeons-and-dragons",
  kind: "system",
  theme: "fantasy",
  hub: "fantasy",
  seo: {
    title: "Codex Cryptica for D&D 5e Campaign Management",
    description:
      "Organise your D&D 5e campaign with connected characters, factions, locations, quests, maps, session notes, and worldbuilding tools.",
  },
  hero: {
    eyebrow: "5e Campaign & World Management",
    title: "Codex Cryptica for Dungeons & Dragons 5e",
    tagline:
      "Keep characters, factions, locations, quests, and campaign lore connected in one place.",
    problemStatement:
      "D&D campaigns quickly grow into a web of character backstories, quests, factions, locations, and NPCs. When the party follows a forgotten rumour to a distant stronghold, you shouldn't have to dig through scattered notes to remember who controls the region — or why it matters.",
  },
  useCases: [
    {
      title: "Adventuring Parties & Factions",
      description:
        "Map player characters, party patrons, rival adventuring guilds, and villainous factions with a visual relationship graph.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Dungeons, Settlements & Regions",
      description:
        "Connect dungeons, towns, strongholds, wilderness regions, and planar locations to the characters and factions that inhabit them.",
      icon: "icon-[lucide--castle]",
    },
    {
      title: "Quests, Clues & Session Notes",
      description:
        "Keep active quests, rumours, clues, session notes, and campaign milestones connected to the people and places they involve.",
      icon: "icon-[lucide--scroll]",
    },
    {
      title: "Magic Items & Pantheons",
      description:
        "Connect legendary items to their creators, owners, histories, gods, temples, and the adventures surrounding them.",
      icon: "icon-[lucide--sparkles]",
    },
  ],
  exampleGraph: {
    title: "Sample D&D 5e Campaign Web",
    description:
      "See how adventuring parties, patron guilds, villainous cults, and adventure sites connect in a campaign graph.",
    steps: [
      {
        label: "The Ashen Company",
        sublabel: "Adventuring Party",
        category: "faction",
      },
      {
        label: "Lord Caspian Vane",
        sublabel: "Patron • High Warden",
        relation: "Sponsored by",
        category: "character",
      },
      {
        label: "Cult of the Black Flame",
        sublabel: "Villainous Faction",
        relation: "Opposes",
        category: "faction",
      },
      {
        label: "Sunken Citadel of Ash",
        sublabel: "Ancient Citadel",
        relation: "Explores",
        category: "location",
      },
      {
        label: "Eye of the Sun God",
        sublabel: "Artifact of Power",
        relation: "Seeks",
        category: "item",
      },
    ],
  },
  recommendedTools: [
    {
      title: "D&D NPC Generator",
      description:
        "Create NPCs with distinct motives, personalities, backgrounds, and roles in your campaign.",
      href: "/tools/dnd-npc-generator",
      badge: "Generator",
    },
    {
      title: "Dungeon Generator",
      description:
        "Generate dungeons, dangerous locations, encounters, and adventure-ready details.",
      href: "/generators/dungeon-generator",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Create quest hooks, patron requests, mysteries, and complications for your campaign.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
    {
      title: "Magic Item Generator",
      description:
        "Create distinctive magic items, artefacts, histories, and adventure hooks.",
      href: "/generators/magic-item",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your D&D Campaign",
    description:
      "Keep your D&D campaign connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC or Hasbro, Inc. Dungeons & Dragons and D&D are registered trademarks of Wizards of the Coast LLC.",
};
