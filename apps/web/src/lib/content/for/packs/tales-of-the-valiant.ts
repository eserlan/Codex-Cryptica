import type { LandingPageConfig } from "../schema";

export const talesOfTheValiant: LandingPageConfig = {
  slug: "tales-of-the-valiant",
  kind: "system",
  theme: "fantasy",
  hub: "fantasy",
  seo: {
    title: "Codex Cryptica for Tales of the Valiant Campaigns",
    description:
      "Organise a Tales of the Valiant campaign with linked notes, character details, Luck tracking, BFRD encounter Doom notes, and stat sheets.",
    image: "https://assets.codexcryptica.com/og/tales-of-the-valiant.jpg",
    imageAlt:
      "Adventuring party planning an expedition across a dungeon map with Black Flag character sheets, dice, and faction tokens",
  },
  hero: {
    eyebrow: "Campaign Management for Tales of the Valiant",
    title: "Codex Cryptica for Tales of the Valiant",
    tagline:
      "Connect character details, people, places, factions and quests. Keep Luck and optional encounter Doom notes beside the BFRD stat blocks you need for play.",
    problemStatement:
      "A campaign hub links characters, places, factions and quests; the session journal records what happened, and a focused run sheet prepares what comes next. Add ToV rules notes where useful: track each character's Luck, record the optional BFRD Doom pool for an encounter, and keep any table-made rulings beside the relevant scene.",
  },
  useCases: [
    {
      title: "Lineage, Heritage & Backstory Connections",
      description:
        "Record Lineage, Heritage and Background on character sheets, then connect mentors, community ties and places that make those details matter in play.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Interactive Luck Tracking Across Sheets & VTT",
      description:
        "Use one-click controls to track Luck on character sheets or selected tokens. Codex does not apply a Long Rest reset; the BFRD does not prescribe one.",
      icon: "icon-[lucide--clover]",
    },
    {
      title: "Encounter Doom Notes & Creature Counters",
      description:
        "Record the BFRD's optional CR-based Doom pool for an encounter. Codex provides a creature-scoped counter field for tracking allocations, while the published rule can affect creatures in the encounter.",
      icon: "icon-[lucide--skull]",
    },
    {
      title: "BFRD Stat Sheets & Generators",
      description:
        "Use built-in Black Flag stat sheet templates and generators for monsters, Quick NPCs, and magic items, with armour class, saves, and attack routines ready for session prep.",
      icon: "icon-[lucide--scroll]",
    },
  ],
  exampleGraph: {
    title: "Sample Tales of the Valiant Campaign Web",
    description:
      "See how a character's Lineage, Heritage, Background and motivation can connect to people, places, factions and open quests.",
    steps: [
      {
        label: "The Ironbound Free Company",
        sublabel: "Adventuring Party",
        category: "faction",
      },
      {
        label: "Valerius of Stonehaven",
        sublabel: "Human / Cloudborn / Soldier",
        relation: "Frontline member",
        category: "character",
      },
      {
        label: "Mara Venn",
        sublabel: "Missing squadmate",
        relation: "Searching for",
        category: "character",
      },
      {
        label: "The Weeping Maw",
        sublabel: "Labyrinth Complex",
        relation: "Exploring",
        category: "location",
      },
      {
        label: "Guild of the Quay",
        sublabel: "Controls river-port access",
        relation: "Needs passage from",
        category: "faction",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Encounter Assistance",
      description:
        "Draft combat encounters with party-scaled qualitative challenge ratings and BFRD creature roles.",
      href: "/generators/encounter",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Produce Quick NPCs with challenge ratings or full levelled adventurers with BFRD stats.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Monster & Creature Generator",
      description:
        "Create Black Flag beasts and horrors with native traits and stat blocks.",
      href: "/generators/creature",
      badge: "Generator",
    },
    {
      title: "Magic Item Generator",
      description:
        "Generate enchanted arms, armour, and wondrous items with BFRD rarity and activation economy.",
      href: "/generators/magic-item",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your Tales of the Valiant Campaign",
    description:
      "Keep characters, locations, factions, quests, session journals and run sheets connected, with ToV rules notes alongside them in a private, local-first workspace.",
    buttonText: "Start Campaign Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management platform and is not affiliated with, endorsed, or sponsored by Open Design LLC d/b/a Kobold Press. Tales of the Valiant and Black Flag Roleplaying are trademarks of Open Design LLC. This work includes open game mechanics from the Black Flag Reference Document, made available under the Creative Commons Attribution 4.0 International License (CC BY 4.0) by Open Design LLC.",
};
