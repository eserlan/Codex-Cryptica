import type { LandingPageConfig } from "../schema";

export const dystopianSciFi: LandingPageConfig = {
  slug: "dystopian-sci-fi",
  kind: "genre",
  theme: "cyberpunk",
  seo: {
    title: "Codex Cryptica for Dystopian Sci-Fi Worldbuilding",
    description:
      "Organise dystopian sci-fi campaigns and worldbuilding with connected mega-corporations, resistance cells, surveillance networks, and corporate towers.",
  },
  hero: {
    eyebrow: "Dystopian Sci-Fi Worldbuilding",
    title: "Codex Cryptica for Dystopian Sci-Fi",
    tagline:
      "Keep corporations, resistance cells, surveillance networks, megacities, and campaign lore connected in one place.",
    problemStatement:
      "Dystopian sci-fi campaigns thrive on oppressive power structures, underground resistance networks, corporate conspiracies, and technological control. When players infiltrate a high-security enclave or uncover a secret surveillance programme, you shouldn't have to dig through scattered notes to trace who controls the network — or how the factions react.",
  },
  useCases: [
    {
      title: "Corporations, Oligarchies & Factions",
      description:
        "Map corporate boards, state security forces, rebel cells, and syndicate networks with a visual relationship graph.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Megacities, Enclaves & Under-cities",
      description:
        "Connect sprawling arcologies, elite high-rises, industrial sectors, and subterranean slums to the factions operating within them.",
      icon: "icon-[lucide--map-pin]",
    },
    {
      title: "Surveillance, Data & Tech Assets",
      description:
        "Link classified projects, AI networks, stolen blueprints, and black-market technologies to the entities contesting them.",
      icon: "icon-[lucide--cpu]",
    },
    {
      title: "Session Recaps & Resistance Logs",
      description:
        "Keep active operations, intrigue leads, session notes, and campaign milestones connected to the people and places involved.",
      icon: "icon-[lucide--file-text]",
    },
  ],
  exampleGraph: {
    title: "Sample Dystopian Sci-Fi Campaign Web",
    description:
      "See how corporate boards, surveillance programmes, industrial sectors, and underground resistance cells connect in a dystopian web.",
    steps: [
      {
        label: "Aegis Dynamics Board",
        sublabel: "Corporate Oligarchy",
        relation: "funds",
      },
      {
        label: "Project Sentinel",
        sublabel: "Surveillance Programme",
        relation: "monitors",
      },
      {
        label: "Arcology Level 9",
        sublabel: "Industrial Slum",
        relation: "hides",
      },
      {
        label: "The Free Grid Movement",
        sublabel: "Underground Resistance",
        relation: "seeks",
      },
      {
        label: "The Master Cipher Key",
        sublabel: "Encrypted Data-Core",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction & Society Generator",
      description:
        "Design corporate conglomerates, state security agencies, rebel cells, and crime syndicates.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create corporate executives, resistance leaders, hackers, enforcers, and informants.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build mega-city arcologies, industrial complexes, polluted outposts, and underground havens.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate corporate espionage leads, sabotage missions, propaganda campaigns, and heist hooks.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your Dystopian World",
    description:
      "Keep your dystopian sci-fi campaign connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
