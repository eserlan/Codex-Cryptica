import type { LandingPageConfig } from "../schema";

export const westMarches: LandingPageConfig = {
  slug: "west-marches",
  kind: "use-case",
  theme: "fantasy",
  hub: "fantasy",
  seo: {
    title: "Codex Cryptica for West Marches Campaigns",
    description:
      "Run an open-table West Marches hexcrawl with one shared world: a base town, a hex map that fills in through exploration, a rumour board, and lasting consequences.",
    image: "https://assets.codexcryptica.com/og/west-marches.jpg",
    imageAlt:
      "A hand-drawn wilderness map on a tavern table, half of it still blank, weighted down with a lantern and a stack of expedition notes",
  },
  hero: {
    eyebrow: "Open-Table Campaign Management",
    title: "Codex Cryptica for West Marches Campaigns",
    tagline:
      "One world, one hex map, one set of consequences — however many players turn up, and whenever they do.",
    problemStatement:
      "In a West Marches game you are the only person who has seen the whole map. Six players went out in March and named a ruin; four different players go back in September and need to know what the first group found, who they annoyed, and which road is now watched. The world keeps moving between expeditions, and none of it is written down anywhere the next party can use.",
  },
  useCases: [
    {
      title: "One World, a Rotating Roster",
      description:
        "Keep every character in the pool, alive or dead, attached to the places they went and the people they dealt with — so a party that has never played together still inherits the same world.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "A Rumour Board That Points Somewhere",
      description:
        "Hold leads next to what they actually lead to. When players pick where to go this week, you can see at a glance which rumours are still live, who spread them, and which ones have already been chased.",
      icon: "icon-[lucide--scroll-text]",
    },
    {
      title: "The Hex Map Fills In as They Explore",
      description:
        "Explored hexes, routes and the sites inside them build up as expeditions come back. What has been found, what was only glimpsed, and what is still blank stays visible without rebuilding the map each session.",
      icon: "icon-[lucide--map]",
    },
    {
      title: "Consequences Outlive the Expedition",
      description:
        "A burnt bridge, an unpaid toll or a woken thing stays attached to the place and the faction it belongs to, so it turns up for the next group rather than in a session log nobody rereads.",
      icon: "icon-[lucide--milestone]",
    },
  ],
  exampleGraph: {
    title: "One Expedition, and What It Leaves Behind",
    description:
      "Everything the next party inherits from a single trip out: where they started, who went, what they were chasing, how far they got, and what they now owe.",
    badgeLabel: "Expedition Record",
    steps: [
      {
        label: "The Third Ashfall Expedition",
        sublabel: "Expedition",
        category: "event",
      },
      {
        label: "Greyhollow",
        sublabel: "Base Town",
        relation: "Set out from",
        category: "location",
      },
      {
        label: "The Hollow Wardens",
        sublabel: "Toll-takers • Kettle Road",
        relation: "Owes a toll to",
        category: "faction",
      },
      {
        label: "Bells Under the Ice",
        sublabel: "Trapper's Rumour",
        relation: "Chased",
        category: "note",
      },
      {
        label: "The Weeping Stair",
        sublabel: "Landmark • Partly mapped",
        relation: "Mapped",
        category: "location",
      },
      {
        label: "Marta Fenn",
        sublabel: "Delver • Mapmaker",
        relation: "Joined by",
        category: "character",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Settlement Generator",
      description:
        "Build the base town everyone comes back to, with the people, trades and rivalries that make downtime worth playing.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Stock the rumour board with more leads than any one party can chase, so players choose where to go.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
    {
      title: "Dungeon Generator",
      description:
        "Draw up the ruins, barrows and worked-out mines waiting at the end of a hard day's travel.",
      href: "/generators/dungeon-generator",
      badge: "Generator",
    },
    {
      title: "Encounter Generator",
      description:
        "Fill the ground between landmarks with things that make the journey out cost something.",
      href: "/generators/encounter",
      badge: "Generator",
    },
    {
      title: "What is a point crawl?",
      description:
        "Routes and travel costs instead of hex bookkeeping — a useful way to structure the ground your parties cross.",
      href: "/answers/what-is-a-point-crawl",
      badge: "Answer",
    },
    {
      title: "Codex Cryptica for Sandbox Campaigns",
      description:
        "Running the same world for one settled group instead of an open table? Start here.",
      href: "/for/sandbox-campaigns",
      badge: "Guide",
    },
  ],
  cta: {
    title: "Open the Map Before the Next Expedition",
    description:
      "Give your table one shared world that remembers every trip out, whoever made it.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};
