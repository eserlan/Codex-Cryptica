import type { LandingPageConfig } from "../schema";

export const dungeonsAndDragons: LandingPageConfig = {
  slug: "dungeons-and-dragons",
  kind: "system",
  theme: "fantasy",
  hub: "fantasy",
  seo: {
    title: "Codex Cryptica for D&D 5e Campaign Management",
    description:
      "A campaign manager for D&D Dungeon Masters. Keep NPCs, factions, locations, quests, maps, and session notes connected between sessions.",
    image: "https://assets.codexcryptica.com/og/dungeons-and-dragons.jpg",
    imageAlt:
      "Adventurer tavern table with parchment dungeon battlemap, glowing d20 dice, quest scrolls, and open spellbook",
  },
  hero: {
    eyebrow: "Campaign Management for Dungeon Masters",
    title: "Codex Cryptica for Dungeons & Dragons 5e",
    tagline:
      "Keep every NPC, faction, location, and quest in your campaign connected — and findable when the party goes off-book.",
    problemStatement:
      "Every session adds another NPC, another rumour, and another faction the party has annoyed. Three months in, you are the one who has to remember why the local warden owes them a favour — usually mid-session, while five players wait for you to find the note.",
  },
  useCases: [
    {
      title: "The Party, Their Allies & Their Enemies",
      description:
        "Track the party, the NPCs from their backstories, the patrons who send them on quests, and the factions they have made enemies of — all on one relationship graph.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Dungeons, Settlements & Regions",
      description:
        "Connect dungeons, towns, strongholds, wilderness regions, and other planes to the people and factions who fight over them.",
      icon: "icon-[lucide--castle]",
    },
    {
      title: "Quests, Clues & Session Notes",
      description:
        "Keep active quests, the hooks your party ignored, the clues they have found, and last session's notes tied to the people and places involved.",
      icon: "icon-[lucide--scroll]",
    },
    {
      title: "Magic Items, Gods & Lore",
      description:
        "Link a legendary item to who forged it, who lost it, which temple wants it back, and the adventure that put it in the party's hands.",
      icon: "icon-[lucide--sparkles]",
    },
  ],
  exampleGraph: {
    title: "Sample D&D Campaign Web",
    description:
      "See how a party, its patron, the villains hunting it, and the place they are heading next connect in one campaign graph.",
    steps: [
      {
        label: "The Ashen Company",
        sublabel: "The Party",
        category: "faction",
      },
      {
        label: "Lord Caspian Vane",
        sublabel: "Patron • High Warden",
        relation: "Backed by",
        category: "character",
      },
      {
        label: "Cult of the Black Flame",
        sublabel: "Enemy Cult",
        relation: "Hunted by",
        category: "faction",
      },
      {
        label: "The Drowned Hold",
        sublabel: "Ruined Dwarven Stronghold",
        relation: "Delving into",
        category: "location",
      },
      {
        label: "Eye of the Sun God",
        sublabel: "Lost Artifact",
        relation: "Searching for",
        category: "item",
      },
    ],
  },
  recommendedTools: [
    {
      title: "D&D NPC Generator",
      description:
        "Create an NPC with a name, a motive, and a reason to care about the party — during prep or mid-session.",
      href: "/tools/dnd-npc-generator",
      badge: "Generator",
    },
    {
      title: "Dungeon Generator",
      description:
        "Generate a dungeon with rooms, hazards, and inhabitants for the session you did not prepare.",
      href: "/generators/dungeon-generator",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Create hooks, patron requests, rumours, and complications to drop in when the party finishes early.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
    {
      title: "Magic Item Generator",
      description:
        "Create magic items that come with a history, a former wielder, and a hook attached.",
      href: "/generators/magic-item",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Keep Your Campaign Straight When the Party Doesn't",
    description:
      "Keep your campaign's people, places, and plots connected between sessions, with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC or Hasbro, Inc. Dungeons & Dragons and D&D are registered trademarks of Wizards of the Coast LLC.",
};
