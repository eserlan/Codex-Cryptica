import type { AnswerConfigInput } from "../schema";

export const howDoYouBuildAPointCrawlForAnRpg: AnswerConfigInput = {
  slug: "how-do-you-build-a-point-crawl-for-an-rpg",
  category: "worldbuilding",
  question: "How do you build a point crawl for an RPG?",
  kind: "how-to",
  shortAnswer:
    "To build a point crawl for an RPG, construct a network of six to ten landmark nodes connected by differentiated travel paths. Define each node as an actionable destination with a clear hazard, resource, or encounter. Then connect the nodes with routes that present meaningful trade-offs in travel duration, terrain difficulty, and risk, ensuring there are loops and alternative paths rather than a single linear highway.",
  sections: [
    {
      kind: "prose",
      heading: "The cartographer's trap: why terrain hexes stall travel prep",
      paragraphs: [
        "Traditional wilderness exploration prep often bogs down in cartographic busywork. Game Masters spend dozens of hours drawing uniform hexagonal grids across wilderness maps, filling thirty adjacent hexes with identical pine trees, and drafting separate random encounter tables for light forest versus dense forest. At the table, this produces slow, procedural grid-crawling where players roll survival checks, ask if the next hex looks different from the last, and spend three hours wandering through empty space with zero meaningful tactical decisions.",
        "A point crawl replaces the uniform grid with a network graph. Instead of simulating every square kilometre of unremarkable dirt, you identify the six to ten landmark locations players actually care about — ruined watchtowers, sunken bridges, monster lairs, and hermit shrines — and connect them with defined paths. Wilderness travel shifts from an exercise in navigation bookkeeping to a series of high-stakes route choices: do the players take the fast river trail where goblin toll-collectors lurk, or the slow mountain pass that requires three extra days of rations?",
      ],
    },
    {
      kind: "list",
      heading: "The five-step point crawl construction procedure",
      intro:
        "Follow these five structural steps to design an engaging regional point crawl in under an hour:",
      items: [
        {
          term: "Step 1: Place landmark nodes",
          text: "Select six to ten distinct destinations across your region. Ensure each node has a strong sensory identity, a reason to visit (a treasure, an allied NPC, a defensive redoubt, or an alchemical ingredient), and an immediate obstacle or inhabitant.",
        },
        {
          term: "Step 2: Differentiate connecting paths",
          text: "Never draw two routes with identical properties. For every path between nodes, establish three variables: travel time (e.g. half a day vs two days), resource costs (rations, torchlight, or climbing gear), and the distinctive hazard native to that trail.",
        },
        {
          term: "Step 3: Engineer loops and branch points",
          text: "Ensure every major node connects to at least two other nodes, forming loops and circuits. If your map is a straight tree with dead ends, players have no real choice but to push forward or retreat. Loops allow the party to detour around known monster territories or plan circular patrol routes.",
        },
        {
          term: "Step 4: Seed transitional road discoveries",
          text: "Place intermediate discoveries along the trails between nodes: a washed-out stone bridge, an overturned merchant wagon, a mysterious roadside shrine, or an ancient territorial boundary stone. These reward observant scouts without requiring a full dungeon crawl.",
        },
        {
          term: "Step 5: Telegraph route conditions in advance",
          text: "Players cannot make informed decisions if all paths look identical on paper. Provide scouts, barkeeps, or local guides in the hub who warn travellers about route conditions: 'The ridge trail is fast but exposed to wyverns; the low fen is quiet, but the mud will exhaust your pack mules.'",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked Example Scenario: Before and After",
      paragraphs: [
        "Contrast how wilderness travel operates when preparing an expedition to the Sunken Crypt of Morzan:",
      ],
      items: [
        {
          term: "The generic hex-crawl approach",
          text: "The GM maps a 40-hex wilderness expanse. The party enters Hex 0408, rolls a navigation check, succeeds, moves into Hex 0409, rolls for a wandering monster (no encounter), and sets up camp. After ninety minutes of rolling d20s against random weather tables, the players arrive at the crypt exhausted by administrative dice-rolling rather than tense decision-making.",
        },
        {
          term: "The structured point crawl approach",
          text: "The GM connects Oakhaven Hub to the Crypt via three branching vectors: Path A runs 1 day along the Old Imperial Road through the Troll Bridge (fast travel, but requires paying a heavy 15-gp toll or risking open combat). Path B circles through the Whispering Mire for 3 days (slow and damp, requiring extra rations and risking marsh fever, but completely avoiding the troll). Path C climbs the Windy Notch for 2 days (requires mountaineering kits and cold-weather cloaks, but bypasses both tolls and diseases).",
        },
        {
          term: "Why it works",
          text: "The wilderness journey becomes a genuine tactical dilemma tailored to the party's current strengths, inventory, and timeline. The choice of route reveals what the party values most: coin, time, or physical safety.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Point Crawl Construction Checklist",
      intro:
        "Before presenting your regional travel map to your players, verify that your network satisfies these core design principles:",
      items: [
        "Placed six to ten memorable landmark nodes with distinct environmental landmarks and interactable entities.",
        "Ensured every major destination connects to at least two distinct paths to enable circular detours and player agency.",
        "Assigned explicit travel duration in hours or days, ration consumption, and specific hazards to each connecting route.",
        "Seeded transitional discoveries or minor obstacles along paths to break up linear transit.",
        "Telegraphed route hazards through local NPCs or visible landmarks so players make informed tactical choices.",
      ],
    },
  ],
  codexConnection: {
    heading: "Mapping point crawls as interactive spatial graphs",
    paragraphs: [
      "Point crawls are natural network graphs, making them ideal for visual campaign mapping. In Codex Cryptica, you can lay out wilderness nodes on the spatial canvas as rich entity cards, connect them with directed relationship lines tagged with travel times and hazard ratings, and pin regional encounter tables directly to routes. As factions claim territories or paths wash out during seasonal storms, your campaign map stays reactive and up to date.",
    ],
    linkText: "See the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
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
      "A five-step point crawl construction procedure detailing node placement, route trade-offs, loop engineering, and telegraphing hazards to replace empty hex travel.",
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
    title: "How do you build a point crawl for an RPG? | Codex Cryptica",
    description:
      "Build exciting wilderness point crawls in 5 practical steps: landmark nodes, route differentiation, travel loops, and telegraphed hazards without empty hexes.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-build-a-point-crawl-for-an-rpg.jpg",
    imageAlt:
      "Cartographer drafting table at night with inked route-node vellum map, calipers, and brass compass",
  },
};
