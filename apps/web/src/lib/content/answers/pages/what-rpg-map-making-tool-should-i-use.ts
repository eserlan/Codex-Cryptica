import type { AnswerConfigInput } from "../schema";

export const whatRpgMapMakingToolShouldIUse: AnswerConfigInput = {
  slug: "what-rpg-map-making-tool-should-i-use",
  category: "worldbuilding",
  publishedAt: "2026-09-28",
  question: "What RPG map-making tool should I use?",
  kind: "framework",
  shortAnswer:
    "Do not choose a map maker until you know what the map must communicate at the table. A world map needs fast geography and political layers, a town map needs streets and buildings you can edit, a battle map needs precise grids and walls, and a hexcrawl needs hex control and keyed locations. Name the job first, then pick the category of tool that serves it, and treat individual products as examples rather than ranked winners.",
  sections: [
    {
      kind: "prose",
      heading: "Start from the job, not the software",
      paragraphs: [
        "A combat encounter map, a political world map, a player-facing travel map and a hexcrawl are not different zoom levels of the same drawing. They answer different questions during play, and each question rewards a different kind of tool. When you browse map makers before naming the job, it is easy to buy a powerful illustration app for a problem that needed grid precision, or a precise dungeon builder for a problem that needed quick regional geography.",
        "Name the information the map must carry while the session is running. Does it need to show distance and travel time, control movement square by square, track who controls which hex, or look convincing as a handout the characters found in world? The answer tells you whether you need geography layers, street editing, wall and door logic, hex bookkeeping, or VTT export more than it tells you which brand to download.",
      ],
    },
    {
      kind: "table",
      heading: "Quick chooser: match the job to the tool category",
      headers: ["Need", "Prioritise", "Example tools"],
      rows: [
        [
          "World, continent, or large region",
          "Fast landmass, climate, labels, and political or terrain layers",
          "Inkarnate, Wonderdraft, Azgaar's Fantasy Map Generator",
        ],
        [
          "Town or settlement",
          "Street and building generation you can rearrange and annotate",
          "Watabou's Medieval Fantasy City Generator, Inkarnate city stamps, Wonderdraft with settlement assets",
        ],
        [
          "Dungeon or battle map",
          "Grid accuracy, walls, doors, props, and encounter readability",
          "Dungeondraft, Dungeon Alchemist, Dungeon Scrawl",
        ],
        [
          "Hexcrawl and exploration",
          "Hex control, terrain types, and keyed locations per hex",
          "Worldographer, Hex Kit, HexTML",
        ],
        [
          "VTT-ready tactical map",
          "Grid precision and the export your workflow needs: an image backdrop or structured wall, door, and light data for a ready-to-run VTT scene",
          "Dungeondraft, Dungeon Alchemist, tools with Universal VTT export",
        ],
        [
          "Player handout or illustrative map",
          "Visual finish, annotations, and presentation without tactical data",
          "Inkarnate, Wonderdraft, Photoshop or Affinity with cartography brushes",
        ],
      ],
    },
    {
      kind: "prose",
      paragraphs: [
        "Tool features, export formats, and pricing change over time. Use these examples to identify the right category, then confirm the current feature or licence you need on the tool's own site.",
      ],
    },
    {
      kind: "list",
      heading: "Six questions that narrow the field",
      intro:
        "Run through these in order before you compare products. The first answer that feels settled usually decides the category.",
      items: [
        {
          term: "What kind of map are you making?",
          text: "Name one of the rows above as your primary use. If you are making two kinds of map for the same region, treat them as two jobs and make two simpler files rather than forcing one tool to do both.",
        },
        {
          term: "What must it communicate during play?",
          text: "A travel map communicates distance, terrain cost, and visible landmarks. A battle map communicates line of sight, cover, and who stands where this round. Write the questions the map must answer when a player points at it and asks what they can see or do.",
        },
        {
          term: "How much control versus automation do you want?",
          text: "Procedural generators such as Azgaar or Watabou give you a complete geography or street plan in seconds that you then edit. Illustration-first tools such as Inkarnate or Wonderdraft give you brush-by-brush control but need more time. Pick the balance that matches the hours you will actually spend, not the result you wish you had.",
        },
        {
          term: "Do you only need a background image, or structured VTT scene data?",
          text: "For an image-only workflow, prioritise the right grid dimensions and resolution, a PNG, WebP, or JPG export, and easy alignment in your VTT. For scene data, check for UVTT/DD2VTT or a VTT-specific export that your target VTT can import, with the wall, door, lighting, or line-of-sight metadata your scene needs. Dungeondraft and Worldographer 2025 support UVTT export; Dungeon Alchemist documents VTT exports with wall, light, and door data; Dungeon Scrawl currently offers UVTT export to Pro subscribers. An image is a backdrop; it does not carry that scene data by itself.",
        },
        {
          term: "Is it GM-facing, player-facing, or both?",
          text: "Decide whether you need a campaign reference map for operational truth, a player navigation map for information the characters could reasonably know, or an in-world map that may be incomplete, outdated, biased, or wrong. Keep secret routes and encounter keys on the reference map; show known roads, places from briefings or local knowledge, and rumours marked as uncertain when that matters. Plan whether you need separate versions or a handout with its own point of view.",
        },
        {
          term: "Which platform, licence, and workflow fit your needs?",
          text: "Browser tools often make it easy to start quickly, while desktop apps can offer offline use and deeper file or export control. Both categories may have free, paid, subscription, or Pro tiers; for example, Worldographer 2025 has a robust free version with optional Pro features. Check the current licence and export limits before committing.",
        },
      ],
    },
    {
      kind: "prose",
      heading:
        "Three map modes: campaign reference, player navigation, and in-world",
      paragraphs: [
        "A campaign reference map records what the campaign treats as operationally true: routes, keyed locations, hidden entrances, faction territory, and tactical information. A player navigation map shows what the characters can reasonably use to make decisions. That can include geography learned through upbringing, purchased maps, briefings, local knowledge, libraries, or guides, as well as places they have visited. An in-world map is an artefact that exists in the fiction; it may be incomplete, outdated, biased, stylised, based on rumour, or deliberately wrong.",
        "Keep those jobs distinct when uncertainty matters. Put whatever the characters could reasonably know on the player-facing map, and visually distinguish uncertain or disputed information when that uncertainty matters in play. A handout can be valuable precisely because it is not an omniscient truth layer. Layers or separate annotations can help you produce different views, but a single shared image is not always the right answer.",
      ],
    },
    {
      kind: "prose",
      paragraphs: [
        "Do not make the map more precise than the decisions it needs to support. Narrative travel may need only named routes and travel times; a hexcrawl needs explicit hex positions and keys; tactical combat needs spatial precision; a political map may need borders and control rather than accurate roads; and a treasure map may need recognisable landmarks rather than scale.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: picking too early versus naming the job first",
      paragraphs: [
        "A GM prepares a three-session wilderness arc between two towns. The party will travel cross-country, choose between a fast road with tolls and a slow forest path with better cover, and explore a ruined keep at the far end.",
      ],
      items: [
        {
          term: "The weak approach",
          text: "The GM opens a city illustration tool, paints a beautiful regional map with shaded mountains and script labels, and prints it as the player handout. At the table there is no way to measure travel time, compare route costs, or key encounters to specific ground. The keep is a painted building with no grid, so the final fight needs a separate battle map drawn from scratch the night before the session.",
        },
        {
          term: "The stronger approach",
          text: "The GM names two jobs: a regional travel map and a tactical keep map. For the travel job they use a hex or point-crawl tool that records terrain per hex, travel time, and keyed locations for each route. For the keep they use a dungeon tool that builds walls, doors, and grid-aligned rooms with VTT export. The regional handout is a clean export from the hex tool with only roads and landmarks the party knows, while the full keyed version stays GM-facing.",
        },
        {
          term: "Why it works",
          text: "The pair of maps each carries information the other does not need to. Players can weigh a two-day forest path against a one-day road with a toll, and the GM can run the keep fight with proper cover and movement without redrawing geography under time pressure.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When not to make a detailed map",
      paragraphs: [
        "A finished map earns its keep only when it answers recurring questions at the table. For a single overland journey where the party follows a known road, a short list of travel times and a few roadside encounters does more than a fully painted continent. For a negotiation, chase, or social scene, a simple sketch of positions or a point-crawl with three to five nodes gives clearer choices than a street-accurate town plan.",
        "Skip the detailed build when the location will not return, when you can describe the space faster than you can draw it, or when fog of war and player mapping are part of the point. A blank area with a scale bar, two named roads, and a note that says what the party has not yet seen often helps exploration more than a dense map that fills every hex before play begins.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before you pick a tool",
      intro: "Answer these on paper first, then open the app store.",
      items: [
        "Write one sentence for the map's job: what must a player or the GM be able to do with it during the session?",
        "Circle the row in the chooser table that matches that job and note what you need to prioritise.",
        "Decide whether your VTT workflow needs only a background image or structured scene data, and confirm the import format your table uses.",
        "Decide whether you need a campaign reference map, a player navigation map, an in-world map, or more than one of these modes.",
        "Set a time budget and check the current licence and export limits before committing to a tool.",
        "If no row in the table clearly matches, start with a quick sketch or point-crawl and draw the finished map only after the first session shows what information mattered.",
      ],
    },
  ],
  codexConnection: {
    heading: "Connect the map to the rest of the campaign",
    paragraphs: [
      "A map becomes more useful when the places on it are not just shapes. Codex Cryptica lets you keep map images with the location entities they describe and connect those locations to related settlements, factions, people, and events in the campaign graph.",
      "Use generators to draft the settlement at the road's end, the faction collecting its toll, or an encounter for the forest path. Keep those entities connected in the campaign graph, and use your map-making tool to prepare any player handout or VTT export the session needs.",
    ],
    linkText: "Try the settlement generator",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Build the towns and villages that give a regional or city map places worth visiting.",
      href: "/generators/settlement",
    },
    {
      title: "World generator",
      description:
        "Draft continents, regions, and travel-scale geography to use as the base layer for a world map.",
      href: "/generators/world",
    },
    {
      title: "Dungeon generator",
      description:
        "Create room layouts and encounter-ready complexes when the job calls for a tactical battle map.",
      href: "/generators/dungeon-generator",
    },
    {
      title: "Faction generator",
      description:
        "Give the territories and tolls on your map an owner with a goal the party can support or oppose.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Keep settlements, regions, factions, and maps connected as a living campaign world.",
      href: "/for/fantasy-worldbuilding",
    },
    {
      title: "West Marches Campaigns",
      description:
        "Organise player-led exploration, shared maps, and expedition records across an open region.",
      href: "/for/west-marches",
    },
  ],
  relatedAnswers: [
    "how-do-you-build-a-point-crawl-for-an-rpg",
    "point-crawl-vs-hex-crawl",
    "what-is-a-point-crawl",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-do-you-create-a-fantasy-city-that-feels-alive",
    "what-should-an-rpg-settlement-contain",
    "how-do-you-manage-a-campaign-timeline-in-an-rpg",
    "how-do-i-run-exploration-in-a-huge-ruined-city",
  ],
  discovery: {
    id: "answer-rpg-map-making-tool-chooser",
    parentCluster: "adventure-mapping",
    clusters: ["adventure-mapping"],
    primaryIntent: "what rpg map making tool should i use",
    intentAliases: [
      "best map maker for tabletop rpgs",
      "what map tool should i use for dnd",
      "rpg world map maker",
      "rpg dungeon map maker",
      "rpg hex map tool",
      "map maker for foundry roll20",
      "rpg battle map maker",
      "rpg town map maker",
    ],
    uniqueValue:
      "A task-based chooser that matches map purpose to tool category and representative examples, covering grid, VTT export, control versus automation, and GM versus player-facing needs, with guidance on when not to map.",
    userJob: "evaluate",
    relatedIntents: [
      "answer-build-a-point-crawl",
      "answer-point-crawl-vs-hex-crawl",
      "answer-point-crawl",
      "answer-sandbox-campaign-prep",
      "answer-travel-interesting",
      "generator-world",
      "generator-settlement",
      "generator-dungeon-generator",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-point-crawl-vs-hex-crawl",
        reason:
          "That comparison helps GMs choose between two exploration structures for travel. This chooser covers the broader decision of which map-making tool category fits each job, including world, town, dungeon, hexcrawl, and VTT maps.",
      },
      {
        with: "answer-build-a-point-crawl",
        reason:
          "The point-crawl build guide shows how to construct one regional structure. This tool chooser helps decide whether a hex tool, point-crawl tool, dungeon builder, or illustration app is the right category before any construction begins.",
      },
    ],
  },
  seo: {
    title: "What RPG Map-Making Tool Should I Use? | Codex Cryptica",
    description:
      "Choose an RPG map maker by what the map must do: world, town, dungeon, hexcrawl, or VTT battle map. Compare categories, example tools, and key criteria.",
    image: "https://assets.codexcryptica.com/og/point-crawl-vs-hex-crawl.jpg",
    imageAlt:
      "Point-crawl and hex-crawl maps on a cartographer's table, with linked landmarks beside a hex grid",
  },
};
