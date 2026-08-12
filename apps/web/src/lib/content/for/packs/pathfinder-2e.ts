import type { LandingPageConfig } from "../schema";

export const pathfinder2e: LandingPageConfig = {
  slug: "pathfinder-2e",
  kind: "system",
  theme: "fantasy",
  hub: "fantasy",
  seo: {
    title: "Codex Cryptica for Pathfinder 2e Campaign Management",
    description:
      "Organise your Pathfinder 2e campaign with connected nations, secret societies, deities, adventure paths, session recaps, and worldbuilding tools.",
  },
  hero: {
    eyebrow: "Pathfinder 2e Campaign & World Management",
    title: "Codex Cryptica for Pathfinder 2e",
    tagline:
      "Keep characters, factions, nations, deities, adventure paths, and campaign lore connected in one place.",
    problemStatement:
      "Pathfinder 2e campaigns quickly grow into a web of characters, factions, nations, deities, locations, and long-running adventure arcs. When the party crosses regions or uncovers a hidden faction, you shouldn't have to dig through scattered notes to remember who is connected — or why it matters.",
  },
  useCases: [
    {
      title: "Deities, Pantheons & Holy Orders",
      description:
        "Map divine domains, religious orders, sacred relics, and planar heralds with a visual relationship graph.",
      icon: "icon-[lucide--sun]",
    },
    {
      title: "Nations, Settlements & Factions",
      description:
        "Connect regional realms, settlements, secret societies, and noble houses to the characters who guide or oppose them.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Adventure Paths & Session Notes",
      description:
        "Keep multi-part adventure arcs, mystery clues, session recaps, and campaign milestones connected to the people and places they involve.",
      icon: "icon-[lucide--scroll]",
    },
    {
      title: "Ancestries, Cultures & History",
      description:
        "Connect ancestries and cultures to regions, historical events, factions, notable characters, and the places they call home.",
      icon: "icon-[lucide--book-open]",
    },
  ],
  exampleGraph: {
    title: "Sample Pathfinder 2e Campaign Web",
    description:
      "See how religious orders, realm champions, secret cabals, and ancient relics connect in a campaign graph.",
    steps: [
      {
        label: "Sanctuary of the Golden Dawn",
        sublabel: "Sun Temple",
        category: "location",
      },
      {
        label: "Champion Vaelis",
        sublabel: "Realm Defender",
        relation: "Defended by",
        category: "character",
      },
      {
        label: "The Ashen Veil",
        sublabel: "Secret Necromantic Society",
        relation: "Threatened by",
        category: "faction",
      },
      {
        label: "Blackstone Keep",
        sublabel: "Ancient Fortress",
        relation: "Allied with",
        category: "location",
      },
      {
        label: "The Ember Reliquary",
        sublabel: "Artifact of Power",
        relation: "Houses",
        category: "item",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
      description:
        "Design secret societies, religious orders, noble houses, and rival factions for your world.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create NPCs with distinct motives, personalities, backgrounds, and campaign roles.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Pantheon Generator",
      description:
        "Design divine portfolios, sacred domains, clerical tenets, and religious orders.",
      href: "/generators/pantheon-generator",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate adventure hooks, patron requests, mysteries, and campaign complications.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your Pathfinder Campaign",
    description:
      "Keep your Pathfinder 2e campaign connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Paizo Inc. Pathfinder and its logos are registered trademarks of Paizo Inc.",
};
