import type { AnswerConfigInput } from "../schema";

export const whatIsAPointCrawl: AnswerConfigInput = {
  slug: "what-is-a-point-crawl",
  category: "worldbuilding",
  publishedAt: "2026-08-30",
  question: "What is a point crawl?",
  kind: "definition",
  shortAnswer:
    "A point crawl is a way of mapping an adventure area as a set of named locations joined by explicit routes, rather than as a grid of hexes or squares. Players choose which link to travel along instead of which direction to walk, so the map is a small network of nodes and edges: this village connects to that ford, the ford connects to the ruined watchtower. It keeps overland and dungeon travel meaningful without asking anyone to track movement rates across empty terrain.",
  sections: [
    {
      kind: "prose",
      heading: "Why nodes instead of hexes",
      paragraphs: [
        'A hex map answers the question "what is over there?" A point crawl answers "where can I get to from here, and what does it cost?" That difference matters at the table. Most of the interesting decisions in overland travel are about routes and trade-offs — the fast road that is watched, the slow marsh path that is not — and a hex grid buries those choices under bookkeeping about how many hexes a party clears per day.',
        "A point crawl also degrades gracefully. If players ignore three of your seven locations, nothing breaks; the unused nodes are simply still there next time. A hex map that has been half-populated tends to develop conspicuous blank regions instead.",
        "The structure is not new, and it is not owned by any one system. It is the same shape as a flowchart, a transport map, or the room-and-corridor graph of a dungeon — which is why it works equally well for a swamp, a city's underworld, a derelict station, or a stretch of coastline.",
      ],
    },
    {
      kind: "list",
      heading: "What a point crawl is made of",
      intro: "Three pieces, and only the first two are compulsory.",
      items: [
        {
          term: "Points",
          text: "Named, distinct locations worth arriving at. A point should be somewhere a scene can happen, not a waypoint. If nothing can occur there, it belongs on a link instead.",
        },
        {
          term: "Links",
          text: "The routes between points, each carrying its own travel time, difficulty and hazard. Links are where the choice lives, so they should differ from one another — a two-day safe road and a half-day climb are a decision; two identical one-day paths are not.",
        },
        {
          term: "Hidden or conditional links",
          text: "Optional. Routes that only open once the party has learned something, obtained something, or made an ally. These are what stop a point crawl from feeling like a fixed menu.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A worked example: the Saltmere fens",
      paragraphs: [
        "Six points, four of which the party will probably visit. The costs are what make the map playable — without them, every route is the same route.",
      ],
      items: [
        {
          term: "Ashfoot Ferry → Drowned Chapel",
          text: "Half a day by punt, safe, but the ferryman reports every passenger to the reeve.",
        },
        {
          term: "Ashfoot Ferry → Drowned Chapel (fen path)",
          text: "Two days on foot, unwatched, one encounter check per night in the reeds.",
        },
        {
          term: "Drowned Chapel → Heron Stones",
          text: "One day, but only passable at low tide; otherwise the party waits or turns back.",
        },
        {
          term: "Heron Stones → The Undercroft",
          text: "Hidden. Opens only after someone reads the tide-marks carved on the stones.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Where point crawls struggle",
      paragraphs: [
        "They are a poor fit when the geography itself is the content. Wilderness exploration where the point is not knowing what is out there — survey play, hex-by-hex discovery, resource attrition over unmapped country — needs a map that can hold unknowns. A point crawl tells players the shape of the network up front, which is a feature for a heist or a journey and a problem for a frontier.",
        "They also assume you have decided what the interesting places are. That is genuinely harder than rolling terrain, and it is the actual work: a point crawl with six dull nodes is worse than a hex map, not better.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before you run it",
      intro: "A point crawl is ready when each of these is true.",
      items: [
        "Every point is somewhere a scene could plausibly happen.",
        "No two links out of the same point cost the same thing.",
        "At least one link is conditional, hidden, or earned.",
        "The party can learn about a point before they reach it — rumour, signpost, map fragment.",
        "You know what changes at each point if the party comes back later.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping a point crawl in Codex Cryptica",
    paragraphs: [
      "A point crawl is a graph, so it maps directly onto how Codex stores a world: each point is a location entity, and each link is a relationship between two of them carrying its own note about cost and risk. The graph view then draws the network you have been sketching on paper, and clicking a node opens the location's full entry.",
      "The practical benefit is that the routes stop living only in your head. When a party asks whether there is another way to the Heron Stones, the answer is on the node rather than three pages back in a session log.",
    ],
    linkText: "See how the knowledge graph works",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "Dungeon generator",
      description:
        "Room-and-corridor layouts you can lift wholesale as the points of an underground crawl.",
      href: "/generators/dungeon-generator",
    },
    {
      title: "Settlement generator",
      description:
        "Populates the villages, ports and waystations that make good named points.",
      href: "/generators/settlement",
    },
    {
      title: "Encounter generator",
      description: "Fills the links — what the party meets between the nodes.",
      href: "/generators/encounter",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "How connected locations, factions and history hold together across a long campaign.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "what-should-an-rpg-settlement-contain",
    "what-makes-a-good-random-encounter",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-build-a-point-crawl-for-an-rpg",
    "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
  ],
  discovery: {
    id: "answer-point-crawl",
    parentCluster: "adventure-mapping",
    primaryIntent: "what is a point crawl",
    intentAliases: ["point crawl meaning", "point crawl vs hex crawl"],
    uniqueValue:
      "Defines the structure, names its parts, works a fen example with real travel costs, and says when not to use one.",
  },

  seo: {
    title: "What is a point crawl? | Codex Cryptica",
    description:
      "A point crawl maps an adventure as named locations joined by explicit routes, not a hex grid. What it is made of, a worked fen example, and when not to use one.",
  },
};
