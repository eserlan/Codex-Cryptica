import type { LandingPageConfig } from "../schema";

export const dystopianSciFi: LandingPageConfig = {
  slug: "dystopian-sci-fi",
  kind: "genre",
  theme: "cyberpunk",
  hub: "cyberpunk",
  seo: {
    title: "Codex Cryptica for Dystopian Sci-Fi Worldbuilding",
    description:
      "Organise dystopian sci-fi campaigns and worldbuilding with connected regimes, corporations, surveillance networks, and resistance movements.",
  },
  hero: {
    eyebrow: "Dystopian Sci-Fi Worldbuilding",
    title: "Codex Cryptica for Dystopian Sci-Fi",
    tagline:
      "Keep regimes, corporations, resistance movements, surveillance systems, districts, and campaign lore connected in one place.",
    problemStatement:
      "Dystopian sci-fi worlds are built from overlapping systems of power: governments, corporations, surveillance networks, resistance movements, controlled districts, and the people caught between them. When the players expose one secret, you should be able to see who benefits, who is threatened, and what changes next.",
  },
  useCases: [
    {
      title: "Regimes, Corporations & Resistance",
      description:
        "Map corporate boards, state security forces, rebel cells, and syndicate networks with a visual relationship graph.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Megacities, Enclaves & Undercities",
      description:
        "Connect sprawling arcologies, elite high-rises, industrial sectors, and subterranean slums to the factions operating within them.",
      icon: "icon-[lucide--map-pin]",
    },
    {
      title: "Surveillance, Data & Tech Assets",
      description:
        "Link surveillance systems, classified projects, stolen research, and restricted technologies to the factions and characters fighting over them.",
      icon: "icon-[lucide--cpu]",
    },
    {
      title: "Operations, Secrets & Session Notes",
      description:
        "Keep active operations, intrigue leads, session notes, and campaign milestones connected to the people and places involved.",
      icon: "icon-[lucide--file-text]",
    },
  ],
  exampleGraph: {
    title: "Sample Dystopian Sci-Fi Campaign Web",
    description:
      "See how regime councils, corporate contractors, surveillance networks, and resistance movements connect in a world web.",
    steps: [
      {
        label: "Veyra Civic Authority",
        sublabel: "Regime Council",
        category: "faction",
      },
      {
        label: "Orison Systems",
        sublabel: "Corporate Contractor",
        relation: "Contracts",
        category: "faction",
      },
      {
        label: "Census Mirror",
        sublabel: "Surveillance Network",
        relation: "Deploys",
        category: "item",
      },
      {
        label: "Ward 17",
        sublabel: "Controlled District",
        relation: "Subjugates",
        category: "location",
      },
      {
        label: "The Common Assembly",
        sublabel: "Underground Resistance",
        relation: "Suppresses",
        category: "faction",
      },
      {
        label: "Citizen Access Archive",
        sublabel: "Classified Data-Vault",
        relation: "Restricts",
        category: "item",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
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
        "Generate resistance operations, political crises, sabotage attempts, disappearances, and secrets worth uncovering.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your Dystopian World",
    description:
      "Keep your dystopian world connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
