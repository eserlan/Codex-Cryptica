import type {
  TopicGuideLink,
  TopicHubConfig,
  TopicToolLink,
  TopicWorkflowStep,
} from "./types";

export const STAR_SYSTEMS_TOPIC_CONFIG = {
  slug: "star-systems",
  label: "sci-fi",
  canonicalPath: "/topics/star-systems",
  title: "Star Systems & Sci-Fi Campaign Building",
  metaTitle: "Star Systems & Sci-Fi Campaign Building | Codex Cryptica",
  description:
    "A Game Master learning path for sci-fi campaigns: choose a few destinations that each do a job, tie them together with routes and cargo, set rival factions against each other and light the fuse.",
  leadParagraph:
    "A sci-fi campaign setting is playable when the crew always has somewhere worth going, a reason it takes effort to get there, and someone who wants to stop them. This hub walks through that design order, from a handful of destinations to a live flashpoint, with the guides and generators that help at each step.",

  ogImage:
    "https://assets.codexcryptica.com/og/how-to-create-a-sci-fi-star-system-for-an-rpg.jpg",
  ogImageAlt:
    "Exploration ship overlooking a gas giant, mining moon, orbital station, and busy routes through a star system",

  primaryAction: {
    label: "Generate a Star System",
    href: "/generators/star-system",
    secondary: {
      label: "Or learn the method first",
      href: "/answers/how-to-create-a-sci-fi-star-system-for-an-rpg",
    },
  },

  copy: {
    thesisHeading: "What makes a system playable",
    thesisIntro:
      "Building a star system for a tabletop campaign means designing a small set of reachable places, the routes and supplies between them, and the groups competing over them. The crew always has somewhere to go, and getting there costs something.",
    learnHeading: "Learn the method",
    learnIntro:
      "Start with the core guide, then use the supporting guides for aliens, ships, travel, crew roles and factions.",
    examplesHeading: "See a system, start to finish",
    examplesIntro:
      "A short worked system shows how destinations, routes, cargo, factions and a flashpoint fit together, so you can copy the shape for your own table.",
    exampleHighlightLabel: "Why it works:",
    toolsHeading: "Generate the detail",
    toolsIntro:
      "The Star System Generator can start a system or fill gaps in one you have drafted. The supporting tools then develop individual worlds, peoples, ships and factions.",
    workflowHeading: "Two ways in, one system",
    workflowIntro:
      "Start from the Star System Generator and use these five steps to check and sharpen what it rolls, or work through them by hand and use the generator at any point to fill gaps. Either way, you finish by developing one world in depth.",
    relatedHeading: "Keep exploring",
  },

  structuredData: {
    aboutName: "Sci-Fi Star Systems and Campaign Building",
    aboutDescription:
      "Designing and running playable star systems and science-fiction campaign settings in tabletop roleplaying games.",
    itemListName: "Star System & Sci-Fi Campaign Resources",
    itemListDescription:
      "Curated guides and generators for building and running a playable sci-fi star system campaign.",
    breadcrumbLabel: "Star Systems Topic Hub",
  },

  thesisPoints: [
    {
      title: "Few destinations, each with a job",
      summary:
        "Three to five reachable places beat a catalogue of twelve. Give each a clear function, such as a place to refuel, trade, hide or get hurt, so choosing where to go is already a decision.",
    },
    {
      title: "Distance should cost something",
      summary:
        "Travel time, fuel, patrol lanes and windows when a route is open turn the map into a set of trade-offs. If every destination is a free jump away, nothing the crew picks matters.",
    },
    {
      title: "Let places depend on each other",
      summary:
        "When one world grows food, another mines the metal that pays for it and a third taxes the lane between them, a problem in one spot ripples outward. Those dependencies give the crew leverage and give you ready-made consequences.",
    },
    {
      title: "Rivals and a live flashpoint",
      summary:
        "Two or more factions that want incompatible things, plus one event happening right now, give the system momentum. The crew does not need a plot handed to them when the pressure is already visible at every stop.",
    },
  ],

  coreGuides: [
    {
      title: "How to Create a Sci-Fi Star System for an RPG",
      href: "/answers/how-to-create-a-sci-fi-star-system-for-an-rpg",
      description:
        "The core framework for turning a list of places into a playable system, covering what each place is for, how far apart they are, who fights over them and what is happening now.",
      focus: "Core Guide: System Framework",
    },
    {
      title: "Making an Alien Species Feel Believable",
      href: "/answers/how-do-you-make-an-alien-species-feel-believable",
      description:
        "Build a people from their biology and environment so the residents of your worlds behave in ways that follow from where they live.",
      focus: "Peoples & Cultures",
    },
    {
      title: "What Ship Should a Sci-Fi Party Start With?",
      href: "/answers/what-kind-of-ship-should-a-sci-fi-rpg-party-start-with",
      description:
        "Choose a starting vessel whose strengths and limits shape which routes and destinations the crew can reach.",
      focus: "The Crew's Ship",
    },
    {
      title: "Making Travel Interesting in a Tabletop RPG",
      href: "/answers/how-do-you-make-travel-interesting-in-a-tabletop-rpg",
      description:
        "Turn the gaps between destinations into choices, pressure and scenes rather than skipped time.",
      focus: "Routes & Travel",
    },
    {
      title: "Running Crew Roles in a Sci-Fi or Space Opera RPG",
      href: "/answers/how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg",
      description:
        "Give pilots, engineers, medics and negotiators moments that matter as the crew moves through the system.",
      focus: "Crew Roles",
    },
    {
      title: "Running Factions in a Sandbox Campaign",
      href: "/answers/how-do-you-run-factions-in-a-sandbox-campaign",
      description:
        "Keep rival groups moving between sessions so the system changes even when the crew is elsewhere. The advice is system-neutral and fits any setting.",
      focus: "Factions & Conflict",
    },
  ] satisfies TopicGuideLink[],

  workedExamples: [],

  inlineExample: {
    title: "The Halden Drift",
    genre: "Frontier Sci-Fi",
    summary:
      "A dim red star with a belt of ice and three settled places. The crew arrives to take a freight contract and finds the whole system leaning on one fragile supply line.",
    parts: [
      {
        term: "Destinations",
        text: "Tern Anchorage is a tug yard and the only place to refit, so the crew keeps coming back. Coldwell is an ice-mining moon that sells water and takes the risks. Veyra Deep is a sealed hydroponic ring that feeds everyone and asks no questions about cargo.",
      },
      {
        term: "Routes and travel",
        text: "Tern Anchorage to Coldwell is a two-day burn through the belt, and rock storms close it for part of each week. Coldwell to Veyra Deep is a four-day haul that only the heavy tugs can fly. Veyra Deep to Tern Anchorage is a short hop, but it passes the customs gate.",
      },
      {
        term: "Resource flow",
        text: "Water leaves Coldwell on tugs refitted at Tern Anchorage and ends up in the Veyra Deep ring. Veyra Deep sends back food, and when a water convoy is late, its rationing starts within a week. Everyone depends on that loop staying open.",
      },
      {
        term: "Factions",
        text: "The Anchorage Tugmasters want to keep tolls on the belt route and their monopoly on refits. The Coldwell Free Miners want to ship water on their own hulls and skip the tolls. Both cannot win: either the tolls stand or the miners fly free.",
      },
      {
        term: "Flashpoint",
        text: "A water convoy has gone missing in the belt, and the Free Miners are blaming the Tugmasters. The crew can search the belt route, press the Tugmasters at the Anchorage, or carry emergency water to Veyra Deep before the rationing begins.",
      },
    ],
    highlight:
      "Every place has a job, every route has a cost, and one missing convoy pulls the crew toward all three destinations",
  },

  generators: [
    {
      title: "Star System Generator",
      href: "/generators/star-system",
      description:
        "Generate a star or stars, three to twelve major bodies, factions, a key resource, a travel hazard and a system-wide conflict or mystery. View the system diagram, then use Develop This World on a named body to open the World Generator with that context.",
      badge: "Primary Tool",
    },
    {
      title: "World Generator",
      href: "/generators/world",
      description:
        "Develop a single planet or moon into a full world, including a body carried over from a generated star system.",
      badge: "Supporting Tool",
    },
    {
      title: "Alien Race Generator",
      href: "/generators/alien-race",
      description:
        "Create the species that live on or travel through your worlds, shaped by their home environment.",
      badge: "Supporting Tool",
    },
    {
      title: "Ship Generator",
      href: "/generators/ship-generator",
      description:
        "Build the crew's vessel or a rival hull, so travel limits and chases have a specific ship behind them.",
      badge: "Supporting Tool",
    },
    {
      title: "Faction Generator",
      href: "/generators/faction",
      description:
        "Create the rival groups that want incompatible things in your system, from toll holders to independent miners.",
      badge: "Supporting Tool",
    },
  ] satisfies TopicToolLink[],

  workflow: [
    {
      step: 1,
      title: "Map 3-5 destinations",
      description:
        "Roll a system and keep the places that each do a job, or pick a few places by hand. Cut or merge any that feel redundant.",
      recommendedResource: {
        title: "Star System Generator",
        href: "/generators/star-system",
      },
    },
    {
      step: 2,
      title: "Connect movement and resources",
      description:
        "Decide how long each route takes, what blocks it and what cargo or supplies flow along it, so a delay in one place matters in another.",
      recommendedResource: {
        title: "Making Travel Interesting",
        href: "/answers/how-do-you-make-travel-interesting-in-a-tabletop-rpg",
      },
    },
    {
      step: 3,
      title: "Place competing factions",
      description:
        "Put at least two groups in the system who want incompatible things from the same routes or resources.",
      recommendedResource: {
        title: "Running Factions in a Sandbox Campaign",
        href: "/answers/how-do-you-run-factions-in-a-sandbox-campaign",
      },
    },
    {
      step: 4,
      title: "Set a flashpoint",
      description:
        "Choose one event happening now that can pull the crew to several destinations, and decide what each faction does about it.",
      recommendedResource: {
        title: "Faction Generator",
        href: "/generators/faction",
      },
    },
    {
      step: 5,
      title: "Develop one world in depth",
      description:
        "From a generated system, use Develop This World on a named body. From a hand-built system, take your notes to the World Generator.",
      recommendedResource: {
        title: "World Generator",
        href: "/generators/world",
      },
    },
  ] satisfies TopicWorkflowStep[],

  relatedTopics: [
    {
      title: "Pirates & High Seas",
      href: "/topics/pirates",
      description:
        "Travel, trade and ships on dangerous waters, with ideas that carry over to space lanes.",
    },
    {
      title: "Space Opera",
      href: "/for/space-opera",
      description:
        "Campaign tools for big, adventurous space stories with crews, ships and rival powers.",
    },
    {
      title: "All Sci-Fi Material on Explore",
      href: "/explore?label=sci-fi",
      description:
        "Browse every guide, generator and example tagged sci-fi across Codex Cryptica.",
    },
  ],
} satisfies TopicHubConfig;
