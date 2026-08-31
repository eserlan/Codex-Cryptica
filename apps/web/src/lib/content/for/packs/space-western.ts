import type { LandingPageConfig } from "../schema";

export const spaceWestern: LandingPageConfig = {
  slug: "space-western",
  kind: "genre",
  theme: "space-western",
  hub: "space-western",
  seo: {
    title: "Codex Cryptica for Space Western Campaigns",
    description:
      "Organise Space Western campaigns with frontier outposts, ships, crews, mining claims, law officers, and corporate pressure in one connected setting bible.",
    image: "https://assets.codexcryptica.com/og/space-western.jpg",
    imageAlt:
      "A battered frontier freighter approaching a dusty moon outpost beneath a ringed gas giant",
  },
  hero: {
    eyebrow: "Frontier Sci-Fi Worldbuilding",
    title: "Codex Cryptica for Space Western Campaigns",
    tagline:
      "Keep your crews, ships, outposts, claims, and grudges connected at the edge of settled space.",
    problemStatement:
      "A Space Western campaign is held together by fragile routes, personal debts, contested claims, and the few people willing to make a stand when help is weeks away. When a ship is impounded, a mining town runs dry, or a marshal chooses a side, you need the whole frontier web in one place—not scattered across manifests and session notes.",
  },
  useCases: [
    {
      title: "Ships, Crews & Hard Choices",
      description:
        "Track working freighters, patched gunships, their crews, debts, cargo, and the compromises keeping them in the black.",
      icon: "icon-[lucide--ship]",
    },
    {
      title: "Outposts, Claims & Thin Supply Lines",
      description:
        "Connect isolated ports, mining settlements, water rights, salvage fields, and the routes that make them worth fighting over.",
      icon: "icon-[lucide--map-pin]",
    },
    {
      title: "Marshals, Corporations & Syndicates",
      description:
        "Keep frontier law, extraction companies, smugglers, and local mutual-aid groups visible as their interests collide.",
      icon: "icon-[lucide--scale]",
    },
    {
      title: "Bounties, Feuds & Jobs",
      description:
        "Follow a bounty, missing cargo, old grudge, or desperate delivery from the first lead through its consequences.",
      icon: "icon-[lucide--crosshair]",
    },
  ],
  exampleGraph: {
    title: "Sample Space Western Frontier Web",
    description:
      "See how one ship binds a frontier outpost, its disputed cargo, a local authority, and the people prepared to take it.",
    steps: [
      {
        label: "The Cinder Wren",
        sublabel: "Frontier Courier-Freighter",
        category: "item",
      },
      {
        label: "Last Light Outpost",
        sublabel: "Frontier Port",
        relation: "Docks at",
        category: "location",
      },
      {
        label: "Redwater Freight Combine",
        sublabel: "Salvage Outfit",
        relation: "Carries cargo for",
        category: "faction",
      },
      {
        label: "Sable Renn",
        sublabel: "Salvage Broker",
        relation: "Owes a favour to",
        category: "character",
      },
      {
        label: "Customs Blockade",
        sublabel: "Supply Crisis",
        relation: "Runs through",
        category: "event",
      },
      {
        label: "Rival Scrappers",
        sublabel: "Salvage Claimants",
        relation: "Is claimed by",
        category: "faction",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Ship Generator",
      description:
        "Create frontier freighters and gunships with crews, complications, and secrets.",
      href: "/generators/ship-generator",
      badge: "Generator",
    },
    {
      title: "See a Space Western Ship Example",
      description:
        "Read The Cinder Wren in full: a blockade runner with disputed salvage and an outlawed AI core.",
      href: "/examples/the-cinder-wren-space-western-ship",
      badge: "Example",
    },
    {
      title: "Space Western Hub",
      description:
        "Open Space Western-ready generators for the people and places around your crew.",
      href: "/generators/space-western",
      badge: "Hub",
    },
    {
      title: "Social Hub Generator",
      description:
        "Build cantinas, refuelling lounges, and outpost meeting places where deals go wrong.",
      href: "/generators/social-hub",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create freight combines, mining concerns, marshal offices, and syndicates with competing agendas.",
      href: "/generators/faction",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Chart the Next Hard Run",
    description:
      "Build a connected frontier where every job changes who controls the next port.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
