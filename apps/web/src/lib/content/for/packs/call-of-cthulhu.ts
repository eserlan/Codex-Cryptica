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
      "Investigative horror campaigns quickly grow into a web of clues, suspects, contacts, locations, and hidden connections. When the investigators follow an old lead to a forgotten archive, you shouldn't have to dig through scattered notes to remember who gave them the clue — or why it matters.",
  },
  useCases: [
    {
      title: "Clues, Evidence & Connections",
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
      title: "Session Notes & Active Leads",
      description:
        "Keep active leads, mystery timelines, session notes, and investigation milestones connected to the people and places they involve.",
      icon: "icon-[lucide--scroll]",
    },
  ],
  exampleGraph: {
    title: "Sample Call of Cthulhu Investigation Web",
    description:
      "See how an investigator, a police contact, a telegram, and a secret society lead to a hidden archive and its occult ledger.",
    steps: [
      {
        label: "Dr Evelyn Mercer",
        sublabel: "Investigator",
        relation: "consulted",
      },
      {
        label: "Inspector Thomas Vance",
        sublabel: "Police Contact",
        relation: "shared",
      },
      {
        label: "Telegram from Arkham",
        sublabel: "Clue",
        relation: "mentions",
      },
      {
        label: "The Orne Society",
        sublabel: "Secret Society",
        relation: "meets beneath",
      },
      {
        label: "St Bartholomew's Archive",
        sublabel: "Forgotten Archive",
        relation: "conceals",
      },
      {
        label: "The Ashen Ledger",
        sublabel: "Occult Ledger",
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
      title: "Faction Generator",
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
