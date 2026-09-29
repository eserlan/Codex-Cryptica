import type { AnswerConfigInput } from "../schema";

export const howDoIRunExplorationInAHugeRuinedCity: AnswerConfigInput = {
  slug: "how-do-i-run-exploration-in-a-huge-ruined-city",
  category: "adventure-design",
  publishedAt: "2026-09-29",
  question: "How do I run exploration in a huge ruined city?",
  kind: "framework",
  shortAnswer:
    "Run a huge ruined city as a layered pointcrawl, not as one giant dungeon map. Divide it into a handful of districts with distinct identities, link them with a small network of known routes, and put visible landmarks on the horizon so players can choose goals without seeing everything. Let new districts, shortcuts and nested sites appear through play as players gather rumours, maps and vantage points, use fictional gates such as floods, collapsed bridges or hostile territory rather than arbitrary locks, and reward progress with faster, safer movement and deeper understanding instead of simply revealing more map tiles.",
  sections: [
    {
      kind: "prose",
      heading: "Why a street-by-street map stalls the table",
      paragraphs: [
        "The temptation with a ruined capital, abandoned megacity or fallen port is to draw every street and treat the whole place as one enormous dungeon with fog of war. That approach creates two problems at once. If you reveal the full map, the city loses its sense of scale and mystery in a single session. If you hide it behind corridor-by-corridor exploration, a location meant to sustain ten or twenty sessions turns into slow, low-choice grid crawling where every junction costs the same amount of attention.",
        "A city that size is not really one location. It is a region that happens to have roofs and walls. Wilderness exploration already solved this using pointcrawls and hexcrawls, and urban ruins benefit from the same shift: important places and the routes between them matter more than mapping every block. Give players meaningful choices about where to go, what to risk to get there, and what they learn once they arrive, rather than asking them to account for every turning.",
      ],
    },
    {
      kind: "list",
      heading: "Treat the city as a layered pointcrawl",
      intro:
        "Prepare five to eight districts, not fifty streets. Each district is a node with the same depth you would give to a village or small valley:",
      items: [
        {
          term: "Districts as nodes with identity",
          text: "Name each district by what it once was and what now defines it: the Flooded Dockyards, the Glassmakers' Quarter, the Cathedral Precinct. For each, note its current character, its dominant danger or inhabitant, one landmark visible from elsewhere, and one active discovery such as a vault, archive, shrine or survivor enclave that makes a visit worthwhile.",
        },
        {
          term: "Pointcrawl routes, not street grids",
          text: "Link districts with a small set of named routes: a half-collapsed boulevard, a canal, a rooftop run, a service tunnel, or a cleared patrol road. Give every route a travel time, a hazard, and a cost such as noise, exposure, supplies or toll. Keep the network looped so players can choose between fast but exposed, slow but quiet, or costly but safe.",
        },
        {
          term: "Visible landmarks that set goals",
          text: "Put two or three large features above the skyline in every district: a leaning tower, a blackened dome, a plume of smoke, a bridge span, strange lights at night. Players can point at them and say they want to go there, which gives direction without requiring you to show what is on the intervening streets.",
        },
        {
          term: "Discovery through play, not free reveals",
          text: "New nodes and connections should come from action. Rumours from survivors, a found watch log or estate map, interrogating a prisoner, scouting from a high vantage, or doing a favour for a faction contact each reveal one or two new destinations or safer ways through. Keep a short list of unearned leads and a longer list that only appears when players earn them.",
        },
        {
          term: "Routes as the best reward",
          text: "The most satisfying treasure in a huge city is often not coin but mobility. A cleared alley that avoids the main patrol, a rowboat that crosses the flooded ward, a secured stair through a collapsed arcade, or a repaired cableway changes every future journey. Track which routes the party has found, secured, shared or lost.",
        },
        {
          term: "Nested adventure sites inside districts",
          text: "Inside a district, zoom in only when players commit to a specific ruin: a single tower, vault, sewer nexus, temple or stronghold. Run that building as a conventional dungeon or compact pointcrawl of rooms and chambers. When they leave that building, return to the district and route scale. The city frames the dungeon; it does not replace it.",
        },
        {
          term: "Factions and territory that move",
          text: "Assign each district a current holder or pressure: a militia remnant, scavenger guild, cult, occupying company, nesting creature, or simply hazard and emptiness. Note what that holder wants, what it patrols, and what happens if the party helps, robs or displaces it. When control changes, the same streets feel different on a return visit without new cartography.",
        },
        {
          term: "Environmental pressure on travel",
          text: "Let choices during movement matter. Darkness that demands light, unstable floors, hostile patrols, cursed wind, rain that floods low streets, dwindling clean water or daylight hours that force a camp all turn travel time into a budget. Keep pressure visible so players can prepare or accept risk rather than being punished after the fact.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Soft gates that feel like history, not video game locks",
      paragraphs: [
        "Large locations often need areas that are not available immediately, but arbitrary locked doors at street level break belief. Replace them with fictional gates that follow from what happened to the city and that players can understand before they try to force them. A gate is simply a reason the party cannot yet travel or survive somewhere, paired with at least two plausible answers that exist somewhere in the city.",
        "Good gates create planning rather than refusal. Players hear about the flooded lower wards long before they stand at the waterline, and they hear that old lockkeepers spoke of sluice wheels, that the river guild guards its boats, and that the high causeway might still hold if they clear the nesting rooks. The gate is then a project to pursue when the table chooses, not a wall the rules require.",
      ],
    },
    {
      kind: "table",
      heading: "Fictional gates and how they open through play",
      headers: [
        "Gate (fiction first)",
        "What players learn to look for",
        "How mobility changes when it opens",
      ],
      rows: [
        [
          "Flooded district or canal ward",
          "Sluice controls, a hull, high-water timber routes, or a ritual to lower water",
          "Boats or dry streets connect two previously separate quarters",
        ],
        [
          "Collapsed bridge or shattered viaduct",
          "Rope teams, scaffolding, a faction that controls the span, or a tunnel below",
          "A direct arterial route replaces a long, exposed detour",
        ],
        [
          "Poisoned or cursed quarter",
          "Filters, sealed helms, protective rites, or knowledge of safe hours and winds",
          "Daylight entry becomes possible; night travel stays costly",
        ],
        [
          "Faction checkpoint or occupied plaza",
          "Credentials, a bribe, a prisoners exchange, or a back way over roofs",
          "Negotiated passage or a secret bypass that avoids future tolls",
        ],
        [
          "Lost route only locals remember",
          "A street plan in an archive, a guide, or a high vantage that reveals it",
          "A quiet secondary connection appears on the party's map",
        ],
        [
          "Unstable elevated way or cableway",
          "Tools, anchors, clear sightlines, or clearing the hazard that broke it",
          "Fast travel between high districts once secured and held",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Unlocking understanding, not just tiles",
      paragraphs: [
        "The Metroidvania comparison helps here provided the unlock is framed as growing competence and local knowledge rather than collecting coloured keys. When the party opens a gate, the reward should give them better choices everywhere: a new safe path, a vantage that reveals two fresh landmarks, introductions to a faction that trades maps for favours, or control of a district that becomes a forward base with supplies and rest.",
        "Plan this as a slow widening. At the start, players know one entry district well, can see three or four landmarks in the haze, and have heard rumours of two more quarters. Each session, let them convert one rumour into a located site and one hard journey into a known route. After a few sessions they are not seeing a larger map so much as moving through the same city faster, quieter and with more options about who to deal with or avoid. Revisiting an early district should often produce new play because the holder, patrol, or hazard has shifted since they were last there.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: from street grid to layered city",
      paragraphs: [
        "The GM wants the ruined river capital of Tallowmere to support eight sessions. She first sketches the entire street plan and marks fifty numbered buildings. In the first session, players spend ninety minutes choosing left or right at similar intersections, fight two patrols that feel interchangeable, and struggle to say what makes one block different from the next. They leave with no clear goals beyond the next junction.",
      ],
      items: [
        {
          term: "The weaker default",
          text: "Every street is mapped and explored at the same scale. Landmarks are background description, routes have no named differences, and new buildings appear only when the party happens to walk into them. The city feels both exhausting and oddly empty because discovery is random.",
        },
        {
          term: "The layered approach",
          text: "The GM instead prepares five districts: Gate Ward, Flooded Dockyards, Cathedral Precinct, Glassmakers' Quarter, and the Silted Citadel. She links them with four named routes such as the High Causeway and the low canal cut. From the Gate Ward the table can already see the cathedral dome, smoke over the dockyards, and the citadel's leaning crane. A survivor at the gate offers a trade: she will mark a timber route through the flood if the party brings back her crew's ledger from the Dockyards.",
        },
        {
          term: "Discovery in play",
          text: "The party chooses the cathedral first because its bells still ring at dusk. On the roof they spot two new details: a cableway scar leading toward the Glassmakers' Quarter and fresh scaffolding at the collapsed bridge. A found sacristy map marks a vault beneath the precinct. Each piece adds one node or one connection to the shared map. The flood itself remains a gate until they secure either boats or a way to work the sluices.",
        },
        {
          term: "Routes and territory change return visits",
          text: "Three sessions later the party has cleared a stair through the arcade and befriended the dock crews. That stair turns a two-hour exposed walk along the boulevard into a thirty-minute quiet passage, and the crew now ferries them across the outer flood for a small share of finds. When the party revisits the Gate Ward, the militia that once demanded tolls has been pushed back by the crews, so the market has reopened and a new rumour about the citadel's vault is on offer.",
        },
        {
          term: "Why it works",
          text: "Players always have two or three visible destinations they chose, not fifty intersections they stumbled into. Travel is a decision about time, danger and cost rather than bookkeeping. Each session adds one or two places and one better way to move, and old places stay active because factions and patrols react to what the party did. The city feels larger as understanding grows, even though the map has only a handful of circles and lines.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Prepare a city you can run next session",
      intro: "Use this pass before you place the city on the table:",
      items: [
        "Draw five to eight districts as named nodes, each with a skyline landmark visible from at least one other district.",
        "Connect them with a looped route network where every connection lists travel time, hazard and cost, with at least one quiet, one fast and one safe option.",
        "Put two landmarks on the horizon for every starting district so players can choose a direction without a full reveal.",
        "Seed six to ten discoverable leads and assign each to a source such as a survivor, map, vantage, archive or faction favour, with no more than two visible at the start.",
        "Place one fictional gate that blocks a whole district using a plausible city reason, and note two different ways to open it that exist elsewhere in the city.",
        "Add one nested site per district you expect to visit first, prepared as a small dungeon or compact location you can zoom into when players commit.",
        "Assign a holder, patrol pattern or environmental pressure to each district and note what changes if the party displaces, bargains with or ignores them.",
        "Record which routes are currently safe, risky or unknown so the next journey is a choice the table can weigh before rolling.",
      ],
    },
  ],
  codexConnection: {
    heading: "Hold a city together without one giant document",
    paragraphs: [
      "A huge ruined city becomes manageable when districts, routes, nested ruins, people and factions are separate notes with links between them. Record each district once, link its landmark, holder and nearby routes, and keep each vault or tower as its own location tied to that district. When players clear a stair, befriend a crew or open a floodgate, those links show which journeys get faster and which districts now react differently.",
      "Codex Cryptica can keep those pieces connected in a campaign graph, so a growing pointcrawl, faction territory and scouting leads stay consistent across sessions without relying on memory or a single sprawling city map.",
    ],
    linkText: "Try the settlement generator",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement Generator",
      description:
        "Seed distinct districts, quarters and ruined wards with history, tensions and landmarks.",
      href: "/generators/settlement",
    },
    {
      title: "Dungeon Generator",
      description:
        "Build the nested vaults, towers, sewers and temples you zoom into when players commit to a building.",
      href: "/generators/dungeon-generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create the crews, guilds and occupying companies that control districts and shift territory.",
      href: "/generators/faction",
    },
    {
      title: "Quest Generator",
      description:
        "Draft the rumours, maps and vantage clues that reveal new nodes and safer routes through play.",
      href: "/generators/quest",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Fantasy Worldbuilding",
      description:
        "Link districts, ruins, factions and timelines so a vast city stays consistent across sessions.",
      href: "/for/fantasy-worldbuilding",
    },
    {
      title: "Codex Cryptica for Sandbox Campaigns",
      description:
        "Track player-chosen routes, discoveries and territorial changes in a city that reacts over time.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "how-do-you-build-a-point-crawl-for-an-rpg",
    "what-is-a-point-crawl",
    "point-crawl-vs-hex-crawl",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-do-you-create-a-fantasy-city-that-feels-alive",
    "what-should-an-rpg-settlement-contain",
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-you-run-an-rpg-campaign-in-one-city",
    "what-rpg-map-making-tool-should-i-use",
    "what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
  ],
  labels: ["fantasy"],
  discovery: {
    id: "answer-huge-ruined-city-exploration",
    parentCluster: "adventure-mapping",
    clusters: ["adventure-mapping", "settlement-creation"],
    primaryIntent: "how to run exploration in a huge ruined city",
    intentAliases: [
      "how to run a city sized dungeon",
      "how to make exploring ruins interesting in an rpg",
      "how to structure exploration of a large rpg location",
      "how to run urban exploration without mapping every street",
      "how to run exploration in a ruined megacity",
      "fallen capital exploration structure rpg",
    ],
    uniqueValue:
      "A layered pointcrawl method for city-scale ruins: districts as nodes, visible landmarks, discovery through play, nested dungeons, fictional gates, and route rewards that give growing mobility over time.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-build-a-point-crawl",
      "answer-point-crawl",
      "answer-travel-interesting",
      "answer-living-fantasy-city",
      "answer-settlement-contents",
      "answer-fantasy-faction",
      "answer-sandbox-campaign-prep",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-build-a-point-crawl",
        reason:
          "That page teaches pointcrawl construction for wilderness regions; this page applies and extends the method specifically to dense urban ruins where districts replace wild landmarks and vertical routes, gates and nested interiors add city-specific structure.",
      },
      {
        with: "answer-living-fantasy-city",
        reason:
          "The living city page teaches daily rhythms and civic pressures that make an inhabited settlement feel active; this page teaches spatial exploration structure for ruined, district-scale locations where the loop is discovery, routes and gates rather than civic life.",
      },
      {
        with: "answer-run-mystery-without-railroading",
        reason:
          "The mystery page structures non-linear clue discovery and culprit timelines; this page structures spatial exploration through ruined districts, routes and gates. The shared wording about avoiding railroading describes different play problems.",
      },
    ],
  },
  seo: {
    title: "How to Run Exploration in a Huge Ruined City | Codex Cryptica",
    description:
      "Run a ruined megacity as a layered pointcrawl: districts as nodes, visible landmarks, discovery through play, soft gates, nested dungeons and routes as rewards.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-exploration-in-a-huge-ruined-city.jpg",
    imageAlt:
      "Vast ruined city at dusk with a leaning cathedral dome, flooded lower wards and a high cableway cutting across the skyline",
  },
};
