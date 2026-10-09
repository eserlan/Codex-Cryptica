import type { AnswerConfigInput } from "../schema";

export const howDoIRunExplorationInAHugeRuinedCity: AnswerConfigInput = {
  slug: "how-do-i-run-exploration-in-a-huge-ruined-city",
  category: "adventure-design",
  publishedAt: "2026-09-29",
  question: "How do I run exploration in a huge ruined city?",
  kind: "framework",
  shortAnswer:
    "Run a huge ruined city as a layered pointcrawl, not as one giant dungeon map. Give districts distinct identities, connect them with routes whose costs and risks players can weigh, and use landmarks or other orientation cues to help them choose goals without seeing everything. As they travel, tell them what they know, advance relevant time and supplies, and resolve an event only when uncertainty or pressure makes it matter. Reveal information when the fiction gives them a reason to learn it; treat obstacles as pressures they can approach in different ways, and let mastered routes become quick summaries until something changes. Reward progress with faster, safer movement and deeper understanding, while factions, hazards and route conditions continue to shift between expeditions.",
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
        "For a first playable slice, five-ish districts are often enough; add more when the campaign needs them. Each district is a node with the same depth you would give to a village or small valley:",
      items: [
        {
          term: "Districts as nodes with identity",
          text: "Name each district by what it once was and what now defines it: the Flooded Dockyards, the Glassmakers' Quarter, the Cathedral Precinct. For each, note its current character, its dominant danger or inhabitant, an orientation cue, and an active discovery such as a vault, archive, shrine or survivor enclave that makes a visit worthwhile.",
        },
        {
          term: "Pointcrawl routes, not street grids",
          text: "Link districts with a small set of named routes: a half-collapsed boulevard, a canal, a rooftop run, a service tunnel, or a cleared patrol road. Give each route an approximate travel time, hazard and cost such as noise, exposure, supplies or toll. Keep the network looped where it makes sense, with trade-offs players can weigh before they commit.",
        },
        {
          term: "Orientation cues that set goals",
          text: "Give players ways to orient themselves: a leaning tower above the roofs, bells audible through the streets, smoke, a beacon, a familiar smell or a signal on the radio. Some cues are visible from afar; others become clear only from a rooftop, in certain weather, or once a route reaches higher ground. They give direction without requiring you to reveal every intervening street.",
        },
        {
          term: "Information follows the fiction",
          text: "Reveal information when the fiction gives characters a reason to learn it. Skyline features may be obvious; residents may know common routes; a high vantage can reveal geography; an archive can show historical access; scouting can expose patrols; rumours can suggest uncertain possibilities; and helping a faction may open access to protected knowledge. Do not hide information just because the party has not completed a prerequisite.",
        },
        {
          term: "Routes as the best reward",
          text: "The most satisfying treasure in a huge city is often not coin but mobility. A cleared alley that avoids the main patrol, a rowboat that crosses the flooded ward, a secured stair through a collapsed arcade, or a repaired cableway changes future journeys. Track each route qualitatively as unknown, known, dangerous, secured, blocked or contested; its state can change when a faction moves, weather shifts, infrastructure fails, the party clears it, or enemies learn how it travels.",
        },
        {
          term: "Nested adventure sites inside districts",
          text: "Inside a district, zoom in only when players commit to a specific ruin: a single tower, vault, sewer nexus, temple or stronghold. Run that building as a conventional dungeon or compact pointcrawl of rooms and chambers. When they leave that building, return to the district and route scale. The city frames the dungeon; it does not replace it.",
        },
        {
          term: "Factions and territory that move",
          text: "Assign each district a current holder or pressure: a militia remnant, scavenger guild, cult, occupying company, nesting creature, or simply hazard and emptiness. Note what that holder wants, what it patrols, and what happens if the party helps, robs or displaces it. The city need not wait for the party: between expeditions, patrols may shift, scavengers strip a site, weather floods a route, a faction fortifies a district, or rumours about the party spread. The map stays mostly the same; its routes and occupants change.",
        },
        {
          term: "Environmental pressure on travel",
          text: "Let choices during movement matter. Darkness that demands light, unstable floors, hostile patrols, cursed wind, rain that floods low streets, dwindling clean water or daylight hours that force a camp all turn travel time into a budget. Keep pressure visible so players can prepare or accept risk rather than being punished after the fact.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Run each journey as a short loop",
      paragraphs: [
        "When the players say, “We want to get from Gate Ward to the Cathedral”, let them choose a destination and route. Tell them the known travel time, cost and risk before they commit, including what they can prepare for. Once they set out, advance relevant time, light, supplies or exposure. Resolve a travel event only if there is meaningful uncertainty or pressure; not every trip needs a random encounter. Then arrive, reveal what the journey or a new vantage makes knowable, and update the route's state on the shared map.",
        "Resolve uncertain travel; summarise mastered travel. Once a route is mapped, its main hazard cleared or passage secured, repeated safe journeys can be compressed unless something meaningful has changed. A secured thirty-minute stair should feel different from the two-hour exposed boulevard it replaced. Between expeditions, update route states and occupants when time, faction moves or hazards give you a reason to do so.",
      ],
    },
    {
      kind: "prose",
      heading: "Obstacles are pressures, not progression locks",
      paragraphs: [
        "An obstacle should follow from the city's history and be legible before the party commits. Treat it as a visible pressure that makes a route costly, dangerous or uncertain until the situation changes, rather than as a reason the party simply cannot go. Where the fiction allows, they can push through at high risk, improvise protection, take a costly detour, negotiate passage, find another route, change the environment, or decide the destination is not worth it yet. Some things really are impassable, but let that follow from the fiction rather than a progression plan.",
        "Prepare why the obstacle exists, what would logically change it, and one or two known opportunities. Accept other solutions that fit the fiction. For the flooded lower wards, boats may be known and sluice controls rumoured; players might instead build a raft, climb the roofs, drain a cellar route, bargain with ferrymen or use a fitting ability. The obstacle invites planning without demanding the GM's intended unlock.",
      ],
    },
    {
      kind: "table",
      heading: "City pressures and possible responses",
      headers: [
        "Obstacle (fiction first)",
        "Known opportunities or clues",
        "How it can affect mobility",
      ],
      rows: [
        [
          "Flooded district or canal ward",
          "Boats may be available; sluice controls are rumoured; rooftops or a cellar route might help",
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
          "Credentials, a bribe, a prisoner exchange, or a back way over roofs",
          "Negotiated passage or a secret bypass that avoids future tolls",
        ],
        [
          "Lost route only locals remember",
          "A street plan in an archive, a guide, or a high vantage that may reveal it",
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
      heading: "Progress means better choices, not just more map",
      paragraphs: [
        "The Metroidvania comparison helps when progress means growing competence and local knowledge rather than collecting keys. A changed situation may give the party better choices: a safer path, a vantage that reveals new orientation cues, introductions to a faction that trades maps for favours, or control of a district that becomes a forward base with supplies and rest.",
        "Start with enough information for players to make meaningful choices, then add detail as they explore. Some rumours become located sites; hard journeys become known routes. Over time, the party moves through the same city faster, quieter and with more options about who to deal with or avoid. Revisiting an early district can produce new play because its holder, patrol or hazard may have shifted.",
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
          text: "The party chooses the cathedral first because its bells still ring at dusk. On the roof they spot a cableway scar leading toward the Glassmakers' Quarter and fresh scaffolding at the collapsed bridge. A found sacristy map marks a vault beneath the precinct. Each piece adds information to the shared map. The flood is dangerous, but the party can seek boats or sluice controls, or propose another approach that fits the city.",
        },
        {
          term: "Routes and territory change return visits",
          text: "Three sessions later the party has cleared a stair through the arcade and befriended the dock crews. That stair turns a two-hour exposed walk along the boulevard into a thirty-minute quiet passage, which the GM can now summarise when nothing has changed. The crew ferries them across the outer flood for a small share of finds. When the party revisits the Gate Ward, the militia that once demanded tolls has been pushed back by the crews, so the market has reopened and a new rumour about the citadel's vault is on offer.",
        },
        {
          term: "Why it works",
          text: "Players have several understandable destinations to choose from, not fifty intersections they stumbled into. Travel is a decision about time, danger and cost rather than bookkeeping. New places and better ways to move emerge as play gives them a reason to, and old places stay active because factions and patrols react to what the party did. The city feels larger as understanding grows, even though the map has only a handful of circles and lines.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Prepare a city you can run next session",
      intro:
        "Use this as a starting pass before you place the city on the table:",
      items: [
        "Sketch a few districts as named nodes, each with one or more orientation cues and notes on when characters can sense them.",
        "Connect them with routes and note approximate travel time, hazards and costs; offer useful trade-offs where the city supports them.",
        "Give the party enough visible or otherwise knowable destinations to make a meaningful choice; the right number depends on the table and campaign.",
        "Seed a handful of leads and note how characters might learn each one, without hiding obvious information behind prerequisites.",
        "For each significant obstacle, note why it exists, what could logically change it and one or two known opportunities; leave room for other fitting solutions.",
        "Prepare nested sites in districts the party is likely to visit first as small dungeons or compact locations you can zoom into when players commit.",
        "Assign a holder, patrol pattern or environmental pressure to each district and note how it might change if the party displaces, bargains with or ignores them.",
        "Track route states such as unknown, dangerous, secured, blocked or contested, and update them when the fiction changes.",
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
  labels: ["fantasy", "sci-fi", "modern", "post-apocalyptic"],
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
      "A practical city-scale exploration procedure using districts as nodes, routes with changing states, orientation cues, nested sites, fiction-led information and route rewards that improve mobility over time.",
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
      "Run a ruined city as a layered pointcrawl with districts, changing routes, orientation cues, fiction-led discovery, nested sites and a practical travel loop.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-exploration-in-a-huge-ruined-city.jpg",
    imageAlt:
      "Vast ruined city at dusk with a leaning cathedral dome, flooded lower wards and a high cableway cutting across the skyline",
  },
};
