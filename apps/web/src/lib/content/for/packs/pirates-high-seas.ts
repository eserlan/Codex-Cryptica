import type { LandingPageConfig } from "../schema";

export const piratesHighSeas: LandingPageConfig = {
  slug: "pirates-high-seas",
  kind: "genre",
  theme: "pirate",
  hub: "pirate",
  seo: {
    title: "Codex Cryptica for Pirate & High Seas Campaigns",
    description:
      "Organise pirate and naval campaigns with ship logs, island charts, rival fleets, captains, quartermasters, hidden hoards, and trade routes in one connected setting bible.",
    image: "https://assets.codexcryptica.com/og/pirates-high-seas.jpg",
    imageAlt:
      "A weathered pirate sloop under full sail approaching a hidden island cove at dusk",
  },
  hero: {
    eyebrow: "Swashbuckling Worldbuilding",
    title: "Codex Cryptica for Pirate & High Seas Campaigns",
    tagline:
      "Keep your ships, crews, islands, hoards, and grudges connected across every sea your players sail.",
    problemStatement:
      "A high seas campaign runs on trade routes, borrowed loyalties, and a rumour about buried treasure that someone will kill to reach first. When the crew sails back to a port they wronged, or a rival captain turns up with your old quartermaster, you need the whole web of ships, islands, and debts in one place—not scattered across ship logs and session notes.",
  },
  useCases: [
    {
      title: "Ships, Logs & Crews",
      description:
        "Track each vessel's condition, cargo, guns, and crew alongside a running log of prizes taken, ports visited, and repairs owed.",
      icon: "icon-[lucide--ship]",
    },
    {
      title: "Island Charts & Trade Routes",
      description:
        "Connect harbours, hidden coves, reefs, and the shipping lanes that make each one worth defending, raiding, or avoiding.",
      icon: "icon-[lucide--map]",
    },
    {
      title: "Captains, Armadas & Rival Fleets",
      description:
        "Keep naval squadrons, pirate captains, quartermasters, and trading companies visible as their interests collide at sea.",
      icon: "icon-[lucide--flag]",
    },
    {
      title: "Hidden Hoards & Rumours",
      description:
        "Follow a treasure map, forged letter of marque, or half-remembered tale from the first whisper in a tavern to the reckoning on the beach.",
      icon: "icon-[lucide--gem]",
    },
  ],
  exampleGraph: {
    title: "Sample High Seas Campaign Web",
    description:
      "See how one ship binds a haven, a rival fleet, a hidden hoard, and the people who want a share of it.",
    steps: [
      {
        label: "The Gilded Heron",
        sublabel: "Captured Brigantine",
        category: "item",
      },
      {
        label: "Skerry Cove",
        sublabel: "Smugglers' Haven",
        relation: "Shelters in",
        category: "location",
      },
      {
        label: "Captain Maren Voss",
        sublabel: "Privateer Captain",
        relation: "Is commanded by",
        category: "character",
      },
      {
        label: "The Crown Squadron",
        sublabel: "Royal Navy Patrol",
        relation: "Is hunted by",
        category: "faction",
      },
      {
        label: "The Drowned Bell Hoard",
        sublabel: "Lost Treasure",
        relation: "Carries a chart to",
        category: "item",
      },
      {
        label: "The Salt Tithe Mutiny",
        sublabel: "Crew Crisis",
        relation: "Threatens to split",
        category: "event",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Ship Generator",
      description:
        "Create sloops, brigantines, and galleons with crews, complications, and secrets.",
      href: "/generators/ship-generator",
      badge: "Generator",
    },
    {
      title: "See a Pirate Adventure Example",
      description:
        "Read a full adventure arc built around an expired letter of marque and three ways to resolve it.",
      href: "/examples/letters-of-marque-expired-pirate-adventure",
      badge: "Example",
    },
    {
      title: "Pirate Hub",
      description:
        "Open pirate-ready generators for the captains, ports, and factions around your crew.",
      href: "/generators/pirate",
      badge: "Hub",
    },
    {
      title: "Settlement Generator",
      description:
        "Build harbour towns, free ports, and island colonies with the trade and trouble that define them.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create naval squadrons, trading companies, and pirate brotherhoods with competing agendas.",
      href: "/generators/faction",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Chart Your Next Voyage",
    description:
      "Build a connected sea where every prize taken changes who hunts you next.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
