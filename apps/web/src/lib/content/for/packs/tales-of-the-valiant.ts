import type { LandingPageConfig } from "../schema";

export const talesOfTheValiant: LandingPageConfig = {
  slug: "tales-of-the-valiant",
  kind: "system",
  theme: "fantasy",
  hub: "fantasy",
  seo: {
    title: "Codex Cryptica for Tales of the Valiant Campaigns",
    description:
      "A campaign manager built for Tales of the Valiant and Black Flag Roleplaying. Track lineages, heritages, interactive Luck pools, Doom, and BFRD stat blocks.",
    image: "https://assets.codexcryptica.com/og/tales-of-the-valiant.jpg",
    imageAlt:
      "Adventuring party planning an expedition across a dungeon map with Black Flag character sheets, dice, and faction tokens",
  },
  hero: {
    eyebrow: "Campaign Management for Tales of the Valiant",
    title: "Codex Cryptica for Tales of the Valiant",
    tagline:
      "Manage lineages, heritages, interactive Luck reserves, adversary Doom points, and BFRD stat blocks without getting bogged down in paper.",
    problemStatement:
      "Black Flag campaigns give heroes deeper origins with distinct Lineages and Heritages, volatile Luck economies, and tactical monster actions. Running an adventure path means keeping track of who earned Luck last encounter, which villain holds Doom points, and where every faction patron stands when your players go off-book.",
  },
  useCases: [
    {
      title: "Lineage, Heritage & Backstory Connections",
      description:
        "Separate cultural upbringing from ancestral lineage on your character entities, connecting mentors, clan strongholds, and ancestral relics directly to the campaign map.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Interactive Luck Tracking Across Sheets & VTT",
      description:
        "Track party Luck points with one-click spend and gain controls. Adjust Luck from character sheets or directly on tokens in the virtual tabletop with automatic Long Rest resets.",
      icon: "icon-[lucide--clover]",
    },
    {
      title: "Adversary Doom Pools & Boss Mechanics",
      description:
        "Equip legendary monsters and villainous lieutenants with verified Doom counters. Spend Doom on dramatic tactical actions without leaking pools to standard minions.",
      icon: "icon-[lucide--skull]",
    },
    {
      title: "BFRD Stat Blocks & TovChargen Import",
      description:
        "Generate or import official Black Flag Reference Document monsters, Quick NPCs, and magic items with native armour class, saves, and attack routines ready for session prep.",
      icon: "icon-[lucide--scroll]",
    },
  ],
  exampleGraph: {
    title: "Sample Tales of the Valiant Campaign Web",
    description:
      "See how an adventuring company, their lineage patrons, rival doom-wielders, and ancient labyrinth sites connect in one local campaign graph.",
    steps: [
      {
        label: "The Ironbound Free Company",
        sublabel: "Adventuring Party",
        category: "faction",
      },
      {
        label: "Valerius of Stonehaven",
        sublabel: "Dwarf / Fire Heritage Fighter",
        relation: "Frontline member",
        category: "character",
      },
      {
        label: "Warden Kaelen",
        sublabel: "Patron / Circle of Wyrd",
        relation: "Guided by",
        category: "character",
      },
      {
        label: "The Weeping Maw",
        sublabel: "Labyrinth Complex",
        relation: "Exploring",
        category: "location",
      },
      {
        label: "Azrath the Bonecarver",
        sublabel: "Doom Pool: 3 / Boss",
        relation: "Ambushed by",
        category: "creature",
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
      href: "/generators/quick-npc",
      badge: "Generator",
    },
    {
      title: "Monster & Creature Generator",
      description:
        "Create authentic Black Flag beasts and horrors equipped with native traits and Doom pools.",
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
      "Keep lineages, heritages, Luck pools, boss Doom points, and adventure notes connected across every session in a fast, private, local-first workspace.",
    buttonText: "Start Campaign Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management platform and is not affiliated with, endorsed, or sponsored by Open Design LLC d/b/a Kobold Press. Tales of the Valiant and Black Flag Roleplaying are trademarks of Open Design LLC. This work includes open game mechanics from the Black Flag Reference Document, made available under the Creative Commons Attribution 4.0 International License (CC BY 4.0) by Open Design LLC.",
};
