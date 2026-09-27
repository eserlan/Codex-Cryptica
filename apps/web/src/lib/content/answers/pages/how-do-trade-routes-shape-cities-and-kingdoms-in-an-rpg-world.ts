import type { AnswerConfigInput } from "../schema";

export const howDoTradeRoutesShapeCitiesAndKingdomsInAnRpgWorld: AnswerConfigInput =
  {
    slug: "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
    category: "worldbuilding",
    publishedAt: "2026-09-27",
    question: "How do trade routes shape cities and kingdoms in an RPG world?",
    kind: "framework",
    shortAnswer:
      "Trade routes shape settlements wherever movement becomes easier, safer, cheaper, more concentrated, or easier to control. Crossings and passes matter, but so do junctions, deep-water harbours, markets, and places that offer storage, repairs, credit, or reliable passage. Ask who captures value from the flow, which goods suit each path, what grows around it, how rulers respond, and who bears the cost if it stops. The answers place towns, infrastructure, factions, and rivalries on the map without simulating an entire economy.",
    sections: [
      {
        kind: "prose",
        heading: "Routes drawn as decoration change nothing",
        paragraphs: [
          "Many campaign maps show roads and sea lanes that connect dots without explaining any of them. The lines look busy, yet no place grows because movement is easier there, nobody guards or serves the flow, and closing a pass would inconvenience nobody. The route is illustration, and the world would play identically with it removed.",
          "A route earns its ink when it makes movement easier, safer, cheaper, more concentrated, or easier to control. A ford or pass may funnel traffic, while a junction, deep-water harbour, safe stopping place, busy market, or reliable repair yard may attract it. Trade can also bring news, beliefs, fashions, languages, technology, migrants, spies, and political influence, giving route towns identities beyond the goods they handle. Once those effects are visible, the map starts answering its own questions: the large town sits where river and road meet, the fortress watches a strategic crossing, and the poor village sits one valley sideways from wealth it can see but not touch.",
        ],
      },
      {
        kind: "list",
        heading: "Five questions that place power on the map",
        intro:
          "Take one route the party might travel and answer in order. Each answer places something on the map:",
        items: [
          {
            term: "Where does movement become valuable?",
            text: "Mark places where travel becomes easier, safer, cheaper, more concentrated, or easier to control: a ford, bridge, pass, strait, or last harbour before open water, but also a route junction, trans-shipment quay, safe stop, border crossing, or major market. A narrow point is one strong reason for a town to prosper, not the only one; reliable services or unusually low costs can draw trade too.",
          },
          {
            term: "Who captures value from the flow, and how?",
            text: "Name who benefits and by what means: a bridge toll, harbour due, or guild staple, but also warehousing, repairs, lodging, credit, brokerage, markets, shipbuilding, caravan services, processing, security, or information. A place can prosper by serving carriers and buyers without legally taxing every cart that passes.",
          },
          {
            term: "What grows around the flow, and what does the ruler do?",
            text: "Show the local effects in warehouses, a counting house, garrison, inns, shrine, and repair yards, then add lenders, fences, informants, and rival agents. At kingdom scale, ask what the ruler or state does differently because this route matters: customs revenue may fund armies and officials; rulers may build roads, bridges, canals, and ports, fortify crossings, patrol routes, guarantee passage by treaty, or use embargoes and blockades as weapons. Capitals may grow where routes converge, and a route's rise can shift power between provinces, nobles, cities, temples, and merchant factions competing for the corridor.",
          },
          {
            term: "Which cargo prefers each path, and what rival route competes?",
            text: "Ask what kind of cargo suits each route and why: weight and bulk, perishability, urgency, season, danger, cost, or secrecy may all matter. Then find a rival path: a new mountain road, smuggler's cove, repaired canal, or a season when the marsh crossing holds. It may serve different cargo, work only in one season, be faster but riskier, cross another kingdom, or suit smugglers alone. Its existence keeps collectors nervous and gives carriers a choice; it need not replace the original route.",
          },
          {
            term: "Who loses if the flow stops?",
            text: "Trace who feels the stoppage first, who has reserves or alternatives, and who can shift the cost onto someone else. Merchants may reroute, warehouses release stock, rulers subsidise transport, smugglers profit, consumers pay more, or armies requisition supplies. Whoever has the most to lose may pay, threaten, or hire to reopen the way, which tells you who offers the party work when trouble comes.",
          },
        ],
        outro:
          "Worked through once, these answers explain why settlements and states invest in the route, and give beneficiaries and rivals motives the party can read from the map and its buildings.",
      },
      {
        kind: "example",
        heading: "Worked example: Vennport and the Halrow road",
        paragraphs: [
          "Vennport grew where a river meets a strait, the only deep harbour for a hundred miles. For a generation every bar of upland iron and every sack of lowland grain changed hands in its staple hall. Then Halrow, a hill town twenty miles inland, repaired an old military road that lets pack trains bypass the harbour dues entirely.",
        ],
        items: [
          {
            term: "The flow and its collectors",
            text: "Vennport's harbourmaster takes a due on every hull, and the staple guild forces all bulk sale through its hall for a second cut. That double share built the stone quay, the counting house, and the garrison that polices both. Halrow's council takes a smaller road toll and charges for stabling, water, and guards on the repaired stretch.",
          },
          {
            term: "What gathered",
            text: "Vennport holds warehouses, lenders, a sailors' shrine, and a row of inns that serve carriers in five tongues. Halrow has new paddocks, a farrier's street that did not exist three years ago, and a moneychanger who arrived with the first pack trains. Both towns now employ people whose living depends on carriers choosing their path.",
          },
          {
            term: "The pressure both feel",
            text: "Carriers split by cargo: heavy ore still goes by water, while wool, hides, and anything urgently needed takes the road. Vennport's dues income has fallen by a third, so the guild leans harder on the hulls that remain and fines captains for short measures. Halrow's council fears the day Vennport lowers its dues or sends soldiers to close the old road as a hazard to travellers.",
          },
          {
            term: "Why it works",
            text: "No town was placed for scenery; each serves a different movement problem, and their buildings show what trade supports them. The rivalry needs no villain: Vennport defends its income, Halrow defends its new prosperity, and carriers choose by cargo, cost, and risk. The road does not replace the waterway for every load. Any party travelling, guarding, smuggling, or negotiating between the two walks straight into the tension.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Protection and disruption are the adventure layer",
        paragraphs: [
          "Every valuable flow attracts two kinds of attention: those paid to protect it and those paid to interrupt it. Guards ride with the pack trains, the garrison patrols the narrows, and pilots guide hulls past the sandbar. At the same time, deserters watch the road from the high woods, a rival town pays informants for sailing times, and wreckers light false beacons on storm nights. Neither side needs inventing once the route's value is clear; both follow from the money.",
          "Disruption then plays out through the earlier links rather than as abstract loss. A blocked pass may leave warehouses full while a treasury empties, send some carriers to a rival path, prompt lenders to call in debts, and drive buyers to seek alternatives. The order and severity depend on reserves, local production, alternatives, and who can pass the cost along. Run the stoppage town by town and the consequences arrive as scenes: idle porters, a closed staple hall, a council offering hazard pay.",
        ],
      },
      {
        kind: "checklist",
        heading: "Before the route reaches the table",
        intro: "For each route the party might use, confirm:",
        items: [
          "Can you point to the places where travel becomes easier, safer, cheaper, more concentrated, or easier to control?",
          "Who captures value from the flow, through charges, services, trade, or information?",
          "What do settlements and rulers build, fund, or protect because the route matters?",
          "Which cargo suits each path, and what partial, seasonal, or risky rival route competes?",
          "Who feels a stoppage first, who has reserves or alternatives, and who bears the cost?",
          "Which protection and which threat already watch the route, and where do they show themselves?",
        ],
      },
    ],
    codexConnection: {
      heading: "Holding routes, beneficiaries, and towns on one map",
      paragraphs: [
        "A route connects more notes than any single settlement file comfortably holds: the junctions and crossings, the people and businesses capturing value, the warehouses they built, the rival path, and the carriers choosing between them. When a toll changes or a road opens, several places may feel it, and scattered notes rarely keep them aligned. Codex Cryptica holds routes, settlements, factions, and NPCs as linked entities on one map, so a blocked pass or a new road shows its pressure everywhere it belongs.",
        "The world generator sketches the land the route must cross, the settlement generator gives each stop its reason to exist, and the faction generator supplies the collectors with the charters and muscle to charge. The five questions above turn those pieces into a route with beneficiaries worth defending and rivals worth fearing.",
      ],
      linkText: "Try the settlement generator",
      href: "/generators/settlement",
    },
    relatedTools: [
      {
        title: "Settlement generator",
        description:
          "Build the ports, market towns, and way stations that grow where routes bring opportunity.",
        href: "/generators/settlement",
      },
      {
        title: "Faction generator",
        description:
          "Create the guilds, harbour offices, and road companies that take a share of the flow.",
        href: "/generators/faction",
      },
      {
        title: "World generator",
        description:
          "Lay out coasts, passes, and neighbours so routes and rival paths have ground to cross.",
        href: "/generators/world",
      },
      {
        title: "Rumour generator",
        description:
          "Spread word of closed passes, new roads, seized cargoes, and changing dues.",
        href: "/generators/rumour",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for fantasy worldbuilding",
        description:
          "Keep routes, valuable nodes, beneficiaries, and rival paths connected on one map.",
        href: "/for/fantasy-worldbuilding",
      },
      {
        title: "TTRPG Economy & Trade",
        description:
          "Build believable prices, trade, scarcity, wealth, and economic pressures without simulating an entire economy.",
        href: "/for/economy-trade",
      },
    ],
    relatedAnswers: [
      "how-do-i-build-a-believable-economy-for-a-fantasy-world",
      "how-do-i-decide-what-a-settlement-produces-imports-and-exports",
      "how-do-you-create-a-fantasy-city-that-feels-alive",
      "what-should-an-rpg-settlement-contain",
      "how-do-you-create-a-fantasy-faction",
      "how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
      "how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
    ],
    discovery: {
      id: "answer-trade-routes-shape-cities-kingdoms",
      parentCluster: "economy-trade",
      clusters: ["economy-trade"],
      primaryIntent:
        "how trade routes shape cities and kingdoms in an rpg world",
      intentAliases: [
        "trade routes worldbuilding fantasy cities",
        "how do trade routes affect kingdoms in rpgs",
        "rpg trade route tolls and rival paths",
      ],
      uniqueValue:
        "Five map-placing questions (valuable nodes, who captures value, local and kingdom effects, cargo-fit and rival paths, stoppage costs) that turn a drawn route into settlements, state choices, and rivalries, with a harbour-versus-road worked example.",
      userJob: "create",
      relatedIntents: [
        "answer-believable-fantasy-economy",
        "answer-settlement-production-imports-exports",
        "generator-settlement",
        "generator-faction",
        "generator-world",
        "for-economy-trade",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-believable-fantasy-economy",
          reason:
            "This answer maps choke points, collectors, and rival routes onto settlements; the economy answer traces resources, production, exchange, and pressure across a whole region.",
        },
      ],
    },
    seo: {
      title: "How Do Trade Routes Shape Cities and Kingdoms? | Codex Cryptica",
      description:
        "Place trade power on the map: valuable route nodes, who captures value, cargo-fit, kingdom choices, rival paths, and who bears the cost when trade stops.",
      image:
        "https://assets.codexcryptica.com/og/how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world.jpg",
      imageAlt:
        "A harbour city with stone quays and sailing ships beside an inland pack-train road winding through hills",
    },
  };
