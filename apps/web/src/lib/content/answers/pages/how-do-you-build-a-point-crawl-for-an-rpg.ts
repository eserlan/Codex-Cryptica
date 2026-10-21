import type { AnswerConfigInput } from "../schema";

export const howDoYouBuildAPointCrawlForAnRpg: AnswerConfigInput = {
  slug: "how-do-you-build-a-point-crawl-for-an-rpg",
  category: "worldbuilding",
  publishedAt: "2026-09-04",
  question: "How do you build a point crawl for an RPG?",
  kind: "how-to",
  shortAnswer:
    "To build a point crawl, pick six or so places worth visiting, connect them with named routes, and give each route a travel time, cost, and complication. Add at least one detour or hidden shortcut so players can change plans, and let them learn enough about the routes to make informed choices. Prep what happens at each location, not every mile of terrain.",
  sections: [
    {
      kind: "prose",
      heading: "Start with routes, not map scale",
      paragraphs: [
        "A point crawl is useful when the interesting question is which route the party takes between places they know or have heard about. You prepare destinations and the roads, tracks, tunnels or passages connecting them. Players still make consequential choices about time, supplies, danger and who they might meet.",
        "A hex crawl does something different: it makes direction, distance, navigation and discovering unknown terrain part of play. If exploring the unmapped landscape is your aim, keep the hexes. For a compact region where people know a handful of paths, a point crawl often needs less mapping prep. The steps below turn one into a ready-to-run network.",
      ],
    },
    {
      kind: "list",
      heading: "Five steps to build one",
      intro: "A regional point crawl in about an hour:",
      items: [
        {
          term: "Step 1: Place landmark nodes",
          text: "Pick roughly six destinations for a first draft. Give each one a reason to visit, something the players can interact with, and one change that could happen while they are away. Start with a home base and a goal, then add the places between them.",
        },
        {
          term: "Step 2: Differentiate connecting paths",
          text: "For each connection, note travel time, resource or equipment cost, and a distinctive complication. Routes need not all be dangerous, but two ways to the same goal should offer a meaningful trade-off.",
        },
        {
          term: "Step 3: Build in loops and branch points",
          text: "Give the network a branch and at least one loop or alternative connection so players can reroute when conditions change. A dead-end ruin can be a perfectly good destination; the important part is that not every journey is a forced straight line.",
        },
        {
          term: "Step 4: Seed transitional road discoveries",
          text: "Give two or three routes a discovery en route: an overturned wagon, a border marker, a shrine or a washed-out bridge. Keep these as events on a route unless they offer enough decisions to become destinations in their own right.",
        },
        {
          term: "Step 5: Telegraph route conditions in advance",
          text: "Give the party information before they choose: a guide knows the toll, a scout spots storm clouds above the pass, or a map marks the marsh as impassable after rain. Keep at least one rumour uncertain so exploration still matters.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Six nodes for an evening's expedition",
      intro: "The party starts in Oakhaven and wants to reach the Sunken Crypt before a rival crew. These are the six destinations you need to prep:",
      items: [
        { term: "Oakhaven", text: "A town and starting hub. A ferryman knows about a forgotten path through the reeds." },
        { term: "Old Mill", text: "An abandoned waypoint on the main road. A missing courier's bag lies under the wheel." },
        { term: "Troll Bridge", text: "A guarded river crossing. The keeper demands 15 gp, a favour, or a way past the watch." },
        { term: "Whispering Mire", text: "A wetland crossing. Raised stones keep travellers dry if they can find them." },
        { term: "Windy Notch", text: "A high pass. A shepherd offers a shortcut in exchange for help finding a lost goat." },
        { term: "Sunken Crypt", text: "The goal. The rival expedition arrives on day three unless delayed." },
      ],
    },
    {
      kind: "table",
      heading: "Copyable route map: the connections",
      headers: ["Connection", "Travel time", "Cost, hazard or discovery"],
      rows: [
        ["Oakhaven → Old Mill", "Half a day", "Open road; tracks reveal the rival party passed yesterday."],
        ["Old Mill → Troll Bridge", "Half a day", "A damaged cart blocks the road; clearing it earns local goodwill."],
        ["Troll Bridge → Sunken Crypt", "Half a day", "15 gp toll at the bridge, or negotiate another price."],
        ["Oakhaven → Whispering Mire", "One day", "Slow mud; bring dry supplies or lose a ration."],
        ["Whispering Mire → Sunken Crypt", "Two days", "Flooded path and possible fatigue; avoids the toll."],
        ["Oakhaven → Windy Notch", "One day", "A steep ascent; climbing gear or a shepherd's help is useful."],
        ["Windy Notch → Sunken Crypt", "One day", "Exposed ridge, with poor shelter if the weather turns."],
        ["Old Mill ↔ Whispering Mire (hidden)", "One day", "A reed-cutters' track; the ferryman reveals it after earning trust."],
      ],
    },
    {
      kind: "example",
      heading: "Run the route choices at the table",
      paragraphs: [
        "Draw each named location as a circle and connect only the pairs in the route table. The final row is a secret connection: mark it on your GM map, not the initial player handout. You now have six nodes, three approaches to the crypt, and a loop between the road and the mire.",
      ],
      items: [
        {
          term: "The road (1½ days)",
          text: "Oakhaven → Old Mill → Troll Bridge → Sunken Crypt. The fastest route, but the bridge keeper costs the party coin, a favour or time.",
        },
        {
          term: "The mire (3 days)",
          text: "Oakhaven → Whispering Mire → Sunken Crypt. The party avoids the toll but risks wet provisions and a longer journey. The rivals may arrive first.",
        },
        {
          term: "The high pass (2 days)",
          text: "Oakhaven → Windy Notch → Sunken Crypt. The route avoids the toll, but exposed terrain and the shepherd's request create different problems.",
        },
        {
          term: "A discovered detour",
          text: "If the road closes, someone who befriended the ferryman can travel from Old Mill through the hidden reed-cutters' track to the mire. That shortcut turns an earlier social choice into a new route.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Point crawl checklist",
      intro:
        "Before you put the regional map in front of your players, check it against these:",
      items: [
        "Every node has a reason to visit and something that can happen there.",
        "The routes include at least one branch and a useful detour or alternate path.",
        "Each route has a travel time and a concrete cost, risk or discovery.",
        "At least one optional path can be found, opened or earned in play.",
        "Players can learn enough about route conditions to choose intelligently.",
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
  ],
  relatedTools: [
    {
      title: "Point Crawl Generator",
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
      "A five-step construction procedure and a copyable six-node route map with times, costs, three approaches and an earned shortcut.",
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
    title: "How to Build a Point Crawl for an RPG (Worked Example) | Codex Cryptica",
    description:
      "Build a playable RPG point crawl in five steps. Copy a six-location route map with travel times, hazards, three approaches and a hidden shortcut.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-build-a-point-crawl-for-an-rpg.jpg",
    imageAlt:
      "Cartographer drafting table at night with inked route-node vellum map, calipers, and brass compass",
  },
};
