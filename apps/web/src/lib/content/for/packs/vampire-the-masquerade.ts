import type { LandingPageConfig } from "../schema";

export const vampireTheMasquerade: LandingPageConfig = {
  slug: "vampire-the-masquerade",
  kind: "system",
  theme: "horror",
  surfaceStyle: "sharp",
  seo: {
    title: "Codex Cryptica for Vampire: The Masquerade",
    description:
      "A Vampire chronicle quickly becomes a web of Kindred, coteries, domains, mortal contacts, favours and secrets. Keep that web connected in one campaign space.",
  },
  hero: {
    eyebrow: "Chronicle & Campaign Management",
    title: "Codex Cryptica for Vampire: The Masquerade",
    tagline:
      "A Vampire chronicle quickly becomes a web of Kindred, coteries, domains, mortal contacts, favours and secrets. Keep that web connected in one campaign space.",
    problemStatement:
      "Standard campaign notes struggle when every NPC is connected to three secrets and four rival factions. When a Primogen member shifts their support, you shouldn’t have to manually update five separate documents to remember who owes what to whom.",
  },
  useCases: [
    {
      title: "Interactive Relationship Graph",
      description:
        "Map Blood Bonds, sire-childe lineages, Primogen rivalries, and mortal assets visually so you never lose track of who influences whom.",
      icon: "icon-[lucide--network]",
    },
    {
      title: "Domains & Hunting Grounds",
      description:
        "Track Elysium sanctuaries, rack territories, clan domains, and contested havens across your nocturnal city.",
      icon: "icon-[lucide--map-pin]",
    },
    {
      title: "Touchstones & Mortal Connections",
      description:
        "Keep track of coterie touchstones, human disguises, feeding grounds, and blackmail material alongside your campaign lore.",
      icon: "icon-[lucide--heart-handshake]",
    },
    {
      title: "Session Notes & Secret Lore",
      description:
        "Organise elder decrees, ancient lore fragments, coterie decisions, and private GM secrets in local-first storage.",
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
        sublabel: "Faction • Anarch Cell",
        relation: "Owes favour to",
        category: "faction",
      },
      {
        label: "Sgt Iona Brack",
        sublabel: "Mortal • Police Liaison",
        relation: "Blackmails",
        category: "character",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Vampire Clan Generator",
      description:
        "Generate bloodlines, clan histories, and founder lore for homebrew or custom VtM factions.",
      href: "/generators/vampire-clan",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Spin up rival Kindred, Primogen members, and mortal assets with distinct motives and backgrounds.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Use the Settlement Generator to create districts, domains, havens, and feeding grounds for your chronicle.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Secret Society Generator",
      description:
        "Design secretive cults, Anarch cells, and conspiracy webs operating in the shadows.",
      href: "/generators/secret-society",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your Chronicle",
    description:
      "Start managing your Vampire: The Masquerade campaign with local-first privacy and visual relationship graphs.",
    buttonText: "Try Codex Cryptica Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Paradox Interactive or World of Darkness. Vampire: The Masquerade is a registered trademark of Paradox Interactive AB.",
};
