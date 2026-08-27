import type { LandingPageConfig } from "../schema";

export const deltaGreen: LandingPageConfig = {
  slug: "delta-green",
  kind: "system",
  theme: "horror",
  hub: "cosmic-horror",
  surfaceStyle: "sharp",
  seo: {
    title: "Codex Cryptica for Delta Green Handler Notes & Operations",
    description:
      "Organise your Delta Green operations with connected Agents, Bonds, cells, Green Boxes, cover identities, and Handler notes in one local-first workspace.",
    image: "https://assets.codexcryptica.com/og/delta-green.jpg",
    imageAlt:
      "Federal agent's safe house desk with redacted case files, surveillance photographs, a burner phone, and an evidence bag holding an unnatural artefact",
  },
  hero: {
    eyebrow: "Operations & Handler Notes Management",
    title: "Codex Cryptica for Delta Green",
    tagline:
      "Keep Agents, Bonds, cells, Green Boxes, and the unnatural connected in one local-first workspace.",
    problemStatement:
      "A Delta Green campaign accumulates faster than any other kind of horror game. Each operation leaves behind burned cover identities, strained Bonds, evidence that was never logged, and witnesses somebody decided not to deal with. Six operations later an Agent's sister calls at the worst possible moment, or a cache in another state turns out to hold the only surviving copy of a ritual. You should not have to reconstruct that from memory between sessions.",
  },
  useCases: [
    {
      title: "Agents, Bonds & Cover Identities",
      description:
        "Track each Agent alongside their Bonds, employer, cover identity, and the people who will notice when they stop coming home.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Cells, Agencies & Conspiracies",
      description:
        "Map need-to-know cells, federal agencies, corporate fronts, and the cults and rival programmes working the same ground.",
      icon: "icon-[lucide--network]",
    },
    {
      title: "Green Boxes, Evidence & Artefacts",
      description:
        "Catalogue caches, seized documents, recovered tissue samples, and unnatural artefacts, and link each one to the operation that produced it.",
      icon: "icon-[lucide--archive]",
    },
    {
      title: "Operations, Debriefs & Handler Notes",
      description:
        "Keep operation timelines, loose ends, cleanup failures, and Handler session notes connected so nothing quietly disappears between games.",
      icon: "icon-[lucide--file-text]",
    },
  ],
  exampleGraph: {
    title: "Operation & Bond Web",
    description:
      "One Agent, the Bond he is losing, the cache he can reach, the operation that went wrong, and the congregation nobody has closed the file on.",
    badgeLabel: "Operation Web",
    palette: "oxblood",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "Agent WREN",
        sublabel: "Agent • FBI Field Office",
        category: "character",
      },
      {
        label: "Maria Calloway",
        sublabel: "Bond • Sister",
        relation: "Bonded to",
        category: "character",
      },
      {
        label: "Green Box VT-4",
        sublabel: "Cache • Rented Storage Unit",
        relation: "Holds the key to",
        category: "item",
      },
      {
        label: "SUMMER FLARE",
        sublabel: "Operation • Vermont",
        relation: "Ran",
        category: "event",
      },
      {
        label: "The Ashgrove Congregation",
        sublabel: "Cult",
        relation: "Investigates",
        category: "faction",
      },
      {
        label: "Ashgrove, Vermont",
        sublabel: "Location • Mill Town",
        relation: "Deployed to",
        category: "location",
      },
    ],
  },
  recommendedTools: [
    {
      title: "NPC & Contact Generator",
      description:
        "Create field agents, coroners, federal liaisons, informants, and cult members with distinct motives, secrets, and cover stories.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Secret Society Generator",
      description:
        "Design cults, black-budget programmes, corporate research fronts, and the conspiracies your Agents were never briefed on.",
      href: "/generators/secret-society",
      badge: "Generator",
    },
    {
      title: "News Sheet & Handout Generator",
      description:
        "Generate local press clippings, incident reports, and public notices to hand your Agents as the cover story the world believes.",
      href: "/generators/cosmic-horror/news-sheet-generator",
      badge: "Generator",
    },
    {
      title: "Settlement & District Generator",
      description:
        "Generate the mill towns, suburbs, and industrial districts your operations deploy into, ready to populate with witnesses.",
      href: "/generators/settlement",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Run the Operation. Keep the Files.",
    description:
      "Map Agents, Bonds, caches, and the unnatural in a fast, private, local-first workspace built for long-running campaigns.",
    buttonText: "Open Your Case File Free",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Arc Dream Publishing or the Delta Green Partnership. Delta Green is a trademark of the Delta Green Partnership.",
};
