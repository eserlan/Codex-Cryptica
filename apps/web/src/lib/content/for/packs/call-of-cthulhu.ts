import type { LandingPageConfig } from "../schema";

export const callOfCthulhu: LandingPageConfig = {
  slug: "call-of-cthulhu",
  kind: "system",
  theme: "horror",
  seo: {
    title: "Codex Cryptica for Call of Cthulhu Campaign Management",
    description:
      "Organise your Call of Cthulhu mystery campaigns with connected investigators, clues, cult conspiracies, occult relics, and session notes.",
  },
  hero: {
    eyebrow: "Investigative Campaign Management",
    title: "Codex Cryptica for Call of Cthulhu",
    tagline:
      "Keep investigators, contacts, clues, cult conspiracies, and mystery lore connected in one place.",
    problemStatement:
      "Investigative horror campaigns quickly grow into a tangled web of clues, suspect testimonies, cult connections, and hidden relics. When your investigators follow a forgotten lead to an old archive, you shouldn't have to search through scattered session notes to remember which contact provided the clue — or what it reveals.",
  },
  useCases: [
    {
      title: "Investigative Clues & Evidence Webs",
      description:
        "Map how clues, testimonies, documents, and crime scenes connect using a visual relationship graph.",
      icon: "icon-[lucide--search]",
    },
    {
      title: "Cult Conspiracies & Secret Contacts",
      description:
        "Connect shadowy orders, police informants, academics, and cult leaders to the places they operate.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Occult Relics & Archival Lore",
      description:
        "Link ancient artefacts, forbidden manuscripts, and historical events to the mysteries they unravel.",
      icon: "icon-[lucide--book-open]",
    },
    {
      title: "Session Recaps & Mystery Logs",
      description:
        "Keep active leads, mystery timelines, session notes, and investigation milestones connected to the people and places they involve.",
      icon: "icon-[lucide--scroll]",
    },
  ],
  exampleGraph: {
    title: "Sample Call of Cthulhu Investigation Web",
    description:
      "See how investigators, police contacts, evidence, cult orders, and forbidden artefacts connect in a mystery web.",
    steps: [
      {
        label: "Dr. Evelyn Mercer",
        sublabel: "Lead Investigator",
        relation: "consulted",
      },
      {
        label: "Inspector Thomas Vance",
        sublabel: "Police Contact",
        relation: "uncovered",
      },
      {
        label: "The Blackwood Telegram",
        sublabel: "Cryptic Clue",
        relation: "exposes",
      },
      {
        label: "Order of the Silver Eye",
        sublabel: "Esoteric Cult",
        relation: "meets beneath",
      },
      {
        label: "Miskatonic Vaults",
        sublabel: "Archival Vault",
        relation: "conceals",
      },
      {
        label: "The Obsidian Codex",
        sublabel: "Forbidden Artefact",
      },
    ],
  },
  recommendedTools: [
    {
      title: "NPC Generator",
      description:
        "Create investigators, informants, academics, and cultists with distinct motives and backgrounds.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Faction & Society Generator",
      description:
        "Design secret societies, esoteric orders, occult cults, and investigator alliances.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate mystery leads, strange incidents, police reports, and investigation hooks.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build coastal towns, university districts, isolated manors, and asylum locations.",
      href: "/generators/settlement",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your Investigation",
    description:
      "Keep your mystery campaign connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Chaosium Inc. Call of Cthulhu is a registered trademark of Chaosium Inc.",
};
