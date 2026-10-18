import type { AnswerConfigInput } from "../schema";

export const howDoIDesignAGeographicallyRealisticTownOrVillage: AnswerConfigInput =
  {
    slug: "how-do-i-design-a-geographically-realistic-town-or-village",
    category: "worldbuilding",
    publishedAt: "2026-10-18",
    question: "How do I design a geographically realistic town or village?",
    kind: "how-to",
    shortAnswer:
      "Start with reliable clean water that people can reach in every season, then place homes on safe, buildable ground above flood risk, surround the settlement with the fields, grazing, woodland and fisheries that feed it, and let roads to the crossing, market and fields shape the streets. Add facilities where the work happens, such as the mill on the stream and warehouses by the quay, and let later growth explain bent streets, old walls and districts outside the gates. There is no single correct medieval layout: water, terrain, climate, technology, government and history change the answer each time.",
    sections: [
      {
        kind: "prose",
        heading: "Start with water, but think beyond a blue line on the map",
        paragraphs: [
          "A river on the map does not guarantee that anyone can drink from it. Ask where clean water comes from in the driest month and the coldest month, who can reach it, and what happens when it fails. A spring at the foot of a slope, a shallow well field, or a stream that runs all year will support a settlement. A wide river that floods each spring, turns brackish near the sea, or drops between steep banks may be useful for transport and mills while daily water still comes from wells and cisterns behind the houses.",
          "Work through the source before you draw a single street. Surface water suits settlements that can protect an intake upstream of latrines, tanneries and livestock crossings. Groundwater suits places with diggable wells, but wells need spacing, lining and a plan for when the water table falls. Dry settlements store water instead: roof runoff into cisterns, seasonal pools lined with clay, or channels that bring water from distant springs. Coastal settlements face a sharper version of the same problem, because a harbour full of ships can sit beside very little fresh water. Name the source, the backup source and the failure mode. If you cannot answer for winter and for drought, the site is not settled yet.",
          "Treat flood risk as part of the water decision, not an afterthought. Homes, granaries and workshops that must stay dry belong on a raised terrace, a low ridge or the higher bank, with the floodplain left to meadow, grazing, fisheries and gardens that tolerate wet ground. Building directly on the bank buys easy access and pays for it in ruined stores, undermined walls and streets that become channels. A settlement that has lived with a river for generations shows that bargain in its levels: quays and boathouses low, homes and stored food high, and a lane or bank marking where people expect the water to reach.",
        ],
      },
      {
        kind: "list",
        heading:
          "Choose ground people can build on, defend and feed themselves from",
        intro:
          "No site is good at everything. Choose the trade-off the settlement has accepted, and let it show on the map:",
        items: [
          {
            term: "Safe building ground",
            text: "Gentle slope that drains, soil firm enough for foundations and wells, and room to expand without climbing a cliff or filling a marsh. Steep, waterlogged or rocky ground can be built on, but only with extra labour that someone had a reason to pay for.",
          },
          {
            term: "Food close at hand",
            text: "Arable soil, pasture, orchards, fisheries or managed woodland within a workable distance. Poor soil beside the houses can still work if better fields, a fishery or a trade route lie close, but the settlement then depends on that link and feels its loss quickly.",
          },
          {
            term: "Local material",
            text: "Stone, timber, clay, reed or turf for building, plus fuel for hearths, kilns and smithies. A town that must import every beam and roof tile looks different from one that can cut and fire its own, and it worries about different roads.",
          },
          {
            term: "A reason for routes to arrive",
            text: "A ford or bridge site, a navigable river or natural harbour, a pass, a road junction or the edge between two kinds of country, such as hill pasture and valley grain. Visibility over the approach helps defence and toll-taking, but a hilltop with no water or fields is a fort, not yet a town.",
          },
          {
            term: "Defensible without being trapped",
            text: "A river bend, ridge or marsh edge that narrows the approaches is useful only if the settlement can still reach its water, fields and escape routes. Walls that cut a town off from its own wells or farmland create a weakness the first siege will find.",
          },
        ],
        outro:
          "Write the trade-off in one sentence before you draw: what this site gives freely, and what its people must work or pay for every year. That sentence will settle later arguments about where things go.",
      },
      {
        kind: "prose",
        heading: "Place the land that feeds the settlement before the streets",
        paragraphs: [
          "A village is the centre of a working landscape, not a cluster of houses with fields added for decoration. Put the best drained arable land where carts and plough teams can reach it daily, grazing on ground too wet, steep or poor to plough, orchards and gardens close to homes where they can be tended and guarded, and woodlots managed for fuel and timber rather than cleared at random. Fisheries, reed beds, salt pans, quarries and clay pits each pull a path and a small cluster of sheds or seasonal work toward them. Mills belong where the water power or wind is reliable and grain can arrive without crossing the whole settlement; a watermill needs a leat, a pond or a managed stretch of stream, not just a wheel symbol beside a river.",
          "Connect that hinterland with usable movement. A path that is dry enough for a laden cart in autumn matters more than a straight line on the map. If the fields lie across the river, the settlement needs a ford, ferry or bridge it controls or can pay to use, and its market and storage will gather near that crossing. If the best land lies along one road, the settlement stretches toward it. Draw the fields, grazing, woodland and mill first, then let the lanes that serve them become the oldest streets. A settlement whose food arrives from somewhere else should show that too: a quay, a drove road, a granary by the gate, and anxiety about the route in its politics.",
        ],
      },
      {
        kind: "prose",
        heading: "Draw movement before you draw a street plan",
        paragraphs: [
          "Streets go somewhere. Mark the destinations first: the ford or bridge, the quay, the road to the fields, the road to the next town, the mill, the grazing gate, the shrine or hall that people visit on set days. Join them with routes that respect slope, wet ground and property boundaries, and the street pattern follows. Lanes bend around a marsh, follow a terrace edge, or converge on the one bridge because crossing anywhere else costs time, tolls or wet feet. A market needs an open space where those routes meet and where carts can turn, load and wait without blocking the through road.",
          "Distinguish a grown settlement from a planned one. A grown settlement accumulates: a hamlet lane becomes the high street, side alleys fill the gaps between older plots, and the centre shifts when a bridge replaces a ford or a lord moves the market. Streets are irregular because each generation solved a local problem. A planned settlement, founded by a lord, town council, religious house or colonial authority, can start with straight streets, regular plots and a market place laid out at once, but even planned streets still answer to water, slope and the road they were built to serve. If your map mixes both, that is often a sign of two phases of growth, so keep the join visible rather than tidying it away.",
        ],
      },
      {
        kind: "list",
        heading: "Put each facility where the work happens",
        intro:
          "Use tendency and cost, not rigid zoning. Most placements below are common because they save carrying, water, time or risk, and each has honest exceptions:",
        items: [
          {
            term: "Wells, fountains and cisterns",
            text: "Where people live and gather, close enough that carrying water does not dominate the day, and protected from latrines, middens and stable drainage. A public source near the market or gate serves travellers and newcomers as well as residents.",
          },
          {
            term: "Market and civic or religious centre",
            text: "On the main route where roads meet, near the bridge or gate that brings in sellers, with room for stalls, animals and carts. The hall, court, temple or church often stands beside or above that space because authority wants to be seen where people already gather, though in some towns the religious centre keeps an older, quieter site apart from trade.",
          },
          {
            term: "Quay, warehouses and inns",
            text: "By the landing place and the gate where goods enter, so loads move a short distance between boat, cart and store. Inns and stabling gather near gates and markets because travellers arrive there hungry, tired and in need of fodder, not in the quiet residential lanes.",
          },
          {
            term: "Workshops and water-using trades",
            text: "Smiths near fuel and through routes, fullers and dyers where water can be drawn and waste carried away, potters near clay and space for kilns. Smelly, smoky or fire-prone work is often pushed toward the edge, downstream or downwind of homes, but treat that as a pressure, not a law. Plenty of real towns kept noxious trades mixed among houses for centuries, and the friction that caused is itself usable detail.",
          },
          {
            term: "Mills, defences and stores",
            text: "Mills on the managed water that drives them, with the millpond and leat drawn as part of the settlement. Granaries and stores on dry ground inside the defended area if there is one. Walls and gates placed to protect homes and stores while keeping the bridge, market road and field gates usable; a gate that severs the main road will be regretted, moved or quietly left open.",
          },
        ],
      },
      {
        kind: "table",
        heading: "Let climate and country change the layout",
        headers: ["Setting", "Water answer", "What it does to the map"],
        rows: [
          [
            "River valley",
            "Wells and river intakes, with flood levels deciding which bank and terrace can hold homes and stores.",
            "Homes and granaries on the terrace, meadow and fisheries on the floodplain, quay and mill low, one bridge shaping the market and gates.",
          ],
          [
            "Drylands or oasis",
            "A spring, well field, cistern system or irrigation channel that must be shared, guarded and repaired.",
            "Compact settlement clustered near the water, irrigated gardens and palms closest, dry grazing and caravan ground outside, storage protected against scarcity.",
          ],
          [
            "Coast or estuary",
            "Harbour water is plentiful for boats but fresh water may be scarce, brackish or tidal, so wells and cisterns still decide where people live.",
            "Quay and warehouses on sheltered water, homes on higher or fresher ground behind, fisheries and salt works along the shore, exposure to storms shaping walls and roofs.",
          ],
          [
            "Highlands",
            "Springs and streams that freeze, run fast or fail on high pasture, with steep ground limiting wells, carts and building plots.",
            "Settlement tucked into a sheltered shelf near a spring, terraced fields and drove roads, grazing spread wide above, routes that close in winter.",
          ],
        ],
      },
      {
        kind: "prose",
        heading: "Let history leave marks, and let magic state its price",
        paragraphs: [
          "A settlement that has grown reads as layers. The oldest lane still aims at a ford nobody uses because the bridge moved downstream. A filled ditch or old wall survives as a curved street, a property boundary or a line of houses facing the wrong way. New building spreads outside an old gate along the road, because the gate is where traffic already passes, and only later does a new wall enclose it or leave it exposed. Rebuilding after fire or flood straightens one street, widens one junction or moves the market a short distance, while neighbouring lanes keep their older shape. Add two or three such scars and name their cause. They give players something to ask about and give you a history you did not have to write as a timeline.",
          "Fantasy elements follow the same discipline. If magic, divine aid or unusual technology supplies water, moves goods or holds back floods, state what it provides, who controls it, who pays for it and what happens when it stops. A rain shrine that fills the cisterns in a dry town replaces wells only if it works in drought, serves everyone or openly serves someone first, and has a failure the town fears. A magically kept harbour still needs warehouses beside the quay. Changed constraints change the map; unlimited convenience removes the geography without replacing it with anything to play with.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example: one river crossing in three stages",
        paragraphs: [
          "Sketch this as three small maps of the same bend in the river, or as one map with older features left visible. The settlement is fictional. Copy the reasoning, not the shape, because your river, soil and roads will argue for a different plan.",
          "Picture the site first. A river bends around a low terrace on its north bank. Below the terrace lies a flat floodplain that holds water meadow and a ford where the river spreads shallow over gravel. A spring rises at the foot of the slope west of the terrace, and a small stream runs past its eastern edge down to the river. Fields with decent soil lie on the higher ground north of the terrace. A track follows the terrace to the ford, then continues south.",
        ],
        items: [
          {
            term: "Stage A: hamlet above the floodplain",
            text: "Eight or ten households cluster on the terrace beside the spring, above the level the river reaches in a wet spring. Homes face a short lane that runs from the spring to the track. Gardens sit behind the houses, arable strips lie on the higher ground to the north, and cattle graze the floodplain meadow in dry months because that ground is too wet to plough reliably. The ford carries the track across the river, so a single shed and a hard standing mark where carts wait. The stream turns no wheel yet; people carry water from the spring and the river only washes and waters stock. If the spring were to fail in drought, the hamlet would have to dig wells on the terrace or leave, and everyone knows which households would argue over the work.",
          },
          {
            term: "Stage B: market town at the bridge",
            text: "Two generations later the ford is too busy and too often impassable, so a bridge is built a short distance downstream where the banks are firm and the terrace reaches close to the water. Traffic shifts at once. The market is laid out where the bridge road meets the old terrace lane, because sellers from both banks arrive there and carts can wait without blocking the bridge. Inns and stabling open near the bridge gate, warehouses stand between the quay below the bridge and the market so goods move a few dozen paces between boat, cart and store, and a watermill is cut into the eastern stream with a leat and pond above the town. Wells are dug in the new streets east of the market as building spreads off the terrace, tanners and dyers work downstream of the wells at the lower end of the stream where waste leaves with the current, and the old ford lane survives as a back way to the water meadow. Players arriving now can read the town without a briefing: cross the bridge, pay at the gate, sell in the market, store by the quay, and ask at the mill who controls the grain.",
          },
          {
            term: "Stage C: fortified town with its past still showing",
            text: "A later wall encloses the terrace, the market and the bridge approach, with gates placed on the bridge road, the northern field road and the eastern mill road so existing traffic still flows. The wall deliberately leaves the floodplain, the water meadow and most of the quay warehouses outside, because walling wet ground costs more than the stores there are worth; in a raid those goods are moved up or lost, and the town resents the bargain every time. Inside, a second market street has straightened one fire-cleared block while the lanes near the spring keep their older bends, and a filled stretch of the first ditch survives as a curved row of houses. Outside the northern gate, a suburb of workshops and inns has grown along the field road and now petitions for protection of its own. The spring that started the settlement still supplies the western quarter, but the eastern streets depend on wells, so a dry year sets the two halves arguing over carts, queues and who may draw first.",
          },
          {
            term: "Why it works",
            text: "Each stage keeps the geography that made the earlier stage sensible and adds one change that reshapes movement. The terrace explains where homes stand, the spring explains where the hamlet started, the bridge explains why the market moved, and the wall explains both the protected centre and the exposed suburb. A player can point to any street and ask why it bends, floods or ends at a gate, and the map already contains the answer.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Sketch a settlement in 10 minutes",
        intro:
          "Draw in this order and resist adding detail out of sequence. Each step constrains the next, which is what makes the result hold together:",
        items: [
          "Mark the reliable clean water source and its backup, then note what happens in drought and in winter.",
          "Shade the ground that floods, the steep or wet ground, and the safe terrace, ridge or shelf where homes and stores can stay dry.",
          "Place the fields, grazing, gardens, woodland, fisheries and mill that feed the settlement, on the land suited to each.",
          "Draw the paths and roads between water, fields, mill and neighbouring places, and fix the ford, bridge, quay or pass they depend on.",
          "Put the market and civic or religious centre where those routes meet, with room for carts and animals.",
          "Add wells, warehouses, inns, workshops and stores where the work happens, keeping water-using and smelly trades in mind without forcing them into a tidy zone.",
          "Add walls and gates only if the settlement has them, placed so the bridge, market road and field routes still work.",
          "Erase or demote one old feature and add one scar: a disused ford lane, a filled ditch, a suburb outside the gate, or a street straightened after a fire or flood.",
        ],
      },
      {
        kind: "checklist",
        heading: "Seven questions before you call the map finished",
        items: [
          "Where do people get clean water in winter, and in the driest month, and who controls access to it?",
          "Which ground floods, which buildings would be ruined by it, and where do people and stores go when it happens?",
          "Where does food arrive from each day, by which road, ford or quay, and what blocks that route first?",
          "Why does the main street bend, end or widen where it does, in terms of slope, water, an older plot boundary or an earlier route?",
          "Where do goods change between boat, cart and store, and how far does anyone have to carry them?",
          "If there are walls, what do the gates protect and what useful ground, water or warehousing did the wall leave outside?",
          "What is the oldest feature still visible on the map, what replaced it, and why can residents still point to both?",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep the settlement connected to the country around it",
      paragraphs: [
        "A settlement drawn this way is a set of working links: the spring and wells that supply it, the fields and mill that feed it, the bridge and roads that enrich or expose it, and the factions that control each chokepoint. Holding the place as a location linked to those features means a return visit can start from the map you already made. When the bridge toll rises, the wells run low or the suburb outside the gate petitions for a wall, the consequences follow the same links the geography created.",
        "If you want a starting population, name and reason to exist before you draw, the settlement generator can draft that first sketch for you to then place against your own water, terrain and routes. Treat its output as the hamlet in Stage A and grow it yourself, so the geography stays yours.",
      ],
      linkText: "Try the settlement generator",
      href: "/generators/settlement",
    },
    relatedTools: [
      {
        title: "Settlement generator",
        description:
          "Free, no login. Draft a town or village with a reason to exist, then place it against your own water, terrain and routes.",
        href: "/generators/settlement",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for fantasy worldbuilding",
        description:
          "Regions, settlements and the factions that fight over them, connected.",
        href: "/for/fantasy-worldbuilding",
      },
    ],
    relatedAnswers: [
      "what-should-an-rpg-settlement-contain",
      "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
      "how-do-i-decide-what-a-settlement-produces-imports-and-exports",
      "how-do-you-create-a-fantasy-city-that-feels-alive",
    ],
    labels: ["fantasy"],
    discovery: {
      id: "answer-geographically-realistic-town-village",
      parentCluster: "settlement-creation",
      clusters: ["settlement-creation", "worldbuilding"],
      primaryIntent: "how to design a geographically realistic town or village",
      intentAliases: [
        "how are medieval towns laid out around rivers and wells",
        "how to design a realistic fantasy town map",
        "where should settlements be built relative to water and floodplains",
        "fantasy village layout rivers roads farmland",
        "how geography shapes city streets markets and districts",
      ],
      uniqueValue:
        "A spatial method for laying out a settlement from reliable water, flood-safe building ground, food-producing hinterland, movement routes and staged historical growth, with a three-stage river-crossing worked example and a 10-minute sketch sequence.",
      userJob: "create",
      relatedIntents: [
        "answer-settlement-contents",
        "answer-trade-routes-shape-cities-kingdoms",
        "answer-settlement-production-imports-exports",
        "answer-living-fantasy-city",
        "generator-settlement",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-settlement-contents",
          reason:
            "The settlement contents answer decides what to prepare and why a settlement exists. This answer decides where homes, streets, fields, markets, mills, workshops and walls sit in physical relation to water, terrain and routes.",
        },
        {
          with: "answer-trade-routes-shape-cities-kingdoms",
          reason:
            "The trade routes answer maps the wider network of routes, tolls and rival paths between settlements. This answer lays out movement and facilities inside one settlement and its immediate hinterland.",
        },
        {
          with: "answer-settlement-production-imports-exports",
          reason:
            "The production answer derives what one settlement makes, imports and exports. This answer places the fields, grazing, woodland, fisheries, mills and stores that make that production physically possible.",
        },
        {
          with: "answer-living-fantasy-city",
          reason:
            "The living city answer shows how prepared districts, routines and groups feel active during play. This answer explains the geographical layout that produced those districts and streets.",
        },
      ],
    },
    seo: {
      title: "How to Design a Geographically Realistic Town | Codex Cryptica",
      description:
        "Lay out a town or village from reliable water, flood-safe ground, fields, routes and staged growth, with a three-stage river-crossing example and sketch steps.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-design-a-geographically-realistic-town-or-village.jpg",
      imageAlt:
        "A medieval river town on a raised terrace with a stone bridge, market, harbour warehouses, watermill, fields and grazing land",
    },
  };
