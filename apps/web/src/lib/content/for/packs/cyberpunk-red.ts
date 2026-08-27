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
      "Keep Fixers, crews, corps, gangs, and gigs connected in one local-first workspace.",
    problemStatement:
      "In the Time of the RED, survival turns on who you know, what you owe, and who you crossed on your last run. When your crew takes a covert gig in the Combat Zone, or an old choom from your Lifepath calls in a favour, you shouldn't have to scramble through scattered notes to recall which fixer brokered the payout, which boostergang claims the alley, or which megacorp exec is quietly funding the hit.",
  },
  useCases: [
    {
      title: "Fixers, Edgerunner Crews & Contacts",
      description:
        "Map Fixers, crew members, street contacts, rivals, and debts in one visual relationship graph.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Megacorps, Boostergangs & Nomad Packs",
      description:
        "Track corporate agents, boostergang turf, Nomad convoys, and rival crews across Night City's contested districts.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Gigs, Deals & Night Markets",
      description:
        "Connect active job briefs, payment terms, scavenged cargo, datashards, and debrief notes to the people and locations involved.",
      icon: "icon-[lucide--file-text]",
    },
    {
      title: "Districts, Safehouses & Job Sites",
      description:
        "Catalogue city districts, corporate towers, container yards, and fortified safehouses alongside your campaign notes.",
      icon: "icon-[lucide--map-pin]",
    },
  ],
  exampleGraph: {
    title: "Night City Gig & Contact Web",
    description:
      "One district Fixer, his corporate client, the boostergang guarding the drop zone, the target datashard, and the Solo on retainer.",
    badgeLabel: "Gig & Contact Web",
    palette: "default",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "Jax Vance",
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
        relation: "Has truce with",
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
        relation: "Hires",
        category: "character",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
      description:
        "Design corporations, street gangs, Nomad packs, and mercenary outfits.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create fixers, solos, corporate contacts, and street figures with distinct motives.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build urban districts, corporate sectors, combat zones, and night markets.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate gig briefs, corporate jobs, street conflicts, and recovery contracts.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Map the Street. Run the Gig.",
    description:
      "Keep your Cyberpunk RED campaign connected with relationship graphs, district maps, and local-first notes.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by R. Talsorian Games, Inc. Cyberpunk and Cyberpunk RED are registered trademarks of R. Talsorian Games, Inc. and CD PROJEKT S.A.",
};
