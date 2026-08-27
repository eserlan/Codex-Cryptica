import type { LandingPageConfig } from "../schema";

export const spaceOpera: LandingPageConfig = {
  slug: "space-opera",
  kind: "genre",
  theme: "starwars",
  hub: "space-opera-resistance",
  seo: {
    title: "Codex Cryptica for Space Opera Campaigns",
    description:
      "Organise sprawling space opera campaigns with connected star systems, worlds, governments, crews, and trade routes in one local-first setting bible.",
    image: "https://assets.codexcryptica.com/og/space-opera.jpg",
    imageAlt:
      "Interstellar council chamber with giant 3D holographic galaxy sphere, fleet telemetry tables, and alien diplomatic envoys",
  },
  hero: {
    eyebrow: "Space Opera Worldbuilding",
    title: "Codex Cryptica for Space Opera",
    tagline:
      "Keep star systems, worlds, governments, factions, crews, and trade routes connected across your galaxy.",
    problemStatement:
      "Space opera campaigns span dozens of systems, rival governments, criminal syndicates, and a crew's tangled web of contacts and enemies. When your players reach a new sector, you shouldn't have to reconstruct who controls it, who they owe favours to, and what's already gone wrong there.",
  },
  useCases: [
    {
      title: "Star Systems, Worlds & Orbital Locations",
      description:
        "Map star systems down to individual worlds, moons, stations, and orbital hazards, all linked to the sectors they sit in.",
      icon: "icon-[lucide--orbit]",
    },
    {
      title: "Governments, Factions & Rival Powers",
      description:
        "Track empires, republics, corporations, rebel movements, and criminal organisations competing across your setting.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Crews, Contacts & Adversaries",
      description:
        "Connect your crew, patrons, informants, rivals, and bounty hunters using a visual relationship graph.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Routes, Borders & Conflict",
      description:
        "Chart major routes, contested systems, blockades, and the political relationships that shape travel across your setting.",
      icon: "icon-[lucide--route]",
    },
  ],
  exampleGraph: {
    title: "Sample Space Opera Campaign Web",
    description:
      "See how an independent crew's ship, ruling power, home port, and pursuers connect in a galaxy-spanning web.",
    steps: [
      {
        label: "The Longtail Compact",
        sublabel: "Independent Crew",
        category: "faction",
      },
      {
        label: "The Marrow Skiff",
        sublabel: "Freighter",
        relation: "Flies",
        category: "item",
      },
      {
        label: "Commander Reyes Alt",
        sublabel: "Dominion Enforcer",
        relation: "Wanted by",
        category: "character",
      },
      {
        label: "The Ashcrown Dominion",
        sublabel: "Ruling Empire",
        relation: "Opposes",
        category: "faction",
      },
      {
        label: "Freeport Kestrel",
        sublabel: "Independent Trade Station",
        relation: "Operates from",
        category: "location",
      },
      {
        label: "Veyla Expanse",
        sublabel: "Frontier Star System",
        relation: "Runs blockade through",
        category: "location",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Star System Generator",
      description:
        "Generate coherent star systems with major bodies, factions, resources, hazards, and a system-wide conflict.",
      href: "/generators/star-system",
      badge: "Generator",
    },
    {
      title: "Sci-Fi World Generator",
      description:
        "Build individual planets and moons with environments, civilisations, and adventure hooks.",
      href: "/generators/world",
      badge: "Generator",
    },
    {
      title: "Ship Generator",
      description:
        "Create starships with crews, roles, missions, complications, and histories.",
      href: "/generators/ship-generator",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Design governments, corporations, political movements, and criminal organisations with their own goals, allies, and rivals.",
      href: "/generators/faction",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Chart Your Galaxy",
    description:
      "Keep your space opera setting connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
