import type { AnswerConfigInput } from "../schema";

export const howDoTradeRoutesShapeCitiesAndKingdomsInAnRpgWorld: AnswerConfigInput =
  {
    slug: "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
    category: "worldbuilding",
    publishedAt: "2026-09-27",
    question: "How do trade routes shape cities and kingdoms in an RPG world?",
    kind: "framework",
    shortAnswer:
      "Trade routes shape settlements by forcing valuable goods through narrow points where someone can tax, store, and defend them, so crossings, ports, and passes grow rich while places the route skips stay small. Ask who takes a share at each narrow point, what has gathered around the flow of goods, which rival path could steal it, and what happens to those places if the flow stops. The answers place cities, tolls, garrisons, and rivalries on the map without any further invention.",
    sections: [
      {
        kind: "prose",
        heading: "Routes drawn as decoration change nothing",
        paragraphs: [
          "Many campaign maps show roads and sea lanes that connect dots without explaining any of them. The lines look busy, yet no town exists because of its position, nobody guards or taxes the flow, and closing a pass would inconvenience nobody. The route is illustration, and the world would play identically with it removed.",
          "A route earns its ink when goods must pass a specific point and someone there takes a share. That share pays for walls, warehouses, soldiers, and officials, which attract smiths, moneylenders, spies, and thieves in turn. Once that chain is visible, the map starts answering its own questions: the large town sits where the river narrows, the fortress watches the only dry crossing, and the poor village sits one valley sideways from wealth it can see but not touch.",
        ],
      },
      {
        kind: "list",
        heading: "Five questions that place power on the map",
        intro:
          "Take one route the party might travel and answer in order. Each answer positions something physical:",
        items: [
          {
            term: "Where must goods pass?",
            text: "Find the narrow points: a ford, a bridge, a mountain pass, a strait, the last harbour before open water. Mark them first, because everything expensive about the route happens there. A route with no narrow point has no reason to enrich anyone along it.",
          },
          {
            term: "Who takes a share there?",
            text: "Name the collector at each narrow point and the right behind the collection: a bridge toll, a harbour due, a guild staple that forces sale in its hall, an escort fee. The collector's income is the budget for everything the place builds next.",
          },
          {
            term: "What gathered around the flow?",
            text: "Spend the collector's share visibly: warehouses, a walled counting house, a garrison, inns for drovers, a shrine the carriers favour, repair yards. Then add the second wave that follows money anywhere: lenders, fences, informants, and rival agents.",
          },
          {
            term: "What rival path threatens it?",
            text: "Find the bypass: a new mountain road, a smuggler's cove, a repaired canal, a season when the marsh crossing holds. The rival path need not be better, only cheap enough that some carriers switch. Its existence keeps every collector nervous and every toll negotiable.",
          },
          {
            term: "Who loses if the flow stops?",
            text: "Trace the stoppage forward: the toll town starves first, then the carriers, then the distant buyer. Whoever loses fastest will pay, threaten, or hire to reopen the way, which tells you exactly who offers the party work when trouble comes.",
          },
        ],
        outro:
          "Worked through once, these answers explain the size of every settlement on the route and give each collector a motive the party can read from the buildings alone.",
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
            text: "No town was placed for scenery; each sits on a narrow point or a bypass, and their buildings show which share paid for them. The rivalry needs no villain: Vennport defends its income, Halrow defends its new prosperity, and carriers choose by price. Any party travelling, guarding, smuggling, or negotiating between the two walks straight into the tension.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Protection and disruption are the adventure layer",
        paragraphs: [
          "Every valuable flow attracts two kinds of attention: those paid to protect it and those paid to interrupt it. Guards ride with the pack trains, the garrison patrols the narrows, and pilots guide hulls past the sandbar. At the same time, deserters watch the road from the high woods, a rival town pays informants for sailing times, and wreckers light false beacons on storm nights. Neither side needs inventing once the route's value is clear; both follow from the money.",
          "Disruption then plays out through the earlier links rather than as abstract loss. A blocked pass means the toll town's warehouses sit full while its treasury empties, carriers switch to the rival path, lenders call in debts, and the distant buyer sends riders asking what the party saw on the road. Run the stoppage town by town and the consequences arrive as scenes: idle porters, a closed staple hall, a council offering hazard pay.",
        ],
      },
      {
        kind: "checklist",
        heading: "Before the route reaches the table",
        intro: "For each route the party might use, confirm:",
        items: [
          "Can you point at the narrow points where goods must pass on the actual map?",
          "Does each narrow point have a named collector with a stated right to charge?",
          "Do the towns on the route show the collector's spending in buildings and people?",
          "Is there a rival path, however partial, that keeps the collectors uneasy?",
          "Do you know who loses fastest if the flow stops, and what they will offer to reopen it?",
          "Which protection and which threat already watch the route, and where do they show themselves?",
        ],
      },
    ],
    codexConnection: {
      heading: "Holding routes, collectors, and towns on one map",
      paragraphs: [
        "A route connects more notes than any single settlement file comfortably holds: the narrow points, the collectors, the warehouses they built, the rival path, and the carriers choosing between them. When one toll changes, five places should feel it, and scattered notes rarely keep all five aligned. Codex Cryptica holds routes, settlements, factions, and NPCs as linked entities on one map, so a blocked pass or a new road shows its pressure everywhere it belongs.",
        "The world generator sketches the land the route must cross, the settlement generator gives each stop its reason to exist, and the faction generator supplies the collectors with the charters and muscle to charge. The five questions above turn those pieces into a route with beneficiaries worth defending and rivals worth fearing.",
      ],
      linkText: "Try the settlement generator",
      href: "/generators/settlement",
    },
    relatedTools: [
      {
        title: "Settlement generator",
        description:
          "Build the toll towns, ports, and way stations that grow where goods must pass.",
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
          "Keep routes, toll towns, collectors, and rival paths connected on one map.",
        href: "/for/fantasy-worldbuilding",
      },
    ],
    relatedAnswers: [
      "how-do-i-build-a-believable-economy-for-a-fantasy-world",
      "how-do-i-decide-what-a-settlement-produces-imports-and-exports",
      "how-do-you-create-a-fantasy-city-that-feels-alive",
      "what-should-an-rpg-settlement-contain",
      "how-do-you-create-a-fantasy-faction",
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
        "Five map-placing questions (narrow points, collectors, gathered growth, rival paths, stoppage losers) that turn a drawn route into toll towns, garrisons, and rivalries, with a harbour-versus-road worked example.",
      userJob: "create",
      relatedIntents: [
        "answer-believable-fantasy-economy",
        "answer-settlement-production-imports-exports",
        "generator-settlement",
        "generator-faction",
        "generator-world",
      ],
    },
    seo: {
      title: "How Do Trade Routes Shape Cities and Kingdoms? | Codex Cryptica",
      description:
        "Place trade power on the map: narrow points, toll collectors, gathered towns, rival paths, and who loses when the flow stops.",
      image:
        "https://assets.codexcryptica.com/og/how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world.jpg",
      imageAlt:
        "A harbour city with stone quays and sailing ships beside an inland pack-train road winding through hills",
    },
  };
