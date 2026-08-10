import type { LandingPageConfig } from "../schema";

export const pathfinder2e: LandingPageConfig = {
  slug: "pathfinder-2e",
  kind: "system",
  theme: "fantasy",
  seo: {
    title: "Codex Cryptica for Pathfinder 2e Campaign Management",
    description:
      "Organise your Pathfinder 2e campaign with connected nations, secret societies, deities, adventure paths, session recaps, and worldbuilding tools.",
  },
  hero: {
    eyebrow: "Pathfinder 2e Campaign & World Management",
    title: "Codex Cryptica for Pathfinder 2e",
    tagline:
      "Keep ancestries, regional nations, secret societies, deities, and adventure paths connected in one place.",
    problemStatement:
      "Pathfinder 2e campaigns thrive on intricate world lore, layered adventure paths, multi-faction politics, and deep regional histories. When your party travels between sprawling city-states or uncovers an ancient conspiratorial order, you shouldn't have to search through scattered documents to trace which faction pulls the strings — or how it impacts the realm.",
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
        "Connect regional realms, trade metropolises, secret cabals, and noble houses to the characters who guide or oppose them.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Adventure Paths & Session Notes",
      description:
        "Keep multi-part adventure arcs, mystery clues, session recaps, and campaign milestones organized in local-first storage.",
      icon: "icon-[lucide--scroll]",
    },
    {
      title: "Ancestries, Cultures & Lore Fragments",
      description:
        "Catalog regional ancestries, ancient historical eras, legendary artifacts, and world lore alongside your campaign entities.",
      icon: "icon-[lucide--book-open]",
    },
  ],
  exampleGraph: {
    title: "Sample Pathfinder 2e Campaign Web",
    description:
      "See how noble houses, divine cults, regional strongholds, and ancient artifacts connect in a campaign graph.",
    steps: [
      {
        label: "House of Sarenrae",
        sublabel: "Sun Deity Cathedral",
        relation: "protects",
      },
      {
        label: "High Warden Kaelen",
        sublabel: "Paladin • Realm Defender",
        relation: "opposes",
      },
      {
        label: "The Whispering Cabal",
        sublabel: "Secret Necromantic Society",
        relation: "infiltrates",
      },
      {
        label: "Citadel of the Undying",
        sublabel: "Subterranean Fortress",
        relation: "guards",
      },
      {
        label: "Orb of the Dawn",
        sublabel: "Relic of Power",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Fantasy Name Generator",
      description:
        "Generate names for regional strongholds, noble lineages, ancient ruins, and mythical figures.",
      href: "/tools/fantasy-name-generator",
      badge: "Generator",
    },
    {
      title: "Pantheon Generator",
      description:
        "Design custom mythologies, divine portfolios, sacred symbols, and clerical tenets for your setting.",
      href: "/generators/pantheon-generator",
      badge: "Generator",
    },
    {
      title: "Kingdom Generator",
      description:
        "Build feudal realms, government structures, regional rivalries, and trade exports for your world.",
      href: "/generators/kingdom",
      badge: "Generator",
    },
    {
      title: "Dungeon Generator",
      description:
        "Generate subterranean temples, ruins, encounters, and adventure-ready locations.",
      href: "/generators/dungeon-generator",
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
