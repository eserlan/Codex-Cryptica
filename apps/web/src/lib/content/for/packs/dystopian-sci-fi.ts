import type { LandingPageConfig } from "../schema";

export const dystopianSciFi: LandingPageConfig = {
  slug: "dystopian-sci-fi",
  kind: "genre",
  theme: "cyberpunk",
  hub: "cyberpunk",
  surfaceStyle: "sharp",
  seo: {
    title: "Codex Cryptica for Dystopian Sci-Fi Worldbuilding",
    description:
      "Organise dystopian sci-fi campaigns and worldbuilding with connected authoritarian regimes, corporate monopolies, surveillance grids, social strata, and resistance cells.",
    image: "https://assets.codexcryptica.com/og/dystopian-sci-fi.jpg",
    imageAlt:
      "Authoritarian regime command center with holographic sector surveillance grids, citizen tier registries, and security enforcement manifests",
  },
  hero: {
    eyebrow: "Dystopian Sci-Fi Setting & Campaign Management",
    title: "Codex Cryptica for Dystopian Sci-Fi",
    tagline:
      "Keep authoritarian regimes, corporate monopolies, surveillance networks, rationed sectors, and underground resistance cells connected in one local-first workspace.",
    problemStatement:
      "Dystopian science fiction turns on interlocking systems of control: ruling authorities, security apparatuses, state-backed monopolies, rationed resources, and the resistance cells fighting in the margins. When dissidents sabotage a distribution hub, an official defects, or a surveillance grid flags your party, you shouldn't have to scramble across scattered notes to see who orders the crackdown, who profits from the shortage, and who is quietly backing the rebellion.",
  },
  useCases: [
    {
      title: "Regimes, Corporations & Security Apparatuses",
      description:
        "Map governing councils, corporate monopolies, internal security forces, and clandestine enforcement agencies in one visual relationship graph.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Sectors, Arcologies & Restricted Zones",
      description:
        "Track fortified administrative enclaves, industrial sectors, rationed hab-blocks, and insurgent-held outskirts alongside your campaign lore.",
      icon: "icon-[lucide--map-pin]",
    },
    {
      title: "Surveillance Grids, Propaganda & Classified Projects",
      description:
        "Connect automated monitoring networks, state broadcasts, dissident manifestos, classified dossiers, and restricted technology to the factions controlling them.",
      icon: "icon-[lucide--cpu]",
    },
    {
      title: "Resistance Cells, Informants & Dissidents",
      description:
        "Track underground networks, compromised bureaucrats, safehouse contacts, and covert operations without losing track of loyalties, leverage, or debts.",
      icon: "icon-[lucide--users]",
    },
  ],
  exampleGraph: {
    title: "Sample Dystopian Power & Resistance Web",
    description:
      "A ruling civic authority, its corporate contractor, a biometric surveillance grid, a suppressed labour sector, and the underground resistance organising in secret.",
    badgeLabel: "Dystopian Power Web",
    palette: "default",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "Veyra Civic Authority",
        sublabel: "Regime Council • Ruling Authority",
        category: "faction",
      },
      {
        label: "Orison Heavy Industries",
        sublabel: "Corporate Monopoly • State Contractor",
        relation: "Contracts",
        category: "faction",
      },
      {
        label: "Census Mirror Grid",
        sublabel: "Surveillance Network • Biometric Database",
        relation: "Monitors citizens via",
        category: "item",
      },
      {
        label: "Sector 14 Hab-Blocks",
        sublabel: "Restricted District • Labour Zone",
        relation: "Enforces rationing on",
        category: "location",
      },
      {
        label: "The Common Assembly",
        sublabel: "Dissident Network • Resistance Movement",
        relation: "Suppresses",
        category: "faction",
      },
      {
        label: "Director Sulan Vane",
        sublabel: "Internal Security • Enforcement Chief",
        relation: "Commands",
        category: "character",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
      description:
        "Create governing councils, state security directorates, corporate monopolies, and underground resistance cells.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create regime bureaucrats, security officers, informants, black-market smugglers, and dissident organisers.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build sprawling mega-city arcologies, heavily monitored hab-blocks, industrial refinery zones, and forgotten undercities.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate propaganda leaks, sabotage operations, border crackdowns, high-level defections, and ration shortages.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Map the Regime. Fuel the Resistance.",
    description:
      "Keep authoritarian systems, dissident networks, restricted sectors, and session notes connected with relationship graphs and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
