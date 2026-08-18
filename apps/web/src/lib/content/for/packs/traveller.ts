import type { LandingPageConfig } from "../schema";

export const traveller: LandingPageConfig = {
  slug: "traveller",
  kind: "system",
  theme: "scifi",
  hub: "sci-fi",
  seo: {
    title: "Codex Cryptica for Traveller Campaign Management",
    description:
      "Organise your Traveller campaign with connected subsectors, worlds, patrons, mercenary tickets, trade routes, and rival powers.",
  },
  hero: {
    eyebrow: "Traveller Campaign Management",
    title: "Codex Cryptica for Traveller",
    tagline:
      "Keep subsectors, worlds, patrons, crews, trade routes, and rival powers connected in one place.",
    problemStatement:
      "A Traveller campaign is a sandbox built from dozens of jump-linked worlds, each with its own government, trade goods, and local trouble. When your crew takes a patron's job three parsecs out, you shouldn't have to dig through subsector notes to remember who they owe, who's hunting them, and what the last system taught you about the next.",
  },
  useCases: [
    {
      title: "Subsectors, Worlds & Starports",
      description:
        "Map subsectors down to individual worlds, starports, and orbital installations, all linked to the systems they sit in.",
      icon: "icon-[lucide--orbit]",
    },
    {
      title: "Governments, Megacorps & Rival Powers",
      description:
        "Track polities, trade conglomerates, scout bases, and rival powers competing for influence across the frontier.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Patrons, Crew & Contacts",
      description:
        "Connect patrons, crew members, informants, rivals, and creditors using a visual relationship graph.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Trade Routes & Mercenary Tickets",
      description:
        "Chart jump routes, trade goods, contested territories, and active tickets alongside the worlds and factions involved.",
      icon: "icon-[lucide--route]",
    },
  ],
  exampleGraph: {
    title: "Sample Traveller Campaign Web",
    description:
      "See how a subsector world, its ruling government, a crew's ship, and a patron's ticket connect in a frontier trade web.",
    steps: [
      {
        label: "Kestrel's Reach",
        sublabel: "Frontier World",
        category: "location",
      },
      {
        label: "Kestrel Consulate",
        sublabel: "Local Government",
        relation: "Governs",
        category: "faction",
      },
      {
        label: "Free Trader Wayfinder",
        sublabel: "Crew Vessel",
        relation: "Registered at",
        category: "item",
      },
      {
        label: "Factor Harn Delis",
        sublabel: "Trade Patron",
        relation: "Hires",
        category: "character",
      },
      {
        label: "Outbound Consortium",
        sublabel: "Rival Trade Conglomerate",
        relation: "Undercuts",
        category: "faction",
      },
      {
        label: "Salvage Rights Dispute",
        sublabel: "Active Ticket",
        relation: "Complicates",
        category: "event",
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
        "Build individual worlds with environments, civilisations, and adventure hooks.",
      href: "/generators/world",
      badge: "Generator",
    },
    {
      title: "Ship Generator",
      description:
        "Create trader, scout, and mercenary vessels with a crew, a mission, a complication, and a secret.",
      href: "/generators/ship-generator",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Design governments, trade conglomerates, and rival powers with their own agendas and territory.",
      href: "/generators/faction",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Chart Your Frontier",
    description:
      "Keep your Traveller campaign connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Mongoose Publishing Ltd. or Far Future Enterprises. Traveller is a registered trademark of Far Future Enterprises, used under license by Mongoose Publishing Ltd.",
};
