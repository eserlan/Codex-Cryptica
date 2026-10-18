import type { LandingPageConfig } from "../schema";

export const weirdWestRpgs: LandingPageConfig = {
  slug: "weird-west-rpgs",
  kind: "genre",
  theme: "western",
  hub: "western",
  seo: {
    title: "Codex Cryptica for Weird West & Frontier Campaigns",
    description:
      "Organise weird west and frontier campaigns with boomtowns, contested claims, competing law, extractive companies, hauntings, curses, and strange forces shaped by the territory's history.",
    image: "https://assets.codexcryptica.com/og/weird-west-rpgs.jpg",
    imageAlt:
      "A lone rider on a dusty ridge above a lamplit mining town, with a strange glow rising from the mine",
  },
  hero: {
    eyebrow: "Weird West, Frontier & Occult Railroads",
    title: "Codex Cryptica for Weird West RPGs",
    tagline:
      "Connect boomtowns, contested claims, patchy law, extractive companies, and occult pressure, so every dispute leaves a mark across the territory.",
    problemStatement:
      "A Weird West campaign runs on who owns the land, who owns the law, and what is buried under both. A silver strike can found a town overnight, and a rail baron's contract, a marshal's bribe, and violence over a claim can tie a whole territory together. In Codex Cryptica, connect towns to their claims, lawmen, outlaws, cartels, and the hauntings, old bargains, and strange forces shaped by people, places, and history, so a gunfight, vigilante killing, or train robbery changes who trusts whom—and what stirs in its wake.",
  },
  useCases: [
    {
      title: "Boomtowns, Claims & Water Rights",
      description:
        "Track each boomtown's founding claim, saloons, sheriff, and the water, land, or ore everyone is really fighting over.",
      icon: "icon-[lucide--map-pin]",
    },
    {
      title: "Outlaws, Marshals & Frontier Law",
      description:
        "Keep gangs, lawmen, bounty hunters, and their favours in view: a bribed badge or vigilante killing can turn today's witness into tomorrow's deputy, while grudges travel across the territory.",
      icon: "icon-[lucide--shield]",
    },
    {
      title: "Rail Barons, Mining Cartels & Money",
      description:
        "Connect railroad syndicates, mining combines, and the investors behind them to the contracts, strikes, and sabotage that decide who profits.",
      icon: "icon-[lucide--train-front]",
    },
    {
      title: "Occult Mysteries & Frontier Folklore",
      description:
        "Follow hauntings, revenants, cursed ground, strange weather, and local folklore through your territory; trace them to old violence, bargains, or greed, and the people caught in their wake.",
      icon: "icon-[lucide--skull]",
    },
  ],
  exampleGraph: {
    title: "Sample Weird West Campaign Web",
    description:
      "If the Widow's Vein floods, Harrow's Rest loses its living, the Blackrail Company loses its cargo, Marshal Quill loses her excuse to look away, and something in the deep shaft gets what it wanted.",
    steps: [
      {
        label: "The Widow's Vein",
        sublabel: "Silver Mine Under Dispute",
        category: "location",
      },
      {
        label: "Harrow's Rest",
        sublabel: "Boomtown",
        relation: "Feeds",
        category: "location",
      },
      {
        label: "Marshal Ada Quill",
        sublabel: "Territorial Lawman",
        relation: "Falls under the law of",
        category: "character",
      },
      {
        label: "The Blackrail Company",
        sublabel: "Railroad & Mining Cartel",
        relation: "Ships ore to",
        category: "faction",
      },
      {
        label: "Silas Crowe",
        sublabel: "Outlaw & Claim Jumper",
        relation: "Is raided by",
        category: "character",
      },
      {
        label: "The Hollow Choir",
        sublabel: "Something in the Deep Shaft",
        relation: "Awakened",
        category: "creature",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Settlement Generator",
      description:
        "Build boomtowns and ghost towns with saloons, law, claims, and the trouble that follows a strike.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create railroad syndicates, mining cartels, and outlaw gangs with competing agendas.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Draw marshals, gunslingers, claim jumpers, and preachers with motives you can use at the table.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Quest Generator",
      description:
        "Turn bounties, robberies, and strange sightings into hooks that cost the party something.",
      href: "/generators/quest",
      badge: "Generator",
    },
    {
      title: "Secret Society Generator",
      description:
        "Create the occult society behind a land grab, a local bargain, or a creature stirred by violence or greed.",
      href: "/generators/secret-society",
      badge: "Generator",
    },
    {
      title: "Western Hub",
      description:
        "Open western-ready generators for the towns, lawmen, and frontier rumours around your campaign.",
      href: "/generators/western",
      badge: "Hub",
    },
  ],
  cta: {
    title: "Saddle Up Your Next Campaign",
    description:
      "Build a connected territory where every claim, killing, and old secret changes who holds the frontier next.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
