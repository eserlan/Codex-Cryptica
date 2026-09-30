import type { AnswerConfigInput } from "../schema";

export const howDoIBuildABelievableEconomyForAFantasyWorld: AnswerConfigInput =
  {
    slug: "how-do-i-build-a-believable-economy-for-a-fantasy-world",
    category: "worldbuilding",
    publishedAt: "2026-09-27",
    question: "How do I build a believable economy for a fantasy world?",
    kind: "framework",
    shortAnswer:
      "Build a believable fantasy economy by tracing six links for each region: what it has and needs, how resources are worked, how goods and labour move, who controls access or takes a share, what strains the arrangement, and what the players can see changing as a result. A believable economy does not need a perfectly calibrated price list; it needs causes the players can see, such as bread costing more after a blocked pass, a mine town having coin but no food, or someone with power responding to the strain.",
    sections: [
      {
        kind: "prose",
        heading: "Price lists do not create belief",
        paragraphs: [
          "Many economy notes fail because they list outputs: tables of coin values, wages, and trade goods that never connect to anything the party does. A complete price list still feels thin if every town sells everything at the same price regardless of season, distance, or trouble on the roads. The numbers are present, but nothing depends on them.",
          "Belief comes from dependence instead. A trusting reader accepts an economy when one place needs something only another place can supply, when moving goods has an obvious cost or risk, and when someone profits from keeping the arrangement as it is. When those links exist, a single changed price tells a story. When they do not, twenty prices tell nothing.",
          "This also keeps prep bounded. You do not need a full model of a continent. Pick the two or three regions the party will actually visit, trace their links, and leave the rest as names on a map until play reaches them.",
        ],
      },
      {
        kind: "list",
        heading: "Six links, from ground to table",
        intro:
          "Ask what this place has, what it lacks, how it turns one into the other, who controls that process, what is straining it, and what changes when it strains. Work through the six links in order for each region the party will visit; one line each is enough to start:",
        items: [
          {
            term: "Resources & needs",
            text: "What the land gives without much working, and what the region cannot easily supply for itself: farmland, timber, fish, ore, stone, pasture, salt, or a pass everyone must use. Two resources and one important need are plenty; a region with everything has no reason to trade.",
          },
          {
            term: "Production",
            text: "What local skill turns those resources into: milled flour rather than wheat, smelted bars rather than ore, dried fish, woven cloth, cut stone. Production explains who works, what tools matter, and what stops when workers leave or a mill burns.",
          },
          {
            term: "Exchange",
            text: "Who needs the surplus, where missing goods come from, and how goods or labour move: by river, mountain pass, coastal run, or market town. Exchange need not mean a cash market: rent, tribute, tithes, labour obligations, household production, rationing, patronage, gifts, requisition, and barter can all move goods or labour without coin. Name the path, the season it runs, and what makes it slow or unsafe. A route nobody can picture is a route nobody will defend.",
          },
          {
            term: "Control",
            text: "Who can take a share, restrict access, or change the terms of exchange: a lord with toll rights, a guild with a charter, a temple that blesses weights, or a company that owns the barges. Ask who controls labour or infrastructure, who can enforce a deal or seize goods, and who gains or loses when the arrangement shifts.",
          },
          {
            term: "Pressure",
            text: "What currently strains the arrangement: a late harvest, a closed pass, a new toll, a depleted seam, a war levy, a monster den near the road. One active pressure per region is enough; two is already a crisis the party cannot ignore.",
          },
          {
            term: "Consequences",
            text: "What the players can observe without being told the model: dearer bread, empty stalls, substitutes appearing, workers arriving or leaving, rationing, smuggling, guards at a quay, or a faction gaining leverage. If a pressure has no visible sign, it does not exist at the table.",
          },
        ],
        outro:
          "Write the chain as a single sentence when you can: the valley grows barley, the mill towns grind it, barges carry flour downriver, the toll guild takes its cut at the narrows, the narrows are held by deserters, so flour is dear and the bakers are angry. That sentence is the whole economy for most sessions.",
      },
      {
        kind: "example",
        heading: "Worked example: the same valley, two ways",
        paragraphs: [
          "Greyvale is an upland valley two days from a river port. It grows barley and cuts timber, but depends on salt brought upriver from the port. Compare a list-based approach with a linked one.",
        ],
        items: [
          {
            term: "The list-based version",
            text: "The notes list barley at 2 copper a bushel, timber at 5 silver a load, daily wages, and the price of a mule. Greyvale sells both goods at the port market and buys salt there. When the party asks why bread costs more this month, the notes have no answer, because no entry connects the valley to the town or either of them to trouble.",
          },
          {
            term: "The linked version",
            text: "Greyvale grows barley but has no mill, so grain travels to mill towns downstream; salt barges make the costly return upriver. Timber rafts follow the river too. The toll guild controls the narrows where it bends, and deserters from a finished war now hold the far bank and demand their own fee. The millers pass both fees on: flour reaches the port late and dear, bakers shorten loaves, and the guild blames the deserters while quietly raising its own share.",
          },
          {
            term: "Why it works",
            text: "Every economic fact now has an owner and a location. The party can meet the miller who pays twice, see the short loaves, hear the guild's story at the quay, and choose whom to believe. Greyvale matters because others need its barley and timber, while it depends on salt from elsewhere. Fixing the deserter problem, negotiating the toll, or finding another route can change prices, availability, and who holds power through play rather than through edited notes.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Let control and pressure do the heavy work",
        paragraphs: [
          "New worldbuilders often add more goods when an economy feels thin. The repair is usually elsewhere: give someone the right to tax, refuse, or delay exchange, then put that right under strain. A guild charter, a bridge toll, a temple monopoly on salt, or a lord who owns the only working crane will shape behaviour more than six additional commodities.",
          "Magic and monsters belong in the same links, but magic can change scarcity itself. For important magic, ask: what does this make cheap, what remains scarce, and who controls access? Magical transport can collapse distance for some goods; reliable food creation can change dependence on farms; enchanted tools can raise output; healing can change the cost of injury; and divination can shift information advantages. A dragon on the pass is pressure on a named route with a visible consequence at market.",
          "Resist modelling everything. Distant lands the party will never visit can stay as single phrases: pepper country, the horse plains, the glass coast. Detail follows play. When the party books passage or asks where the pepper comes from, that is the moment to trace the next chain.",
        ],
      },
      {
        kind: "checklist",
        heading: "Before the economy reaches the table",
        intro: "For each region the party will visit, confirm you can answer:",
        items: [
          "What does this place produce that others nearby cannot easily replace?",
          "What does it need from elsewhere, and by which route does that need arrive?",
          "Who takes a share of production or exchange, and what right lets them do it?",
          "What is straining the arrangement right now, and who is already responding to it?",
          "What will the party see, hear, or pay differently because of that strain?",
          "Which single sentence links ground to table if a player asks why something costs what it does?",
        ],
      },
    ],
    codexConnection: {
      heading: "Holding production, routes, and controllers together",
      paragraphs: [
        "An economy built from links is easy to describe and hard to keep consistent across sessions, because each change touches several notes at once: the valley, the mill town, the guild, the road, and the price the party remembers. Codex Cryptica holds those as connected entities rather than scattered paragraphs, so when the narrows close, the settlements, factions, and NPCs that depend on the route show the strain in the same place you prep from.",
        "The world, settlement, and faction generators are useful starting points for the raw material: a region with resources, a town with a reason to exist, and a group with the charter or muscle to control exchange. The links between them, and what breaks under pressure, remain decisions for the GM.",
      ],
      linkText: "Try the settlement generator",
      href: "/generators/settlement",
    },
    relatedTools: [
      {
        title: "Settlement generator",
        description:
          "Give each trading town a reason to exist, local resources, and tensions worth pressing.",
        href: "/generators/settlement",
      },
      {
        title: "Faction generator",
        description:
          "Create the guild, house, or crew that controls a toll, a charter, or a route.",
        href: "/generators/faction",
      },
      {
        title: "World generator",
        description:
          "Sketch regions, resources, and neighbours so production and need have somewhere to sit.",
        href: "/generators/world",
      },
      {
        title: "Rumour generator",
        description:
          "Spread news of shortages, blocked routes, and price rises through named sources.",
        href: "/generators/rumour",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for fantasy worldbuilding",
        description:
          "Keep regions, settlements, factions, and trade consequences connected across a campaign.",
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
      "how-do-you-create-a-fantasy-city-that-feels-alive",
      "what-should-an-rpg-settlement-contain",
      "how-do-you-create-a-fantasy-faction",
      "how-do-you-prepare-a-sandbox-rpg-campaign",
      "how-to-create-rumours-for-a-fantasy-town",
      "how-do-i-decide-what-a-settlement-produces-imports-and-exports",
      "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
      "how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
      "how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
      "what-can-players-actually-buy-and-sell-in-a-fantasy-settlement",
    "how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
  ],
    discovery: {
      id: "answer-believable-fantasy-economy",
      parentCluster: "economy-trade",
      clusters: ["economy-trade"],
      primaryIntent: "how to build a believable economy for a fantasy world",
      intentAliases: [
        "believable fantasy economy for worldbuilding",
        "how to make rpg economy feel realistic",
        "fantasy world trade and prices guide",
      ],
      uniqueValue:
        "A six-link prep method (resources, production, exchange, control, pressure, consequences) that makes a fantasy economy coherent through dependence and visible strain rather than price lists, with a linked valley worked example.",
      userJob: "create",
      relatedIntents: [
        "generator-settlement",
        "generator-faction",
        "generator-world",
        "generator-rumour",
        "for-economy-trade",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-trade-routes-shape-cities-kingdoms",
          reason:
            "This answer builds a whole economy from resources, production, exchange, and pressure; the trade-routes answer focuses on where goods must pass, who collects there, and how rival paths reshape settlements.",
        },
      ],
    },
    seo: {
      title: "How Do I Build a Believable Fantasy Economy? | Codex Cryptica",
      description:
        "A six-link method for a coherent fantasy economy: resources, production, exchange, control, pressure, and visible consequences, with a worked example.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-build-a-believable-economy-for-a-fantasy-world.jpg",
      imageAlt:
        "A fantasy river valley with grain barges, a toll bridge, and a market town beneath wooded hills",
    },
  };
