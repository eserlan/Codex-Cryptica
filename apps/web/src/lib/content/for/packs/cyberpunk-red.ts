import type { LandingPageConfig } from "../schema";

export const cyberpunkRed: LandingPageConfig = {
  slug: "cyberpunk-red",
  kind: "system",
  theme: "cyberpunk",
  hub: "cyberpunk",
  surfaceStyle: "sharp",
  seo: {
    title: "Codex Cryptica for Cyberpunk RED Campaign Management",
    description:
      "Organise your Cyberpunk RED campaign with connected fixers, megacorps, boostergangs, edgerunner crews, deal locations, and gig recaps.",
    image: "https://assets.codexcryptica.com/og/cyberpunk-red.jpg",
    imageAlt:
      "Edgerunner mercenary workbench with cyberdeck holomap of Night City, datashards, cyberware, and neon skyline view",
  },
  hero: {
    eyebrow: "Time of the RED Campaign & Crew Management",
    title: "Codex Cryptica for Cyberpunk RED",
    tagline:
      "Keep fixers, edgerunner crews, megacorp handlers, boostergang turf, and high-risk gigs connected in one local-first workspace.",
    problemStatement:
      "In the Time of the RED, survival turns on who you know, what you owe, and who you crossed on your last run. When your crew takes a covert gig in the Combat Zone, or an old choom from your Lifepath calls in a desperate favour, you shouldn't have to scramble through scattered notes to recall which fixer brokered the payout, which boostergang claims the alley, or which megacorp exec is quietly funding the hit.",
  },
  useCases: [
    {
      title: "Fixers, Edgerunner Crews & Contacts",
      description:
        "Map the web between district Fixers, Solos, Netrunners, Techs, Medtechs, and Lawmen alongside trusted chooms, unpaid street debts, and Lifepath rivalries that tie them together.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Megacorps, Boostergangs & Nomad Packs",
      description:
        "Track corporate executives, boostergang turf, Nomad family convoys, and black-market syndicates across Night City's contested districts.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Gigs, Night Markets & Local Data Pools",
      description:
        "Connect active job briefs, fixer cut percentages, scavenged cargo, encrypted datashards, and debrief notes to the crews and locations involved.",
      icon: "icon-[lucide--file-text]",
    },
    {
      title: "Combat Zones, Concourse Towers & Safehouses",
      description:
        "Catalogue cube hotels, corporate concourses, abandoned subways, container parks, and fortified bolt-holes with connected maps and district notes.",
      icon: "icon-[lucide--map-pin]",
    },
  ],
  exampleGraph: {
    title: "Night City Gig & Contact Web",
    description:
      "One district Fixer, his corporate client, the boostergang guarding the drop zone, the target datashard, and the Solo on contract.",
    badgeLabel: "Gig & Contact Web",
    palette: "default",
    surface: "dark",
    steps: [
      {
        label: "Jax 'Chrome' Vance",
        sublabel: "Fixer • District Broker",
        category: "character",
      },
      {
        label: "Zetatech Operations",
        sublabel: "Megacorp • Client",
        relation: "Brokers gig for",
        category: "faction",
      },
      {
        label: "Iron Sights",
        sublabel: "Boostergang • Turf Rival",
        relation: "Evades territory of",
        category: "faction",
      },
      {
        label: "The Docks Container Yard",
        sublabel: "Combat Zone • Drop Point",
        relation: "Coordinates drop at",
        category: "location",
      },
      {
        label: "Encrypted Biometric Shard",
        sublabel: "Datashard • Stolen Intel",
        relation: "Fences",
        category: "item",
      },
      {
        label: "Rook",
        sublabel: "Solo • Merc for Hire",
        relation: "Hires on contract",
        category: "character",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
      description:
        "Design megacorp subsidiaries, boostergangs, Nomad packs, and private security syndicates.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create Fixers, Solos, Netrunners, Exec handlers, and street-level contacts with distinct motivations and cyberware notes.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build urban blocks, corporate concourses, Combat Zone ruins, Night Markets, and container settlements.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate gig briefs, corporate extractions, turf wars, and high-risk datashard recovery contracts.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Map the Street. Run the Gig.",
    description:
      "Keep your Cyberpunk RED campaign connected with relationship graphs, district maps, and local-first notes that stay on your machine.",
    buttonText: "Start Your Campaign Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by R. Talsorian Games, Inc. Cyberpunk and Cyberpunk RED are registered trademarks of R. Talsorian Games, Inc. and CD PROJEKT S.A.",
};
