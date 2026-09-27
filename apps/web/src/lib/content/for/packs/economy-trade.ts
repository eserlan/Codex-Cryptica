import type { LandingPageConfig } from "../schema";

export const economyTrade: LandingPageConfig = {
  slug: "economy-trade",
  kind: "use-case",
  seo: {
    title: "Codex Cryptica for TTRPG Economy & Trade",
    description:
      "Build believable prices, trade, scarcity, wealth, and economic pressures without simulating an entire economy.",
    image: "https://assets.codexcryptica.com/og/economy-trade.jpg",
    imageAlt:
      "A stone toll bridge over a busy river with grain barges, merchants trading at a quayside counting house, and a mountain town behind",
  },
  hero: {
    eyebrow: "Believable Trade Without the Spreadsheet",
    title: "Codex Cryptica for TTRPG Economy & Trade",
    tagline:
      "Build believable prices, trade, scarcity, wealth, and economic pressures without simulating an entire economy.",
    problemStatement:
      "Economies in most campaigns fail in one of two directions: everything costs the same everywhere and nothing can run short, or the game master keeps a price spreadsheet no player will ever check. Neither produces play. What produces play is dependence: one town needs what only another can supply, moving it costs something, someone takes a share, and the whole arrangement is one blocked pass away from trouble.",
  },
  useCases: [
    {
      title: "Prices That Mean Something",
      description:
        "Trace what each region produces, how goods move, who takes a share, and what strains the arrangement, so a changed price always tells a story.",
      icon: "icon-[lucide--coins]",
    },
    {
      title: "Settlements With a Trade Identity",
      description:
        "Derive what a town makes, what it must import, and what it can export from its land, people, tools, and neighbours rather than picking goods at will.",
      icon: "icon-[lucide--map]",
    },
    {
      title: "Routes That Enrich and Endanger",
      description:
        "Place toll towns, garrisons, and rivalries where goods must pass a narrow point, and know exactly who loses if the flow stops.",
      icon: "icon-[lucide--route]",
    },
    {
      title: "Shortages the Table Can Feel",
      description:
        "Run scarcity through rationing, hoarding, substitutes, and competing claims, so a missing good arrives as behaviour before it arrives as arithmetic.",
      icon: "icon-[lucide--flame]",
    },
    {
      title: "Pressures That Become Hooks",
      description:
        "Turn every strain into an open situation with winners, losers, a single prize, and at least two doors the party can walk through.",
      icon: "icon-[lucide--scroll-text]",
    },
  ],
  exampleGraph: {
    title: "Where the Iron Goes",
    description:
      "One mountain town's export, and everyone with a hand on it: the buyer downriver, the guild at the narrows, the pass that could close, and the grain debt that must be fed.",
    badgeLabel: "Trade Web",
    steps: [
      {
        label: "Kettlebeck Iron",
        sublabel: "Smelted bars • Mountain town",
        category: "item",
      },
      {
        label: "Ashford Timber",
        sublabel: "Downriver buyer",
        relation: "Traded to",
        category: "location",
      },
      {
        label: "The Narrows Toll",
        sublabel: "Toll • River bend",
        relation: "Taxed at",
        category: "location",
      },
      {
        label: "The Toll Guild",
        sublabel: "Charter • River trade",
        relation: "Claimed by",
        category: "faction",
      },
      {
        label: "The Held Pass",
        sublabel: "Blocked route • This season",
        relation: "Stranded by",
        category: "event",
      },
      {
        label: "Ashford Grain",
        sublabel: "Import • Winter stores",
        relation: "Traded for",
        category: "item",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Settlement Generator",
      description:
        "Give each trading town its surroundings, people, and tensions, then fill in the trade ledger.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create the guilds, houses, and crews that tax exchange and squeeze dependencies.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "World Generator",
      description:
        "Lay out regions, resources, and neighbours so every import has somewhere to come from.",
      href: "/generators/world",
      badge: "Generator",
    },
    {
      title: "Rumour Generator",
      description:
        "Carry news of missed deliveries, closed passes, and price disputes between towns.",
      href: "/generators/rumour",
      badge: "Generator",
    },
    {
      title: "How Do I Build a Believable Economy for a Fantasy World?",
      description:
        "The six-link framework the whole cluster stands on: resources, production, exchange, control, pressure, consequences.",
      href: "/answers/how-do-i-build-a-believable-economy-for-a-fantasy-world",
      badge: "Answer",
    },
    {
      title: "What Does a Settlement Produce, Import, and Export?",
      description:
        "A six-step method for deriving a town's trade ledger from its land, hands, tools, and neighbours.",
      href: "/answers/how-do-i-decide-what-a-settlement-produces-imports-and-exports",
      badge: "Answer",
    },
    {
      title: "How Do Trade Routes Shape Cities and Kingdoms?",
      description:
        "Five map-placing questions that turn a drawn route into toll towns, garrisons, and rivalries.",
      href: "/answers/how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
      badge: "Answer",
    },
    {
      title: "How Do Scarcity and Shortages Affect Prices and Conflict?",
      description:
        "Run shortages through behaviour and competing claims rather than price maths.",
      href: "/answers/how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
      badge: "Answer",
    },
    {
      title: "How Do I Turn Economic Pressures into Adventure Hooks?",
      description:
        "Convert any strain into an open situation with winners, losers, a prize, and two doors in.",
      href: "/answers/how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
      badge: "Answer",
    },
  ],
  cta: {
    title: "Run an Economy That Pushes Back",
    description:
      "Connect your towns, factions, routes, and shortages in one place, so every price tells the truth about your world.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
