import type { LandingPageConfig } from "../schema";

export const vampireTheMasquerade: LandingPageConfig = {
  slug: "vampire-the-masquerade",
  kind: "system",
  theme: "horror",
  hub: "vampire",
  surfaceStyle: "sharp",
  seo: {
    title: "Codex Cryptica for Vampire: The Masquerade",
    description:
      "Whether you run V5, V20, or classic Revised, manage your Vampire: The Masquerade chronicle in one connected, local-first workspace.",
    image: "https://assets.codexcryptica.com/og/vampire-the-masquerade.jpg",
    imageAlt:
      "Elysium penthouse study overlooking rainy city skyline with vampire clan lineage chart, wax seals, and crystal glass",
  },
  hero: {
    eyebrow: "Edition-Agnostic Chronicle Management",
    title: "Codex Cryptica for Vampire: The Masquerade",
    tagline:
      "Whether you run V5, V20, or classic Revised, a Vampire chronicle quickly becomes a web of Kindred politics, hunting grounds, boons, and lethal secrets. Keep that web connected in one place.",
    problemStatement:
      "Standard notes break down when every Kindred is tied to three debts, two mortal Touchstones, and a rival faction. When a Primogen shifts allegiance or a Masquerade breach threatens the city, you shouldn’t have to scramble through scattered documents to know who holds leverage over whom.",
  },
  useCases: [
    {
      title: "Interactive Relationship Graph",
      description:
        "Map Blood Bonds, sire-childe lineages, Primogen rivalries, and boons visually so you never lose track of who influences whom.",
      icon: "icon-[lucide--network]",
    },
    {
      title: "Domains, Elysium & Hunting Grounds",
      description:
        "Track Elysium, feeding racks, clan territory, contested havens, and mortal herds across your city.",
      icon: "icon-[lucide--map-pin]",
    },
    {
      title: "Touchstones & Humanity Anchors",
      description:
        "Anchor your coterie’s Humanity with mortal Touchstones and Convictions, tracking who keeps your Kindred grounded before the Beast takes hold.",
      icon: "icon-[lucide--heart-handshake]",
    },
    {
      title: "The Masquerade & Storyteller Secrets",
      description:
        "Track Masquerade breaches, Second Inquisition pressure, court decrees, and private Storyteller plots in local-first storage.",
      icon: "icon-[lucide--book-open]",
    },
  ],
  exampleGraph: {
    title: "Chronicle Relationship Web",
    description:
      "One Prince, her lineage, her domain, the debts she carries, and the mortal who keeps her secrets.",
    badgeLabel: "Relationship Graph",
    palette: "oxblood",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "Prince Ilaria Vesk",
        sublabel: "Kindred • Ventrue Prince",
        category: "character",
      },
      {
        label: "Marcus Vesk",
        sublabel: "Kindred • Ventrue Childe",
        relation: "Sire of",
        category: "character",
      },
      {
        label: "The Ashgrove Rack",
        sublabel: "Domain • Hunting Ground",
        relation: "Controls",
        category: "location",
      },
      {
        label: "The Cinderhall Anarchs",
        sublabel: "Faction • Anarch Coterie",
        relation: "Owes a major boon to",
        category: "faction",
      },
      {
        label: "Sgt Iona Brack",
        sublabel: "Mortal • Police Contact",
        relation: "Blackmails",
        category: "character",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Vampire Clan Generator",
      description:
        "Create custom bloodlines, faction histories, and founder lore for homebrew Vampire clans.",
      href: "/generators/vampire-clan",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Spin up rival Kindred, Primogen, and mortal assets with distinct motives and backgrounds.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Domain & District Generator",
      description:
        "Generate urban neighbourhoods, nightlife districts, and city blocks you can claim as domains, havens, and hunting grounds.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Secret Society Generator",
      description:
        "Design cults, secret factions, and conspiracy networks operating behind the city's visible power structure.",
      href: "/generators/secret-society",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Claim Your Domain",
    description:
      "Take command of your nocturnal city. Map bloodlines, track boons and breaches, and run your Vampire chronicle with complete local privacy.",
    buttonText: "Start Your Chronicle Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Paradox Interactive or World of Darkness. Vampire: The Masquerade is a registered trademark of Paradox Interactive AB.",
};
