import type { LandingPageConfig } from "../schema";

export const fantasyWorldbuilding: LandingPageConfig = {
  slug: "fantasy-worldbuilding",
  kind: "genre",
  theme: "fantasy",
  seo: {
    title: "Fantasy Worldbuilding & Campaign Graph Tool | Codex Cryptica",
    description:
      "Build rich fantasy settings with connected pantheons, kingdom lineages, magic systems, and campaign timelines.",
  },
  hero: {
    eyebrow: "High & Dark Fantasy Worldbuilding",
    title: "Codex Cryptica for Fantasy Worldbuilding",
    tagline:
      "Weave pantheons, ancient magic, royal bloodlines, and epic world lore into an interconnected realm.",
    problemStatement:
      "Fantasy campaigns demand immense depth—from multi-generational royal dynasties and warring guilds to forgotten ruins and divine pantheons. Flat notes fail to capture how your world lives and breathes.",
  },
  useCases: [
    {
      title: "Pantheons & Cosmic Mythos",
      description:
        "Define divine hierarchies, holy domains, planar cosmology, and religious holy orders in one linked system.",
      icon: "icon-[lucide--sun]",
    },
    {
      title: "Kingdom Dynasties & Political Alliances",
      description:
        "Map out noble houses, succession crises, trade routes, and secret alliances across continents.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Relics, Artifacts & Magic Laws",
      description:
        "Link legendary magic items to the heroes, villains, and ancient dungeons where they rest.",
      icon: "icon-[lucide--sparkles]",
    },
    {
      title: "Chronological Timelines & Eras",
      description:
        "Track world ages, historical battles, and cataclysms with an interactive timeline engine.",
      icon: "icon-[lucide--hourglass]",
    },
  ],
  exampleGraph: {
    title: "Realm & Lineage Connection Graph",
    description:
      "See how deities, ancient artifacts, royal dynasties, and dungeon vaults intertwine.",
    steps: [
      { label: "Solar Deity Ignis", sublabel: "Primary Pantheon" },
      { label: "Order of the Sunburst", sublabel: "Holy Knights" },
      { label: "High Kingdom of Eldoria", sublabel: "Feudal Realm" },
      { label: "Crown of the Sun King", sublabel: "Relic Artifact" },
      { label: "Dungeon of the Forgotten Tomb", sublabel: "Adventure Site" },
    ],
  },
  recommendedTools: [
    {
      title: "Fantasy Name Generator",
      description:
        "Generate immersive names for elf nobles, dwarf strongholds, dragon lords, and ancient ruins.",
      href: "/generators/fantasy-names",
      badge: "Generator",
    },
    {
      title: "Pantheon & Deity Creator",
      description:
        "Forge custom mythologies, divine portfolios, sacred symbols, and clerical tenets.",
      href: "/generators/pantheon-generator",
      badge: "Generator",
    },
    {
      title: "Kingdom & Realm Builder",
      description:
        "Generate feudal realms, government types, regional threats, and economic exports.",
      href: "/generators/kingdom",
      badge: "Generator",
    },
    {
      title: "Dungeon Structural Builder",
      description:
        "Construct multi-level dungeons, ancient temples, and monster-infested vaults.",
      href: "/generators/dungeon-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Build Your Fantasy World",
    description:
      "Transform your scattered campaign notes into a living, visual world graph.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
