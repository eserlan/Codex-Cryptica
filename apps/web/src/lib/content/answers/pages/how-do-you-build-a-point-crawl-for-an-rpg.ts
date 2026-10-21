import type { AnswerConfigInput } from "../schema";

export const howDoYouBuildAPointCrawlForAnRpg: AnswerConfigInput = {
  slug: "how-do-you-build-a-point-crawl-for-an-rpg",
  category: "worldbuilding",
  publishedAt: "2026-09-04",
  question: "How do you build a point crawl for an RPG?",
  kind: "how-to",
  shortAnswer:
    "To build a point crawl, name five to seven places the party could visit, connect them with routes, and note each route's travel time, cost, and known risk. Give the party at least two meaningful ways to reach an important destination, then decide what changes if they take longer or accept a hazard.",
  sections: [
    {
      kind: "prose",
      heading: "Start with the places that matter",
      paragraphs: [
        "Point crawls work well when the adventure centres on a handful of known or rumoured destinations and the choices between them: a city district, a heist, a dangerous crossing, or a compact wilderness region. Keep the locations distinct, then make routes matter through time, supplies, information, hazards, or who notices the party.",
        "Use a hex crawl when exploring the terrain itself is part of the fun. The structures can also sit at different scales: a hex crawl can lead the party to a region, with a point crawl handling the routes through a ruin or settlement. For help choosing, see [point crawl vs hex crawl](/answers/point-crawl-vs-hex-crawl).",
      ],
    },
    {
      kind: "list",
      heading: "Five steps to build one",
      intro: "A compact network can be ready with these steps:",
      items: [
        {
          term: "Step 1: Place landmark nodes",
          text: "Choose five to seven destinations. Give each a reason to visit and one useful detail: a person, resource, clue, danger, or change the party can cause.",
        },
        {
          term: "Step 2: Differentiate connecting paths",
          text: "For each route, note an estimated travel time and any cost or known risk. Similar routes are fine if their choices still differ, such as one being safer and the other avoiding a watched checkpoint.",
        },
        {
          term: "Step 3: Build in loops and branch points",
          text: "Give important destinations alternate approaches and add a loop where it makes sense. A branch can be a real choice too, especially when returning by the same route has a cost.",
        },
        {
          term: "Step 4: Seed transitional road discoveries",
          text: "Add a discovery or obstacle to a route if it changes a decision: a ford that reveals tracks, a wreck with spare supplies, or a bridge that is out after heavy rain.",
        },
        {
          term: "Step 5: Telegraph route conditions in advance",
          text: "Let players learn some route conditions through rumours, signs, scouts, or past experience. Keep a few details uncertain if discovery is part of the adventure.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Copyable example: the road to Morzan's Crypt",
      paragraphs: [
        "Copy these six nodes and routes, then change the names and costs to fit your game. Travel times assume a party moving at an ordinary pace; adjust them for your rules, weather, or group.",
      ],
      items: [
        {
          term: "Nodes",
          text: "Oakhaven (start and rumour board); Toll Bridge (watched crossing); Reed Causeway (muddy but unwatched); Old Watchtower (high ground and a clear view); Hermit's Cairn (a guide knows a hidden track); Morzan's Crypt (the goal).",
        },
        {
          term: "Routes",
          text: "Oakhaven to Toll Bridge: half a day; pay 2 silver per traveller or arrive watched. Toll Bridge to Watchtower: half a day; the keeper will warn the bridge guard if threatened. Oakhaven to Reed Causeway: one day; spend an extra ration per traveller or forage, risking a delay. Causeway to Watchtower: half a day; tracks here reveal whether the rival party passed first. Causeway to Hermit's Cairn: half a day; the hermit shares the hidden track if the party brings news from Oakhaven. Watchtower to Crypt: one day over exposed ground; anyone seen here alerts the crypt's sentries. Hermit's Cairn to Crypt: half a day on the hidden track; the party arrives unseen. Watchtower to Toll Bridge: half a day, making a loop back to the road.",
        },
        {
          term: "Consequences to track",
          text: "The rival reaches the crypt first if the party spends two full days travelling or resting on the road. If the sentries are alerted, they prepare an ambush; if the party arrives unseen, they can choose where and when to enter. Taking the bridge costs coin and risks being followed; the causeway costs supplies and time but can lead to the hidden approach.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Point crawl checklist",
      intro:
        "Before you put the regional map in front of your players, check it against these:",
      items: [
        "Each node has a name, a reason to visit, and a detail that can affect play.",
        "Every important destination has a choice of approach, or a clear cost for returning the way the party came.",
        "Each route has an estimated travel time and any supply cost, hazard, clue, or uncertainty that matters.",
        "At least one route choice changes what happens next, such as who arrives first, who is alerted, or what resources remain.",
        "Players can discover enough about routes to make a choice, while any hidden information has a way to be found.",
      ],
    },
  ],
  codexConnection: {
    heading: "Build a point crawl in Codex Cryptica",
    paragraphs: [
      "The Point Crawl Generator can create a network with named locations, branching routes, hidden passages and an interactive map that you can adjust or export. Saving the result makes Location entities and an overview note in your local vault; keep the travel times, dangers and decisions in the route lore so you can update them between sessions.",
    ],
    linkText: "Try the Point Crawl Generator",
    href: "/generators/point-crawl",
  },
  systemsThatSupportThis: [
    {
      system: "The Ultraviolet Grasslands",
      rationale:
        "The core campaign structure is an explicit pointcrawl road of dozens of numbered destinations, with a caravan procedure that tracks fuel, supplies, and mounts between stops rather than simulating the terrain in between.",
      href: "https://wizardthieffighter.itch.io/uvg-2e",
    },
    {
      system: "Heart: The City Beneath",
      rationale:
        "Delves move between a set of fixed Landmarks while the routes connecting them shift, matching a point crawl's separation of stable nodes from variable travel paths, with Haunts inside each Landmark giving every stop a reason to visit.",
      href: "https://rowanrookanddecard.itch.io/heart-the-city-beneath-rpg-core-book",
    },
    {
      system: "Stars Without Number",
      rationale:
        "Spike drives can only drill into hexes containing a star, so travel is constrained to a network of star systems linked by drive-range 'spike lanes': the map is drawn as a grid, but play only ever moves node to node along fixed connections.",
      href: "https://sine-nomine-publishing.myshopify.com/products/stars-without-number-revised",
    },
  ],
  relatedTools: [
    {
      title: "Try the Point Crawl Generator",
      description:
        "Create a connected region with branching paths, hidden routes and a visual map you can export or save.",
      href: "/generators/point-crawl",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate regional travel objectives, lost ruins, and faction rumours to anchor your point crawl nodes.",
      href: "/tools/quest-hook-generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create regional patrols, bandit syndicates, and wilderness cults to control key travel routes.",
      href: "/generators/faction",
    },
    {
      title: "RPG NPC Generator",
      description:
        "Generate frontier guides, bridge toll-keepers, and wilderness hermits to populate travel paths.",
      href: "/tools/rpg-npc-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Sandbox RPG Campaigns",
      description:
        "Manage open-world campaigns with linked regional points of interest and reactive faction maps.",
      href: "/for/sandbox-campaigns",
    },
    {
      title: "West Marches Campaigns",
      description:
        "Organise wilderness exploration networks with persistent travel nodes, camp logs, and player agency.",
      href: "/for/west-marches",
    },
    {
      title: "Fantasy Worldbuilding",
      description:
        "Connect frontier settlement hubs, dangerous transit corridors, and ancient mystery sites.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "what-is-a-point-crawl",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "point-crawl-vs-hex-crawl",
    "what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
    "what-rpg-map-making-tool-should-i-use",
    "how-do-i-run-exploration-in-a-huge-ruined-city",
    "how-do-i-create-interesting-islands-and-ports-for-a-pirate-campaign",
    "how-do-i-make-sea-travel-interesting-in-a-ttrpg",
    "how-do-i-run-a-pirate-campaign-focused-on-exploration",
  ],
  discovery: {
    id: "answer-build-a-point-crawl",
    parentCluster: "adventure-mapping",
    primaryIntent: "how to build a point crawl for an rpg",
    intentAliases: [
      "how to design a point crawl",
      "point crawl creation guide",
      "building a point crawl map",
      "pointcrawl prep rpg",
      "how to make a point crawl",
    ],
    uniqueValue:
      "A five-step construction guide and copyable six-node example with route costs, alternate approaches, and consequences to track during play.",
    relatedIntents: [
      "answer-point-crawl",
      "answer-travel-interesting",
      "for-sandbox-campaigns",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-point-crawl",
        reason:
          "The definition page ('what is a point crawl') defines the structure, component anatomy, and when to choose point crawls over hex crawls; this how-to page teaches the step-by-step procedure for laying out nodes, establishing travel trade-offs, and engineering loops.",
      },
      {
        with: "answer-travel-interesting",
        reason:
          "Travel interesting teaches journey procedures (camp roles, road dilemmas, weather hazards); this page teaches how to map and lay out the static point crawl network.",
      },
    ],
  },
  seo: {
    title:
      "How to Build a Point Crawl for an RPG (Worked Example) | Codex Cryptica",
    description:
      "Build a playable RPG point crawl in five steps. Copy a six-location route map with travel times, hazards, alternate approaches and consequences.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-build-a-point-crawl-for-an-rpg.jpg",
    imageAlt:
      "Cartographer drafting table at night with inked route-node vellum map, calipers, and brass compass",
  },
};
