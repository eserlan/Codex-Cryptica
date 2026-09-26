import type { LandingPageConfig } from "../schema";

export const steampunkRpgs: LandingPageConfig = {
  slug: "steampunk-rpgs",
  kind: "genre",
  theme: "steampunk",
  hub: "steampunk",
  seo: {
    title: "Codex Cryptica for Steampunk & Victorian Industrial Campaigns",
    description:
      "Organise steampunk and Victorian industrial campaigns with clockwork inventions, industrial guilds, aristocratic houses, airship fleets, and brass-and-steam conspiracies in one connected setting bible.",
    image: "https://assets.codexcryptica.com/og/steampunk-rpgs.jpg",
    imageAlt:
      "A brass airship drifting above a smoke-stained industrial city at dusk",
  },
  hero: {
    eyebrow: "Steampunk, Gaslamp & Victorian Industry",
    title: "Codex Cryptica for Steampunk RPGs",
    tagline:
      "Connect the inventions that change what is possible with the people, places, and power struggles they leave behind.",
    problemStatement:
      "Steampunk campaigns turn on what invention makes possible—and who gains or loses power when it succeeds. A stolen prototype, strike, noble investment, or act of sabotage can reshape an industrial city, scientific expedition, or airship voyage. In Codex Cryptica, connect inventions to their inventors, workers, patrons, rivals, routes, and consequences, from guild intrigue to gaslamp investigation and weird science.",
  },
  useCases: [
    {
      title: "Clockwork Inventions & Patents",
      description:
        "Track each prototype's inventor, workings, flaws, and owner, so a stolen patent or failed engine has consequences later in the campaign.",
      icon: "icon-[lucide--cog]",
    },
    {
      title: "Industry, Guilds & Labour",
      description:
        "Connect foundries, engineers' guilds, workers, and trade unions to the contracts, strikes, and sabotage shaping an industrial city.",
      icon: "icon-[lucide--factory]",
    },
    {
      title: "Patrons, Houses & Influence",
      description:
        "Track the nobles and investors backing an invention, and the debts, status, and influence they stand to gain or lose.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Airships, Routes & Conspiracies",
      description:
        "Keep airship crews, expedition routes, and rival fleets in view as forged blueprints, sabotage, and hidden societies change the journey.",
      icon: "icon-[lucide--eye]",
    },
  ],
  exampleGraph: {
    title: "Sample Steampunk Campaign Web",
    description:
      "If the Aetherwheel fails, the fleet loses its edge, Lady Ophelia loses her investment, the Cogwrights blame the foundry, the strike gains leverage, and a conspiracy gets its opening.",
    steps: [
      {
        label: "The Aetherwheel Engine",
        sublabel: "Experimental Prototype",
        category: "item",
      },
      {
        label: "Blackbrass Foundry",
        sublabel: "Industrial Works",
        relation: "Is built in",
        category: "location",
      },
      {
        label: "Lady Ophelia Crane",
        sublabel: "Noble Patron",
        relation: "Is funded by",
        category: "character",
      },
      {
        label: "The Guild of Cogwrights",
        sublabel: "Engineers' Guild",
        relation: "Is claimed by",
        category: "faction",
      },
      {
        label: "The Skyward Concord",
        sublabel: "Airship Armada",
        relation: "Is coveted by",
        category: "faction",
      },
      {
        label: "The Great Boiler Strike",
        sublabel: "Labour Crisis",
        relation: "Is disrupted by",
        category: "event",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Artifact Generator",
      description:
        "Create clockwork devices and lost prototypes with histories, flaws, and people who want them.",
      href: "/generators/artifact-generator",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Build industrial guilds, noble houses, and secret societies with competing agendas.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "Ship Generator",
      description:
        "Create airships and river steamers with crews, complications, and secrets.",
      href: "/generators/ship-generator",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build foundry towns, smog-choked districts, and trading cities with the trade and trouble that define them.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Secret Society Generator",
      description:
        "Create the hidden hands behind the patents, strikes, and sabotage.",
      href: "/generators/secret-society",
      badge: "Generator",
    },
    {
      title: "Steampunk Hub",
      description:
        "Open steampunk-ready generators for the inventors, guilds, and airship crews around your campaign.",
      href: "/generators/steampunk",
      badge: "Hub",
    },
  ],
  cta: {
    title: "Wind Up Your Next Campaign",
    description:
      "Build a connected city where every patent, strike, and secret changes who holds power next.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
