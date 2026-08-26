import type { LandingPageConfig } from "../schema";

export const callOfCthulhu: LandingPageConfig = {
  slug: "call-of-cthulhu",
  kind: "system",
  theme: "horror",
  hub: "cosmic-horror",
  surfaceStyle: "sharp",
  seo: {
    title: "Codex Cryptica for Call of Cthulhu Keeper Notes & Scenarios",
    description:
      "Organise your Call of Cthulhu scenarios and campaigns with connected investigators, clues, handouts, cult conspiracies, occult tomes, and timeline notes.",
  },
  hero: {
    eyebrow: "Investigation & Keeper Notes Management",
    title: "Codex Cryptica for Call of Cthulhu",
    tagline:
      "Keep investigators, contacts, handouts, clues, cult conspiracies, and forbidden tomes connected in one private workspace.",
    problemStatement:
      "Call of Cthulhu scenarios quickly become intricate webs of leads, handouts, witness testimonies, eccentric contacts, and occult conspiracies. When your investigators pursue a cold lead to a forgotten archive or question a terrified coroner three sessions later, you shouldn't have to scramble through loose notes to remember which clue brought them there — or what secrets remain hidden.",
  },
  useCases: [
    {
      title: "Clue Webs & Evidence Tracking",
      description:
        "Map how crime scenes, witness testimonies, discovered leads, and physical handouts connect visually so you always know where an investigation can lead next.",
      icon: "icon-[lucide--search]",
    },
    {
      title: "Cults, Informants & Suspects",
      description:
        "Track secretive cabals, Miskatonic University academics, police contacts, coroners, and cult leaders alongside the locations and dark rites they control.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Occult Tomes, Handouts & Lore",
      description:
        "Link newspaper clippings, telegrams, translated manuscripts, and ancient artefacts directly to the locations, rituals, and mysteries they unravel.",
      icon: "icon-[lucide--book-open]",
    },
    {
      title: "Timelines & Case Milestones",
      description:
        "Keep chronological events, impending cult rituals, active investigator leads, and Keeper session notes connected across every stage of your campaign.",
      icon: "icon-[lucide--scroll]",
    },
  ],
  exampleGraph: {
    title: "Scenario Investigation Web",
    description:
      "One investigator, her contacts, discovered handouts, the occult cabal she pursues, and the forbidden tome she seeks to decipher.",
    badgeLabel: "Investigation Web",
    palette: "oxblood",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "Dr Evelyn Mercer",
        sublabel: "Investigator • Antiquarian",
        category: "character",
      },
      {
        label: "Inspector Thomas Vance",
        sublabel: "Contact • Arkham Police",
        relation: "Consults with",
        category: "character",
      },
      {
        label: "Telegram from Arkham",
        sublabel: "Handout • Wire",
        relation: "Received",
        category: "item",
      },
      {
        label: "The Orne Society",
        sublabel: "Cult • Secret Cabal",
        relation: "Investigates",
        category: "faction",
      },
      {
        label: "St Bartholomew's Archive",
        sublabel: "Location • Private Library",
        relation: "Searches",
        category: "location",
      },
      {
        label: "The Ashen Ledger",
        sublabel: "Tome • Occult Manuscript",
        relation: "Deciphers",
        category: "item",
      },
    ],
  },
  recommendedTools: [
    {
      title: "NPC & Contact Generator",
      description:
        "Create investigators, informants, academics, and cultists with distinct motives, secrets, and backgrounds.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Secret Society Generator",
      description:
        "Design esoteric brotherhoods, occult cabals, doomsday cults, and secret investigator alliances.",
      href: "/generators/secret-society",
      badge: "Generator",
    },
    {
      title: "News Sheet & Handout Generator",
      description:
        "Generate in-world period newspaper articles, police blotters, strange notices, and classifieds to hand directly to your players.",
      href: "/generators/news-sheet-generator",
      badge: "Generator",
    },
    {
      title: "Town & Settlement Generator",
      description:
        "Build coastal fishing villages, university districts, isolated manors, and asylum locations.",
      href: "/generators/settlement",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your Investigation",
    description:
      "Map clue networks, track handouts and suspects, and run your Call of Cthulhu scenarios with complete local privacy.",
    buttonText: "Start Your Investigation Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Chaosium Inc. Call of Cthulhu is a registered trademark of Chaosium Inc.",
};
