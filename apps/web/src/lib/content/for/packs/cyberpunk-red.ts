import type { LandingPageConfig } from "../schema";

export const cyberpunkRed: LandingPageConfig = {
  slug: "cyberpunk-red",
  kind: "system",
  theme: "cyberpunk",
  seo: {
    title: "Codex Cryptica for Cyberpunk RED Campaign Management",
    description:
      "Organise your Cyberpunk RED campaign with connected fixers, megacorps, street gangs, merc squads, deal locations, and gig recaps.",
  },
  hero: {
    eyebrow: "Cyberpunk RED Campaign Management",
    title: "Codex Cryptica for Cyberpunk RED",
    tagline:
      "Keep fixers, megacorps, merc squads, street gangs, deal locations, and gig recaps connected in one place.",
    problemStatement:
      "Cyberpunk RED campaigns quickly grow into a web of corporate handlers, fixer contacts, gang territories, rival mercs, and street-level favours. When your edgerunners take a high-risk gig in a contested zone, you shouldn't have to search through loose notes to remember which megacorp owns the target — or who stands to profit.",
  },
  useCases: [
    {
      title: "Fixers, Merc Squads & Contacts",
      description:
        "Map fixers, solo mercs, netrunners, and street contacts using a visual relationship graph.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Megacorps, Gangs & Factions",
      description:
        "Connect corporate executives, street gangs, syndicate bosses, and rival crews to the turf and assets they control.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Gigs, Contracts & Session Recaps",
      description:
        "Keep active jobs, corporate contracts, mission debriefs, and campaign milestones connected to the people and places involved.",
      icon: "icon-[lucide--file-text]",
    },
    {
      title: "Districts, Safehouses & Hotspots",
      description:
        "Catalog city districts, corporate towers, black-market safehouses, and contested zones alongside your campaign entities.",
      icon: "icon-[lucide--map-pin]",
    },
  ],
  exampleGraph: {
    title: "Sample Cyberpunk RED Campaign Web",
    description:
      "See how district fixers, megacorporations, corporate security forces, and encrypted assets connect in a gig web.",
    steps: [
      {
        label: "Fixer Jax Vance",
        sublabel: "District Fixer",
        relation: "brokers job for",
      },
      {
        label: "Zeta-Tech Systems",
        sublabel: "Megacorporation",
        relation: "targets rival",
      },
      {
        label: "Arasaka Security Division",
        sublabel: "Corporate Security",
        relation: "patrols",
      },
      {
        label: "Sector 4 Combat Zone",
        sublabel: "Contested District",
        relation: "shelters",
      },
      {
        label: "The Blackout Data-Drive",
        sublabel: "Encrypted Asset",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
      description:
        "Design megacorporations, street gangs, mercenary syndicates, and fixer networks.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create fixers, solos, netrunners, corporate suits, and street contacts with distinct motives.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build urban sectors, corporate arcologies, combat zones, and night market districts.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate gig briefs, corporate extractions, street brawls, and Netrunner job leads.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your Cyberpunk Campaign",
    description:
      "Keep your Cyberpunk RED campaign connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by R. Talsorian Games, Inc. Cyberpunk and Cyberpunk RED are registered trademarks of R. Talsorian Games, Inc. and CD PROJEKT S.A.",
};
