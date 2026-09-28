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
          "Grid precision, lighting, line of sight, and UVTT or image export",
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
          term: "Do you need grid, walls, and lighting data?",
          text: "If the map will run on a virtual tabletop, you need square or hex grid alignment, wall and door definitions, and an export your VTT can read such as UVTT, WebP, or Foundry-ready JSON. A beautiful image that cannot carry wall data becomes an extra prep step rather than a finished battle map.",
        },
        {
          term: "Is it GM-facing, player-facing, or both?",
          text: "A GM map can carry secret routes, faction territory, trap locations, and encounter keys. A player map should carry only what the characters have learned: roads they have travelled, settlements they have visited, and rumours they have confirmed. Plan whether you need two versions from the same source or one shared view.",
        },
        {
          term: "Free and browser-based or paid desktop app?",
          text: "Browser tools such as Azgaar, Dungeon Scrawl, and Watabou are free and fast for drafts. Desktop apps such as Wonderdraft, Dungeondraft, and Worldographer cost money but work offline, handle larger files, and often give finer export control. Try the free option for the category first, then pay only when it blocks a real need.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "GM-facing and player-facing are different maps",
      paragraphs: [
        "Even when both versions cover the same area, they serve different purposes. The GM copy records truth: accurate distances, hidden ruins, monster lairs, faction control, and the key for each hex or room. The player copy records knowledge: what the party has mapped, what a hired guide claimed, and what remains blank. Keeping those layers separate avoids handing over information the characters have not earned and avoids a cluttered table where secrets compete with useful navigation.",
        "If your tool supports layers or you can export a base map and add annotations elsewhere, you can maintain one geography file and produce two views. Hide or remove the GM layer on export, leave deliberate gaps for unknown country, and add only the labels the party would recognise. A travel map that players mistrust because it looks too complete will slow their decisions less than one they can rely on.",
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
        "Decide whether you need grid, walls, or lighting data for a VTT, and which export format your table uses.",
        "Decide whether you need a GM truth version, a player knowledge version, or both, and whether your tool can produce two views from one file.",
        "Set a time budget: try the free browser option for that category for thirty minutes before buying a desktop app.",
        "If no row in the table clearly matches, start with a quick sketch or point-crawl and draw the finished map only after the first session shows what information mattered.",
      ],
    },
  ],
  codexConnection: {
    heading: "Connect the map to the rest of the campaign",
    paragraphs: [
      "A map becomes more useful when the places on it are not just shapes. Link each settlement, ruin, or hex to the people, factions, and events that live there, so a change on the map updates the world behind it. Codex Cryptica keeps those connections in a campaign graph rather than a single image file, which lets a regional map, a town plan, and a dungeon sit as separate views of the same world.",
      "Use generators to fill the locations your map now needs: a settlement for each town along the road, a faction for whoever controls the toll, an encounter for the forest path. Draft them once, attach them to the map's keyed locations, and export only the player-safe view when the party sets out.",
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
  ],
  labels: ["fantasy"],
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
      "answer-prepare-sandbox-campaign",
      "answer-travel-interesting",
      "generator-world",
      "generator-settlement",
      "generator-dungeon",
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
    image: "https://assets.codexcryptica.com/og/what-rpg-map-making-tool-should-i-use.jpg",
    imageAlt:
      "Tabletop with layered RPG maps showing world geography, a town plan, and a gridded dungeon map side by side",
  },
};
