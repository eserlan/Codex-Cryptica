import type { LandingPageConfig } from "../schema";

export const mechaRpgs: LandingPageConfig = {
  slug: "mecha-rpgs",
  kind: "genre",
  theme: "lancer",
  hub: "lancer",
  surfaceStyle: "sharp",
  seo: {
    title: "Tactical Mecha RPG Campaign Manager | Codex Cryptica",
    description:
      "Organise tactical mecha RPG campaigns with connected pilots, frames, squads, military contractors, operations, and warzones.",
    image: "https://assets.codexcryptica.com/og/mecha-rpgs.jpg",
    imageAlt:
      "Original combat mech at an orbital colony hangar with maintenance crew, dropships, and rain-lit industrial towers",
  },
  hero: {
    eyebrow: "Tactical Mecha & Sci-Fi Warfare Campaigns",
    title: "Keep the War Machine Connected",
    tagline:
      "Track pilots, frames, contracts, operations, and the people caught between them.",
    problemStatement:
      "A tactical mecha campaign moves quickly between briefing rooms, hangars, battle maps, and the consequences left behind. When one squad changes a warzone, takes a contractor's job, or loses a frame in a bad extraction, you need more than a mission list to remember who authorised the operation, what the unit is carrying, which settlement is now exposed, and why the next deployment matters.",
  },
  useCases: [
    {
      title: "Pilots, Frames & Squads",
      description:
        "Connect pilot dossiers, callsigns, loadouts, borrowed frames, squad roles, and the rival units they keep meeting.",
      icon: "icon-[lucide--bot]",
    },
    {
      title: "Contractors, Commands & Factions",
      description:
        "Track military commands, corporate contractors, insurgencies, logistics crews, and the competing goals behind each deployment.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Operations, Objectives & Fallout",
      description:
        "Keep mission briefs, objectives, battlefield complications, salvage, and unresolved consequences linked to the people and places involved.",
      icon: "icon-[lucide--crosshair]",
    },
    {
      title: "Warzones, Colonies & Tactical Networks",
      description:
        "Map contested colonies, orbital platforms, supply lines, forward bases, and the tactical relationships that make each front distinct.",
      icon: "icon-[lucide--map]",
    },
  ],
  exampleGraph: {
    title: "Sample Mecha Operation Network",
    description:
      "One squad connects to its frame, contractor, target colony, command contact, and the operation that put all of them under pressure.",
    badgeLabel: "Operation Network",
    surface: "dark",
    steps: [
      {
        label: "Harrow Squadron",
        sublabel: "Independent Mecha Unit",
        category: "faction",
      },
      {
        label: "Cinder Frame",
        sublabel: "Assault Mecha • Loaned Chassis",
        relation: "Deploys",
        category: "item",
      },
      {
        label: "Captain Imani Vale",
        sublabel: "Tactical Officer • Command Liaison",
        relation: "Reports to",
        category: "character",
      },
      {
        label: "Kestrel Defence Works",
        sublabel: "Military Contractor • Employer",
        relation: "Is contracted by",
        category: "faction",
      },
      {
        label: "Asterion Ring",
        sublabel: "Orbital Colony • Embattled Civilian Hub",
        relation: "Defends",
        category: "location",
      },
      {
        label: "Operation Glass Spear",
        sublabel: "Extraction Mission • Active",
        relation: "Deploys for",
        category: "event",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Lancer Generator Hub",
      description:
        "Generate pilots, frontier factions, outposts, and mission material with a tactical mecha campaign frame in mind.",
      href: "/generators/lancer",
      badge: "Generator Hub",
    },
    {
      title: "NPC Generator",
      description:
        "Create squad leaders, engineers, command staff, contractors, and opponents with motives that survive the next operation.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Design military commands, industrial interests, resistance cells, and mercenary companies with competing agendas.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate deployment orders, extraction jobs, contested objectives, and complications for the next operation.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Build Your Operation Board",
    description:
      "Keep the people, machines, battlefields, and consequences of your campaign connected in one local-first workspace.",
    buttonText: "Start Your Campaign",
    buttonHref: "/app",
  },
};
