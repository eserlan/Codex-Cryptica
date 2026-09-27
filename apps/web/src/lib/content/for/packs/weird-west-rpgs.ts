import type { LandingPageConfig } from "../schema";

export const weirdWestRpgs: LandingPageConfig = {
  slug: "weird-west-rpgs",
  kind: "genre",
  theme: "western",
  hub: "western",
  seo: {
    title: "Codex Cryptica for Weird West & Frontier Campaigns",
    description:
      "Organise weird west and frontier campaigns with boomtowns, outlaws, marshals, mining cartels, occult rail barons, and the mystery webs beneath them in one connected setting bible.",
    image: "https://assets.codexcryptica.com/og/weird-west-rpgs.jpg",
    imageAlt:
      "A lone rider on a dusty ridge above a lamplit mining town, with a strange glow rising from the mine",
  },
  hero: {
    eyebrow: "Weird West, Frontier & Occult Railroads",
    title: "Codex Cryptica for Weird West RPGs",
    tagline:
      "Connect the boomtowns, badges, and buried horrors of the frontier, so every claim, killing, and rumour leads somewhere.",
    problemStatement:
      "A Weird West campaign runs on who owns the land, who owns the law, and what is buried under both. A silver strike can found a town overnight, and a rail baron's contract, a marshal's bribe, and a mine that should never have been opened can tie a whole territory together. In Codex Cryptica, connect towns to their claims, lawmen, outlaws, cartels, and the strange thing underground, so when a gunfight, a lynching, or a train robbery happens you can see exactly who it touches.",
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
        "Keep gangs, lawmen, bounty hunters, and the favours between them in view, so a bribed badge or a lynching has consequences later.",
      icon: "icon-[lucide--shield]",
    },
    {
      title: "Rail Barons, Mining Cartels & Money",
      description:
        "Connect railroad syndicates, mining combines, and the investors behind them to the contracts, strikes, and sabotage that decide who profits.",
      icon: "icon-[lucide--train-front]",
    },
    {
      title: "Occult Mysteries & Buried Things",
      description:
        "Follow the strange lights, cursed ground, and hidden cults through your territory, and see which powerful people know what lies beneath.",
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
        relation: "Is sworn to guard",
        category: "character",
      },
      {
        label: "The Blackrail Company",
        sublabel: "Railroad & Mining Cartel",
        relation: "Is hauled by",
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
        relation: "Lies above",
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
        "Create the occult cabal behind the land grab, or the thing they woke.",
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
      "Build a connected territory where every claim, killing, and buried secret changes who holds the frontier next.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
