import type { LandingPageConfig } from "../schema";

export const traveller: LandingPageConfig = {
  slug: "traveller",
  kind: "system",
  theme: "scifi",
  hub: "sci-fi",
  seo: {
    title: "Codex Cryptica for Traveller Campaign Management",
    description:
      "Organise your Traveller campaign with connected subsectors, worlds, patrons, speculative trade, jump routes, and rival powers.",
    image: "https://assets.codexcryptica.com/og/traveller.jpg",
    imageAlt:
      "Free Trader starship cockpit console with subsector hex starmap, jump drive calculations, flight clipboards, and nebula view",
  },
  hero: {
    eyebrow: "Traveller Campaign Management",
    title: "Codex Cryptica for Traveller",
    tagline:
      "Keep subsectors, worlds, patrons, Travellers, trade, and rival powers connected in one place.",
    problemStatement:
      "A Traveller campaign is a sandbox built from dozens of jump-linked worlds, each with its own government, trade goods, and local trouble. When your Travellers take a patron's job three parsecs out, you shouldn't have to dig through subsector notes to remember who they owe, who's hunting them, what cargo is in the hold, and what waits at the next jump.",
  },
  useCases: [
    {
      title: "Subsectors, Worlds & Starports",
      description:
        "Map subsectors down to individual worlds, world profiles (UWPs), starports, bases and jump routes, all linked to the systems they sit in.",
      icon: "icon-[lucide--orbit]",
    },
    {
      title: "Governments, Corporations & Rival Powers",
      description:
        "Track governments, corporations, naval and scout bases, local factions, and rival powers competing across the subsector.",
      icon: "icon-[lucide--building-2]",
    },
    {
      title: "Patrons, Travellers & Contacts",
      description:
        "Connect patrons, Travellers, crew members, informants, rivals, and creditors using a visual relationship graph.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Trade, Jobs & Contracts",
      description:
        "Track speculative trade, freight, passengers, patron jobs, and mercenary tickets alongside the worlds and factions involved.",
      icon: "icon-[lucide--route]",
    },
  ],
  exampleGraph: {
    title: "Sample Traveller Campaign Web",
    description:
      "See how a Free Trader's registration, financing, patron, and freight contracts connect across a subsector.",
    steps: [
      {
        label: "Free Trader Wayfinder",
        sublabel: "Free Trader",
        category: "item",
      },
      {
        label: "Kestrel's Reach",
        sublabel: "Frontier World",
        relation: "Registered at",
        category: "location",
      },
      {
        label: "Kestrel Mercantile Bank",
        sublabel: "Ship Financier",
        relation: "Owes mortgage to",
        category: "faction",
      },
      {
        label: "Factor Harn Delis",
        sublabel: "Trade Patron",
        relation: "Hired by",
        category: "character",
      },
      {
        label: "Outbound Shipping",
        sublabel: "Regional Freight Company",
        relation: "Carries freight for",
        category: "faction",
      },
      {
        label: "Salvage Rights Dispute",
        sublabel: "Active Contract",
        relation: "Contracted for",
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
        "Design governments, shipping companies, commercial interests, and rival powers with their own agendas and territory.",
      href: "/generators/faction",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Chart Your Frontier",
    description:
      "Keep your Referee notes, patrons, worlds, and faction relationships connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Mongoose Publishing Ltd. or Far Future Enterprises. Traveller is a registered trademark of Far Future Enterprises, used under license by Mongoose Publishing Ltd.",
};
