import type { LandingPageConfig } from "../schema";

export const scumAndVillainy: LandingPageConfig = {
  slug: "scum-and-villainy",
  kind: "system",
  theme: "space-western",
  hub: "space-western",
  seo: {
    title: "Codex Cryptica for Scum and Villainy Campaign Management",
    description:
      "Organise your Scum and Villainy campaign with connected crews, battered ships, sector factions, debt, jobs, and heat.",
    image: "https://assets.codexcryptica.com/og/scum-and-villainy.jpg",
    imageAlt:
      "Rusted freighter cockpit with glowing holomaps, bounty warrants, smuggling manifests, and asteroid field view",
  },
  hero: {
    eyebrow: "Space Scoundrels & Smugglers",
    title: "Codex Cryptica for Scum and Villainy",
    tagline:
      "Keep crews, battered ships, criminal syndicates, debts, and sector heat connected in one place.",
    problemStatement:
      "A space scoundrels campaign moves fast — one session you are smuggling contraband past customs corvettes, the next you are dodging syndicate enforcers over unpaid ship debts. When heat rises across three sectors and rival factions collide, you should not have to scramble through scattered notes to remember who holds your crew's debt, who wants your cargo, and which corrupt marshal is tracking your drive signature.",
  },
  useCases: [
    {
      title: "Crews, Ship Modules & Upgrades",
      description:
        "Track your crew's ship, modified modules, contraband bays, outstanding mortgages, and upkeep costs alongside their operational history.",
      icon: "icon-[lucide--ship]",
    },
    {
      title: "Syndicates, Hegemony & Faction Status",
      description:
        "Map shifting faction relations, sector authority patrols, crime cartels, and guild turf wars with visual relationship graphs.",
      icon: "icon-[lucide--flame]",
    },
    {
      title: "Contacts, Fixers & Rivals",
      description:
        "Keep underworld brokers, corrupt officials, bounty hunters, and friendly mechanics connected to the jobs they broker and factions they fear.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Jobs, Scores & Sector Heat",
      description:
        "Organise heists, illicit cargo runs, and extraction jobs alongside accrued sector heat, wanted levels, and entanglements.",
      icon: "icon-[lucide--crosshair]",
    },
  ],
  exampleGraph: {
    title: "Sample Space Scoundrels Campaign Web",
    description:
      "See how a smuggler crew's ship, patron, rival syndicate, and debt connect across an asteroid frontier.",
    steps: [
      {
        label: "The Rusted Kestrel",
        sublabel: "Modified Hauler",
        category: "item",
      },
      {
        label: "Scrap-Town Depot",
        sublabel: "Asteroid Free-Port",
        relation: "Berthed at",
        category: "location",
      },
      {
        label: "Iron Guild Syndicate",
        sublabel: "Smuggler Cartel",
        relation: "Owes 50,000 credits to",
        category: "faction",
      },
      {
        label: "Fixer Marlo Vane",
        sublabel: "Underworld Broker",
        relation: "Contracted by",
        category: "character",
      },
      {
        label: "Hegemony Customs Patrol",
        sublabel: "Sector Enforcers",
        relation: "Pursued by",
        category: "faction",
      },
      {
        label: "Beryllium Core Extraction",
        sublabel: "Active Heist",
        relation: "Target of",
        category: "event",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Ship Generator",
      description:
        "Create freighters, corvettes, and skiffs with crew profiles, complications, and underworld secrets.",
      href: "/generators/ship-generator",
      badge: "Generator",
    },
    {
      title: "See a Crew-Ready Ship Example",
      description:
        "Read The Cinder Wren in full: a blockade runner with disputed salvage, a practical crew, and an outlawed AI core.",
      href: "/examples/fv-coyote-space-western-ship",
      badge: "Example",
    },
    {
      title: "Space Western Hub",
      description:
        "Access the full suite of space western generators — outposts, scoundrels, syndicates, and bounty quests.",
      href: "/generators/space-western",
      badge: "Hub",
    },
    {
      title: "Faction Generator",
      description:
        "Build smuggler syndicates, mining corporations, and marshal departments with agendas and rivalries.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "Encounter Generator",
      description:
        "Generate tense border inspections, cantina stand-offs, and asteroid ambush encounters.",
      href: "/generators/encounter",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Take Command of Your Crew's Story",
    description:
      "Keep your scoundrels, ships, debts, and sector heat organised with intuitive relationship graphs and offline-ready local storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Evil Hat Productions or the creators of Scum and Villainy.",
};
