import type { LandingPageConfig } from "../schema";

export const spaceOpera: LandingPageConfig = {
  slug: "space-opera",
  kind: "genre",
  theme: "starwars",
  hub: "space-opera-resistance",
  seo: {
    title: "Codex Cryptica for Space Opera Campaigns",
    description:
      "Organise sprawling space opera campaigns with connected star systems, worlds, empires, rebel cells, crews, and trade routes in one local-first setting bible.",
  },
  hero: {
    eyebrow: "Space Opera Worldbuilding",
    title: "Codex Cryptica for Space Opera",
    tagline:
      "Keep star systems, worlds, empires, rebel factions, crews, and trade routes connected across your galaxy.",
    problemStatement:
      "Space opera campaigns span dozens of systems, rival governments, criminal syndicates, and a crew's tangled web of contacts and enemies. When your players jump to a new sector, you shouldn't have to reconstruct who controls it, who they owe favours to, and what's already gone wrong there.",
  },
  useCases: [
    {
      title: "Star Systems, Worlds & Orbital Locations",
      description:
        "Map star systems down to individual worlds, moons, stations, and orbital hazards, all linked to the sectors they sit in.",
      icon: "icon-[lucide--orbit]",
    },
    {
      title: "Empires, Megacorps & Rival Powers",
      description:
        "Track governments, corporate conglomerates, rebel movements, and criminal syndicates competing across your galaxy.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Crews, Contacts & Adversaries",
      description:
        "Connect your crew, patrons, informants, rivals, and bounty hunters using a visual relationship graph.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Trade Routes & Territorial Conflict",
      description:
        "Chart hyperlanes, contested territories, blockades, and the political relationships that shape them.",
      icon: "icon-[lucide--route]",
    },
  ],
  exampleGraph: {
    title: "Sample Space Opera Campaign Web",
    description:
      "See how a star system, its controlling faction, a crew's ship, and a rival power connect in a galaxy-spanning web.",
    steps: [
      {
        label: "Veyla Expanse",
        sublabel: "Frontier Star System",
        category: "location",
      },
      {
        label: "The Ashcrown Dominion",
        sublabel: "Ruling Empire",
        relation: "Occupies",
        category: "faction",
      },
      {
        label: "The Longtail Compact",
        sublabel: "Smuggler Crew",
        relation: "Runs blockade in",
        category: "faction",
      },
      {
        label: "The Marrow Skiff",
        sublabel: "Crew Vessel",
        relation: "Registered to",
        category: "item",
      },
      {
        label: "Freeport Kestral",
        sublabel: "Independent Trade Station",
        relation: "Trades through",
        category: "location",
      },
      {
        label: "Commander Reyes Alt",
        sublabel: "Dominion Enforcer",
        relation: "Hunts",
        category: "character",
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
        "Create starships with a crew, a mission, a complication, and a secret worth uncovering.",
      href: "/generators/ship-generator",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Design empires, megacorps, rebel movements, and criminal syndicates with rival powers and agendas.",
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
