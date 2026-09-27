import type { AnswerConfigInput } from "../schema";

export const howDoIDecideWhatASettlementProducesImportsAndExports: AnswerConfigInput =
  {
    slug: "how-do-i-decide-what-a-settlement-produces-imports-and-exports",
    category: "worldbuilding",
    publishedAt: "2026-09-27",
    question:
      "How do I decide what a settlement produces, imports, and exports?",
    kind: "how-to",
    shortAnswer:
      "Derive a settlement's trade from its surroundings rather than picking goods at will: read the land for resources, check who lives there and what they know how to make, note the roads, river, or harbour that carry goods in and out, then name who taxes or forbids exchange. What the place makes with local hands is production; what it makes beyond its own need is surplus for export; what the land and skills cannot supply must be imported, and each import is a dependency you can press in play.",
    sections: [
      {
        kind: "prose",
        heading: "Arbitrary goods lists all sound the same",
        paragraphs: [
          "The usual approach starts at the market stall: the GM invents a few exports that sound colourful and moves on. The result is settlements that all sell a little of everything, where a mountain hamlet trades wine and a fishing port sells cheap iron, and no choice ever follows from the difference. Players stop asking where things come from because the answer is never load-bearing.",
          "Working from the surroundings fixes this with less effort, not more. Land, hands, paths, and rulers narrow the possibilities so sharply that the trade identity almost writes itself. A town above the treeline does not need a commodity table to tell you it buys timber; a town with one good harbour and poor soil does not need a simulation to explain why it sells fish and buys grain.",
        ],
      },
      {
        kind: "list",
        heading: "Six steps from surroundings to trade ledger",
        intro:
          "Answer each step with a phrase, not a paragraph. Stop as soon as the ledger lines are clear:",
        items: [
          {
            term: "Ground",
            text: "Name the geography and what it gives freely: thin pasture, deep woods, a workable seam of ore, a tidal flat for salt pans, a ford everyone must cross. If a resource is not on this list, the settlement does not produce it in quantity.",
          },
          {
            term: "Hands",
            text: "Count the people and what they know: fifty fishing families who can mend nets, two hundred miners with one smelter, a dozen weavers, no miller. Skills decide whether a resource leaves raw or worked, and worked goods feed more mouths per load.",
          },
          {
            term: "Tools",
            text: "Note the infrastructure that multiplies or limits output: a mill, a smelter, a deep-water quay, a dry storehouse, a maintained road. One missing tool is often the whole story: grain without a mill must travel, ore without a smelter leaves cheap.",
          },
          {
            term: "Neighbours",
            text: "List the two or three nearest settlements and the path to each, with its season and risk. Trade follows the cheapest safe path, so a rich neighbour across a dangerous pass matters less than a poor one downriver.",
          },
          {
            term: "Rulers",
            text: "Name who takes a share or sets terms: a lord's toll, a guild charter, a temple due, a company that owns the barges. Control decides which surplus actually reaches market and which import the town must accept at another's price.",
          },
          {
            term: "Ledger",
            text: "Write four short lines. Produces: what local ground and hands supply. Surplus: what remains past local need and can leave. Imports: what the town cannot supply and must bring in. Exports: the surplus that survives tools, paths, and rulers to sell elsewhere.",
          },
        ],
        outro:
          "Production is everything the town makes; surplus is the part it can spare; exports are the surplus that reaches a buyer. Imports are the mirror: everything the ground and hands cannot cover. Keeping those four lines separate is what makes shortages readable later.",
      },
      {
        kind: "example",
        heading: "Worked example: Kettlebeck, a hillside mining town",
        paragraphs: [
          "Built with the six steps in about ten minutes, in the shape of a settlement generator result with the trade lines filled in.",
        ],
        items: [
          {
            term: "Ground, hands, and tools",
            text: "Kettlebeck sits above the treeline beside a workable iron seam. Two hundred miners and one smelter crew can raise ore and smelt bars, but thin soil grows little and the slopes give no timber. The single maintained track drops to the timber town of Ashford, passable from spring to first snow.",
          },
          {
            term: "The ledger",
            text: "Produces: raw ore and smelted iron bars, mutton, wool. Surplus: iron bars past the smith's need, wool past winter clothing. Imports: timber for pit props, grain and flour, lamp oil, rope. Exports: iron bars down the track to Ashford, raw ore when the smelter cannot keep pace.",
          },
          {
            term: "Dependencies worth pressing",
            text: "Timber is the binding constraint: no props, no deep working, so the smelter slows within weeks of a missed delivery. Grain is the second: the town eats what Ashford sends up, which means a dispute over bar prices is also a dispute over bread. The mine owners know both facts and price accordingly.",
          },
          {
            term: "Why it works",
            text: "Nothing on the ledger was chosen for colour; each line follows from ground, hands, or the single track. The party can read the town at a glance: coin from iron, hunger from the track, leverage in whoever controls timber. Any pressure on that track is immediately a Kettlebeck problem the players can see and touch.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Read dependencies as future play",
        paragraphs: [
          "Every import line is a question about what happens when the delivery fails, and every export line is a question about who cannot afford to lose it. Kettlebeck without timber slows the smelter; Ashford without Kettlebeck bars idles its forge. Mark one dependency per settlement as the fragile one, the delivery with the fewest alternatives, and you have the pressure point without writing a plot.",
          "Rulers turn those pressures into decisions. The mine owners can accept Ashford timber at a higher price, send crews to cut illegally in the low woods, or run the deep levels without enough props and hope. Each response favours someone and angers someone else, which is where faction tension and table choices begin. The method for turning those responses into full situations continues in the adventure-hooks answer of this cluster.",
        ],
      },
      {
        kind: "checklist",
        heading: "Before the settlement trades",
        intro: "Confirm the ledger holds together before the party arrives:",
        items: [
          "Can you name what the land gives and what it withholds, in one line each?",
          "Do the people's skills explain whether goods leave raw or worked?",
          "Is production separated from surplus, and surplus separated from exports?",
          "Does every import have a named path and season attached to it?",
          "Which single dependency hurts fastest if its delivery fails?",
          "Who profits from the current arrangement, and who would profit from changing it?",
        ],
      },
    ],
    codexConnection: {
      heading: "Keeping each settlement's ledger attached to its world",
      paragraphs: [
        "A trade ledger only stays honest while it sits next to the facts it came from: the seam, the smelter, the track, the neighbour, the charter. Scattered notes lose that attachment within a session or two, and the town quietly reverts to selling everything. Codex Cryptica holds the settlement, its resources, its routes, and the factions that tax them as connected entities, so the ledger lines keep pointing at the ground and hands behind them.",
        "The settlement generator drafts the shell fast: surroundings, people, tensions, and places worth visiting. Working through the six steps above turns that draft into a ledger with named dependencies, ready to feel the strain when a route closes or a ruler changes terms.",
      ],
      linkText: "Try the settlement generator",
      href: "/generators/settlement",
    },
    relatedTools: [
      {
        title: "Settlement generator",
        description:
          "Draft surroundings, people, and tensions, then fill in the trade ledger with this method.",
        href: "/generators/settlement",
      },
      {
        title: "World generator",
        description:
          "Place neighbours, resources, and routes so each town's imports have somewhere to come from.",
        href: "/generators/world",
      },
      {
        title: "Faction generator",
        description:
          "Create the owners, guilds, or companies that tax exchange and squeeze dependencies.",
        href: "/generators/faction",
      },
      {
        title: "Rumour generator",
        description:
          "Carry news of missed deliveries, price disputes, and substitute goods between towns.",
        href: "/generators/rumour",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for fantasy worldbuilding",
        description:
          "Keep settlements, resources, routes, and the factions taxing them connected.",
        href: "/for/fantasy-worldbuilding",
      },
    ],
    relatedAnswers: [
      "how-do-i-build-a-believable-economy-for-a-fantasy-world",
      "what-should-an-rpg-settlement-contain",
      "how-do-you-create-a-fantasy-city-that-feels-alive",
      "how-do-you-create-a-fantasy-faction",
      "how-to-create-rumours-for-a-fantasy-town",
      "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
      "how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
      "how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
    ],
    discovery: {
      id: "answer-settlement-production-imports-exports",
      parentCluster: "economy-trade",
      clusters: ["economy-trade"],
      primaryIntent:
        "how to decide what a settlement produces imports and exports",
      intentAliases: [
        "settlement trade goods production surplus imports exports",
        "what should a fantasy town produce and trade",
        "how to give an rpg settlement an economy",
      ],
      uniqueValue:
        "A six-step method deriving a settlement ledger (production, surplus, imports, exports) from ground, hands, tools, neighbours, and rulers, with a mining-town worked example and named dependencies.",
      userJob: "create",
      relatedIntents: [
        "answer-believable-fantasy-economy",
        "generator-settlement",
        "generator-world",
        "generator-faction",
      ],
    },
    seo: {
      title: "How Do I Decide a Settlement's Trade Goods? | Codex Cryptica",
      description:
        "Derive what a settlement produces, imports, and exports from land, skills, routes, and rulers, with a worked mining-town ledger.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-decide-what-a-settlement-produces-imports-and-exports.jpg",
      imageAlt:
        "A hillside mining town with a smelter, ore carts, and a laden pack train descending a mountain track",
    },
  };
