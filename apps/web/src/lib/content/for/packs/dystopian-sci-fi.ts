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
      "Organise dystopian sci-fi campaigns and worldbuilding with connected institutions, corporations, surveillance systems, social strata, and competing factions.",
    image: "https://assets.codexcryptica.com/og/dystopian-sci-fi.jpg",
    imageAlt:
      "Authoritarian regime command center with holographic sector surveillance grids, citizen tier registries, and security enforcement manifests",
  },
  hero: {
    eyebrow: "Dystopian Sci-Fi Setting & Campaign Management",
    title: "Codex Cryptica for Dystopian Sci-Fi",
    tagline:
      "Keep institutions, districts, social groups, surveillance systems, and competing factions connected in one local-first workspace.",
    problemStatement:
      "Dystopian science fiction turns on interlocking systems of control: governments, corporations, surveillance, scarcity, social hierarchy, and the people trying to survive, exploit, or resist them. When an official defects, resources are cut off, or a surveillance log leaks, you shouldn't have to scramble across scattered notes to see who enforces the rules, who profits from the shortage, and who is caught in the middle.",
  },
  useCases: [
    {
      title: "Regimes, Corporations & Security Forces",
      description:
        "Map governing bodies, corporate monopolies, internal security forces, and enforcement agencies in one visual relationship graph.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Districts, Settlements & Controlled Spaces",
      description:
        "Track industrial sectors, gated enclaves, labour camps, arcologies, and colonies alongside your setting lore.",
      icon: "icon-[lucide--map-pin]",
    },
    {
      title: "Surveillance, Media & Restricted Technology",
      description:
        "Connect monitoring networks, state broadcasts, classified programmes, and restricted technologies to the factions controlling them.",
      icon: "icon-[lucide--cpu]",
    },
    {
      title: "Social Groups, Dissidents & Informants",
      description:
        "Track elite families, labour organisations, underground dissidents, informants, and collaborators without losing track of loyalties or leverage.",
      icon: "icon-[lucide--users]",
    },
  ],
  exampleGraph: {
    title: "Sample Dystopian Power & Resistance Web",
    description:
      "A ruling civic authority, its corporate contractor, a biometric surveillance grid, a controlled district, and the underground resistance organising in secret.",
    badgeLabel: "Dystopian Power Web",
    palette: "default",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "Veyra Civic Authority",
        sublabel: "Ruling Authority",
        category: "faction",
      },
      {
        label: "Orison Heavy Industries",
        sublabel: "Corporate Contractor",
        relation: "Contracts",
        category: "faction",
      },
      {
        label: "Census Mirror Grid",
        sublabel: "Surveillance Network",
        relation: "Monitors citizens via",
        category: "item",
      },
      {
        label: "Sector 14 Industrial Ward",
        sublabel: "Controlled District",
        relation: "Enforces rationing on",
        category: "location",
      },
      {
        label: "The Common Assembly",
        sublabel: "Dissident Network",
        relation: "Suppresses",
        category: "faction",
      },
      {
        label: "Director Sulan Vane",
        sublabel: "Security Chief",
        relation: "Commands",
        category: "character",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
      description:
        "Create factions you can adapt into governments, corporations, security forces, and resistance groups.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create characters you can adapt into bureaucrats, security officers, informants, black-market fixers, and community leaders.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Generate districts and settlements you can adapt into controlled cities, industrial zones, colonies, or restricted areas.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate plot hooks you can adapt into propaganda leaks, sabotage attempts, border crackdowns, defections, and supply crises.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Map the System. Follow the Fault Lines.",
    description:
      "Keep institutions, social strata, controlled districts, and session notes connected with relationship graphs and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
