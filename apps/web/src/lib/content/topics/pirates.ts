import type { TopicHubConfig } from "./types";

export const PIRATE_TOPIC_CONFIG = {
  slug: "pirates",
  canonicalPath: "/topics/pirates",
  label: "pirate",
  title: "Planning a Pirate or High-Seas Campaign",
  metaTitle: "Pirate & High-Seas Campaign Guides | Codex Cryptica",
  description:
    "Plan a pirate campaign with practical guides to choosing a game, exploring the sea, making voyages matter, running ship combat, building islands and ports, and setting rivals in motion.",
  leadParagraph:
    "A pirate campaign can be about more than the next broadside. These guides help you choose the kind of game you want to play, give the crew meaningful destinations, make the sea carry discoveries and consequences, and keep ships, ports, and rivals changing between voyages. Start with the question your table is asking, then follow the links to a worked adventure, the Pirate Generator hub, and tools for ships, settlements, and factions.",

  ogImage: "https://assets.codexcryptica.com/og/pirates-high-seas.jpg",
  ogImageAlt:
    "A weathered pirate sloop under full sail approaching a hidden island cove at dusk",

  copy: {
    thesisHeading: "Make the sea change what happens next",
    learnHeading: "Plan the campaign",
    learnIntro:
      "Choose the play experience first, then build voyages and conflicts that give the crew reasons to care where they sail.",
    examplesHeading: "See a pirate adventure in motion",
    examplesIntro:
      "Follow one crew through a vanished captain, an expired commission, and a naval patrol closing in.",
    exampleHighlightLabel: "What it shows:",
    toolsHeading: "Build the crew’s world",
    toolsIntro:
      "Create a ship, a harbour, or the factions competing to control the routes between them.",
    workflowHeading: "Prepare the next voyage",
    workflowIntro:
      "A four-step route from choosing your game to giving the crew a changing sea to explore.",
    relatedHeading: "Keep exploring",
  },

  structuredData: {
    aboutName: "Pirate and High-Seas Tabletop Campaigns",
    aboutDescription:
      "Choosing, planning, and running pirate and high-seas tabletop roleplaying campaigns.",
    itemListName: "Pirate and High-Seas Campaign Guides and Tools",
    itemListDescription:
      "Guides for pirate campaign systems, exploration, sea travel, naval combat, islands, ports, ships, and factions, with generators and a worked adventure.",
    breadcrumbLabel: "Pirate & High-Seas Campaigns",
  },

  thesisPoints: [
    {
      title: "Let the crew choose where the chart leads",
      summary:
        "Offer rumours, maps, jobs, and rival moves as useful leads, while leaving room for the crew to choose a destination or declare their own goal. Exploration feels real when the players can change the route.",
    },
    {
      title: "Make each voyage leave a mark",
      summary:
        "A corrected chart, a lost harbour, a changed patrol, or a new price can show what happened while the crew was away. Carry those consequences into the next visit so the sea does not reset between adventures.",
    },
    {
      title: "Use ship fights as one kind of pressure",
      summary:
        "A naval encounter can ask the whole party to make urgent choices about navigation, damage, crew, and objectives. It need not become the answer to every problem at sea.",
    },
  ],

  coreGuides: [
    {
      title: "What TTRPG should I play for a pirate or high-seas campaign?",
      href: "/answers/what-ttrpg-should-i-play-for-a-pirate-campaign",
      description:
        "Compare pirate games by the kind of play their rules support: daring action, open-ended exploration, ship management, or a ready-made campaign setting.",
      focus: "Choose a game",
    },
    {
      title:
        "How do I run a pirate campaign that feels like exploration rather than a series of naval battles?",
      href: "/answers/how-do-i-run-a-pirate-campaign-focused-on-exploration",
      description:
        "Build a flexible voyage, discovery, and consequence loop that gives the crew meaningful choices about where to sail and what to leave unexplored.",
      focus: "Campaign exploration",
    },
    {
      title: "How do I make sea travel interesting in a TTRPG?",
      href: "/answers/how-do-i-make-sea-travel-interesting-in-a-ttrpg",
      description:
        "Make a voyage matter with route choices, changing conditions, useful discoveries, and consequences that carry into the next destination.",
      focus: "Voyages and travel",
    },
    {
      title:
        "How do I run ship-to-ship combat without sidelining half the party?",
      href: "/answers/how-do-i-run-ship-to-ship-combat-without-sidelining-the-party",
      description:
        "Give several characters meaningful jobs during a naval fight by putting concurrent pressures on the ship and changing the objective as the battle develops.",
      focus: "Naval combat",
    },
    {
      title:
        "How do I create interesting islands and ports for a pirate campaign?",
      href: "/answers/how-do-i-create-interesting-islands-and-ports-for-a-pirate-campaign",
      description:
        "Make each stop distinct with a local pressure, a reason to land, and consequences that change when the crew returns.",
      focus: "Islands and ports",
    },
    {
      title:
        "How do I make rival captains, navies, and pirate factions matter?",
      href: "/answers/how-do-i-make-rival-captains-navies-and-pirate-factions-matter",
      description:
        "Put rival crews, navies, and companies in motion, then show their decisions through patrols, prices, access, rumours, and reputation.",
      focus: "Rivals and factions",
    },
    {
      title: "What kind of ship should a pirate crew start with?",
      href: "/answers/what-kind-of-ship-should-a-pirate-crew-start-with",
      description:
        "Choose a starting hull, crew size, ownership problem, and upgrades that create useful decisions for the campaign.",
      focus: "The crew’s ship",
    },
  ] satisfies TopicHubConfig["coreGuides"],

  workedExamples: [
    {
      title: "Letters of Marque, Expired",
      href: "/examples/letters-of-marque-expired-pirate-adventure",
      genre: "Pirate & High Seas",
      description:
        "The crew’s commission has expired, their captain has vanished, and a naval patrol is closing on the free port where they are taking on water.",
      highlight:
        "A full adventure arc with competing pressures and several ways for the crew to respond.",
      image: {
        src: "https://assets.codexcryptica.com/announcements/adventure-dead-mans-tontine.jpg",
        alt: "Privateers on a lantern-lit sloop deck examining a cipher cylinder as a naval squadron waits offshore",
        width: 1600,
        height: 900,
      },
    },
  ],

  generators: [
    {
      title: "Pirate Generator Hub",
      href: "/generators/pirate",
      description:
        "Browse pirate-themed generators for building ships, settlements, factions, and other campaign material.",
      badge: "Generator hub",
    },
    {
      title: "Ship Generator",
      href: "/generators/ship-generator",
      description:
        "Create a vessel with a crew, mission, complication, and secret to give the party a ship worth keeping.",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      href: "/generators/settlement",
      description:
        "Build a harbour, free port, island town, or colony with its own people and pressures.",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      href: "/generators/faction",
      description:
        "Create a navy, trading company, or pirate brotherhood with goals, dependencies, and rivalries.",
      badge: "Generator",
    },
  ] satisfies TopicHubConfig["generators"],

  workflow: [
    {
      step: 1,
      title: "Choose the kind of pirate game you want",
      description:
        "Decide whether the table wants swashbuckling action, open exploration, ship management, or a ready-made campaign to adapt.",
      recommendedResource: {
        title: "Choose a pirate campaign game",
        href: "/answers/what-ttrpg-should-i-play-for-a-pirate-campaign",
      },
    },
    {
      step: 2,
      title: "Give the crew a chart worth changing",
      description:
        "Put destinations, rumours, hazards, and rival moves on the map, then let discoveries change what the crew knows about the sea.",
      recommendedResource: {
        title: "Run a pirate campaign through exploration",
        href: "/answers/how-do-i-run-a-pirate-campaign-focused-on-exploration",
      },
    },
    {
      step: 3,
      title: "Make the next stop distinct",
      description:
        "Give an island or port a local pressure and a reason the crew may return after their choices have changed it.",
      recommendedResource: {
        title: "Create interesting islands and ports",
        href: "/answers/how-do-i-create-interesting-islands-and-ports-for-a-pirate-campaign",
      },
    },
    {
      step: 4,
      title: "Carry consequences into the next voyage",
      description:
        "Let rivals act when they have cause, and show the result in patrols, prices, access, rumours, and reputation.",
      recommendedResource: {
        title: "Make pirate rivals and factions matter",
        href: "/answers/how-do-i-make-rival-captains-navies-and-pirate-factions-matter",
      },
    },
  ] satisfies TopicHubConfig["workflow"],

  relatedTopics: [
    {
      title: "Codex Cryptica for Pirate & High-Seas Campaigns",
      href: "/for/pirates-high-seas",
      description:
        "Explore the campaign workspace for connecting ships, crews, islands, rival fleets, and trade routes.",
    },
    {
      title: "All Pirate Material on Explore",
      href: "/explore?label=pirate",
      description:
        "Browse more pirate guides, generators, and worked examples across the site.",
    },
  ],
} satisfies TopicHubConfig;
