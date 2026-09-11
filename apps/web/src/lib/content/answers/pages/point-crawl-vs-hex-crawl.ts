import type { AnswerConfigInput } from "../schema";

export const pointCrawlVsHexCrawl: AnswerConfigInput = {
  slug: "point-crawl-vs-hex-crawl",
  category: "worldbuilding",
  publishedAt: "2026-09-07",
  question: "Point crawl vs hex crawl: which should you use?",
  kind: "comparison",
  shortAnswer:
    "Use a point crawl when play is about choosing between known or rumoured destinations and routes, with each journey carrying a clear cost. Use a hex crawl when finding the landscape is itself the game: the party chooses a direction, exposes unknown ground, and manages time and supplies across a broad region. Neither is more open by default; they make different parts of exploration visible at the table.",
  sections: [
    {
      kind: "prose",
      heading: "Start with what players are meant to discover",
      paragraphs: [
        "A point crawl turns an area into a network of meaningful places. Players decide whether to take the guarded road, the flooded causeway, or the smugglers' trail, then deal with the known or suspected price of that route. It gives them freedom to choose among destinations, but it does not ask them to search every mile for something worth finding.",
        "A hex crawl makes direction and distance part of the decision. Players may know that an old tower lies somewhere north-east, but the route, terrain, and intervening discoveries remain uncertain. This works when a missed valley, a bad navigation choice, or a detour around a river can change the expedition. A blank hex is not wasted prep if uncovering it creates information and pressure.",
      ],
    },
    {
      kind: "list",
      heading: "Compare the structures at the table",
      intro:
        "Choose the map whose constraints support the kind of expedition you want to run.",
      items: [
        {
          term: "Navigation freedom",
          text: "Point crawls offer route freedom between prepared landmarks. Hex crawls offer directional freedom, including the chance to head somewhere the GM has not signposted. Use the latter when bearing, scouting, and getting lost should matter.",
        },
        {
          term: "Prep load",
          text: "A point crawl concentrates prep on a small set of nodes and the links between them. A hex crawl needs terrain procedures, encounter tables, and enough keyed or generative material to make exploration dependable. It can be lighter only when you are comfortable generating some results during play.",
        },
        {
          term: "Map granularity",
          text: "Point crawls skip uninteresting distance and zoom in on locations where scenes happen. Hex crawls retain distance, terrain boundaries, weather, and the slow accumulation of travel costs. A regional war campaign may need that geography even when individual hexes are quiet.",
        },
        {
          term: "Hidden information",
          text: "In a point crawl, hidden links, rumours, and changing route conditions conceal selected information while the network stays legible. In a hex crawl, the map itself can be hidden. Use that wider uncertainty when survey, mapping, and the fear of the unknown are central pleasures.",
        },
        {
          term: "Campaign fit",
          text: "Point crawls suit heists, faction travel, short regional adventures, and campaigns where players pursue visible leads. Hex crawls suit frontiers, West Marches play, expeditions, and survival campaigns where the party's route writes the story.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: reaching the Blackglass Observatory",
      paragraphs: [
        "The party has heard that an observatory holds a star map, while a rival expedition left town yesterday. The same region produces different play depending on which structure you choose.",
      ],
      items: [
        {
          term: "Choose a point crawl when the race is the story",
          text: "The party can travel by the imperial road through a toll fort, by a three-day marsh route that avoids the rival, or by a goat path that needs climbing gear. Each option leads through named places with people who can help, obstruct, or sell information. The question is which cost they accept before the rival arrives.",
        },
        {
          term: "Choose a hex crawl when the search is the story",
          text: "The observatory is somewhere in a twelve-by-twelve mountain region. The party must choose valleys, locate water, decide whether to climb before a storm, and determine whether smoke on a ridge belongs to the rival or a refuge. Finding an unmarked pass can save days, while a mistaken bearing can spend supplies the party cannot replace.",
        },
        {
          term: "Why it works",
          text: "Both versions preserve the rival and the observatory, but the point crawl makes route trade-offs the focus. The hex crawl makes the landscape an opponent and a source of discoveries. Pick the version whose unanswered question you want the players to solve.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Choose this structure when you prep",
      intro: "Answer these before drawing the first route or hex grid.",
      items: [
        "Use a point crawl if you can name the destinations that deserve scenes and give each route a distinct cost.",
        "Use a hex crawl if players should learn the region by travelling through it, rather than by selecting from known locations.",
        "Use a point crawl if you have one evening to prepare a compact region with strong factions, routes, and landmarks.",
        "Use a hex crawl if you have procedures for weather, encounters, navigation, and rest that make each travel day consequential.",
        "Use both only when the boundary is clear: perhaps a hex crawl finds the frontier sites, then a point crawl handles the routes within a discovered ruin or city district.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping either map connected in Codex Cryptica",
    paragraphs: [
      "Location entities and their relationships can hold either structure. For a point crawl, record each landmark and route with its time, risk, and current owner. For a hex crawl, keep discoveries, travel logs, and regional factions linked to the locations the party has actually uncovered, so unknown country remains unknown without losing the campaign record.",
    ],
    linkText: "See how the knowledge graph works",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "Encounter generator",
      description:
        "Prepare route hazards or regional encounter results for a wilderness expedition.",
      href: "/generators/encounter",
    },
    {
      title: "Settlement generator",
      description:
        "Create the outposts, ports, and frontier towns that anchor exploration.",
      href: "/generators/settlement",
    },
  ],
  relatedForPages: [
    {
      title: "West Marches Campaigns",
      description:
        "Organise player-led wilderness exploration, shared maps, and expedition records.",
      href: "/for/west-marches",
    },
    {
      title: "Sandbox RPG Campaigns",
      description:
        "Keep locations, factions, and open-world leads connected across a campaign.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "what-is-a-point-crawl",
    "how-do-you-build-a-point-crawl-for-an-rpg",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
  ],
  discovery: {
    id: "answer-point-crawl-vs-hex-crawl",
    parentCluster: "adventure-mapping",
    primaryIntent: "point crawl vs hex crawl for rpg campaigns",
    intentAliases: [
      "point crawl versus hex crawl",
      "should i use a point crawl or hex crawl",
    ],
    userJob: "evaluate",
    uniqueValue:
      "Compares the two exploration structures by what players can choose and discover, how much geography remains on the map, and the prep each demands, with direct campaign-fit guidance.",
    relatedIntents: [
      "answer-point-crawl",
      "answer-build-a-point-crawl",
      "answer-travel-interesting",
      "for-west-marches",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-point-crawl",
        reason:
          "The point-crawl definition explains its nodes, links, and basic use; this comparison helps a GM choose between that structure and a hex crawl before preparing a region.",
      },
    ],
  },
  seo: {
    title: "Point crawl vs hex crawl: which should you use? | Codex Cryptica",
    description:
      "Choose between a point crawl and hex crawl for your RPG campaign. Compare player freedom, prep, map detail, hidden information, and campaign fit.",
    image: "https://assets.codexcryptica.com/og/point-crawl-vs-hex-crawl.jpg",
    imageAlt:
      "Candle-lit tabletop with a route-node point crawl map beside a hex-grid wilderness map",
  },
};
