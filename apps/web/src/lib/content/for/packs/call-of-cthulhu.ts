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
      "Organise your Call of Cthulhu scenarios and campaigns with connected Investigators, clues, handouts, cults, occult tomes, and Keeper notes in one local-first workspace.",
    image: "https://assets.codexcryptica.com/og/call-of-cthulhu.jpg",
    imageAlt:
      "1920s detective investigator desk with cryptic telegrams, Boston globe, magnifying glass, police reports, and occult grimoire",
  },
  hero: {
    eyebrow: "Investigation & Keeper Notes Management",
    title: "Codex Cryptica for Call of Cthulhu",
    tagline:
      "Keep Investigators, contacts, handouts, clues, cults, and tomes connected in one local-first workspace.",
    problemStatement:
      "Call of Cthulhu scenarios quickly develop into webs of open leads, witness testimonies, physical handouts, and occult conspiracies across multiple sessions. When your Investigators follow a trail back to an archive or re-interview a local coroner weeks later, you shouldn't have to scramble through scattered notes to recall which clue led them there, what they uncovered, or which leads remain unresolved.",
  },
  useCases: [
    {
      title: "Clue Webs & Evidence Tracking",
      description:
        "Map how crime scenes, witness testimonies, discovered leads, and physical handouts connect visually so you can track the full web of evidence across your scenario.",
      icon: "icon-[lucide--search]",
    },
    {
      title: "Cults, Informants & Suspects",
      description:
        "Track cultists, police contacts, witnesses, medical examiners, and academic specialists alongside the organisations and locations they are tied to.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Occult Tomes, Handouts & Lore",
      description:
        "Link newspaper clippings, letters, translated manuscripts, and occult relics directly to the people, locations, and clues they reveal.",
      icon: "icon-[lucide--book-open]",
    },
    {
      title: "Events, Timelines & Keeper Notes",
      description:
        "Track chronological events, escalating scenario countdowns, active Investigator leads, and Keeper session notes in one connected workspace.",
      icon: "icon-[lucide--scroll]",
    },
  ],
  exampleGraph: {
    title: "Scenario Investigation Web",
    description:
      "One Investigator, her contacts, discovered handouts, the cult she investigates, and the occult ledger she seeks to decipher.",
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
        sublabel: "Contact • Police Inspector",
        relation: "Consults with",
        category: "character",
      },
      {
        label: "Cryptic Telegram",
        sublabel: "Handout • Telegram",
        relation: "Received",
        category: "item",
      },
      {
        label: "The Orne Society",
        sublabel: "Cult",
        relation: "Investigates",
        category: "faction",
      },
      {
        label: "St Bartholomew's Archive",
        sublabel: "Location • Private Library",
        relation: "Researches at",
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
        "Create informants, academics, police detectives, and cultists with distinct motives, secrets, and backgrounds for your scenarios.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Secret Society Generator",
      description:
        "Design secretive brotherhoods, occult orders, and cult networks operating behind the scenes.",
      href: "/generators/secret-society",
      badge: "Generator",
    },
    {
      title: "News Sheet & Handout Generator",
      description:
        "Create in-world period newspaper clippings, police blotters, and classified notices as physical or digital handouts for your Investigators.",
      href: "/generators/news-sheet-generator",
      badge: "Generator",
    },
    {
      title: "Settlement & District Generator",
      description:
        "Generate towns, coastal ports, and urban districts to anchor your scenario locations and investigation scenes.",
      href: "/generators/settlement",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your Investigation",
    description:
      "Map clue networks, track handouts and suspects, and run your Call of Cthulhu scenarios in a local-first workspace.",
    buttonText: "Start Your Investigation Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Chaosium Inc. Call of Cthulhu is a registered trademark of Chaosium Inc.",
};
