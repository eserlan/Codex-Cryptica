import type { AnswerConfigInput } from "../schema";

export const howDoScarcityAndShortagesAffectPricesAndConflictInAnRpgWorld: AnswerConfigInput =
  {
    slug: "how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
    category: "session-prep",
    publishedAt: "2026-09-27",
    question:
      "How do scarcity and shortages affect prices and conflict in an RPG world?",
    kind: "framework",
    shortAnswer:
      "Run scarcity as a short chain: name what is missing and why, decide who cannot get it first, then let each affected group respond in character through dearer prices, rationing, hoarding, substitutes, theft, or smuggling, until two groups want the same dwindling stock and conflict follows. Players feel a shortage through changed behaviour and competing claims at the table, not through an inflation formula, so track who has the goods and who is angry rather than tracking percentages.",
    sections: [
      {
        kind: "prose",
        heading: "Raising prices is only the first hour of a shortage",
        paragraphs: [
          "The default GM move when goods run short is to double the price and continue as before. It reads as a tax rather than a crisis: the party pays more, grumbles, and moves on, while the town behaves exactly as it did when shelves were full. Nothing about the shortage touches anyone except through coin.",
          "Real pressure changes conduct before it changes arithmetic. Bakers shorten loaves and blame millers, guards start checking carts, neighbours report hoarders, a temple kitchen lengthens its queue, and someone the party knows begins selling from an alley. Each response has an owner with a motive, which means each one can be questioned, bribed, threatened, or aided. That is what turns a missing good into play instead of a surcharge.",
        ],
      },
      {
        kind: "list",
        heading: "Five links from a missing good to open conflict",
        intro:
          "Trace these for one scarce thing at a time. One line each is enough to run a session:",
        items: [
          {
            term: "What is missing, and why",
            text: "Name the good and the single cause: charcoal because a monster den closed the woods road, grain after a wet harvest, iron bars while the pass is held. One cause keeps the shortage legible; three causes turn it into weather nobody can act on.",
          },
          {
            term: "Who goes without first",
            text: "Shortages never land evenly. The poor lose bread before the rich lose pastries, and the smith without stored stock idles before the guild master with a full yard. Decide the order of pain, because the first to suffer are the first to act.",
          },
          {
            term: "How behaviour changes",
            text: "Give each affected group its characteristic response: the council rations, merchants hoard against dearer weeks, cooks switch to substitutes, porters steal from bonded stores, carriers smuggle past the guards. Different responses from different groups is what makes the shortage visible from several angles at once.",
          },
          {
            term: "Where claims collide",
            text: "Find the two groups whose responses need the same stock: the smiths who need charcoal against the householders who burn it for heat, the garrison requisitioning grain the bakers already promised. Shared want with separate owners is the spark; write down who confronts whom and over which pile.",
          },
          {
            term: "What the party can see",
            text: "Translate every link into something observable without exposition: a shorter loaf, a closed smithy, a queue, a new checkpoint, a friend selling ration tokens, a brawl at the wood yard. If a link has no visible sign, the players cannot engage with it, so it may as well not exist.",
          },
        ],
        outro:
          "Keep numbers impressionistic throughout. Dearer, short, closed, queued, and guarded carry the whole effect; exact percentages add bookkeeping without adding decisions.",
      },
      {
        kind: "example",
        heading: "Worked example: Alderford runs short of charcoal",
        paragraphs: [
          "Alderford is a walled market town whose smiths, bakers, and householders all burn charcoal from the surrounding woods. A monster den on the woods road has stopped the burners' carts for a fortnight.",
        ],
        items: [
          {
            term: "Who goes without first",
            text: "Householders feel it first as cold hearths, then the bakers whose ovens eat fuel all day, then the smiths, who have small private stores and work shorter days before closing their shutters. The garrison, with its own contracted supply, feels nothing yet, which everyone else has noticed.",
          },
          {
            term: "The responses diverge",
            text: "The council rations sales to two sacks per household and posts guards at the wood yard. Two merchants stop selling openly and wait for dearer days. Bakers switch part of their firing to peat, which smokes and sours tempers. A porter gang starts siphoning from bonded garrison stock, and a burner crew offers night deliveries past the checkpoint for triple price.",
          },
          {
            term: "Claims collide",
            text: "The smiths' guild demands the council release bonded stock to keep the forges lit and the town's tools coming. The householders demand the same stock for heat as nights turn cold. The council cannot satisfy both, so it dithers, and both sides start hiring: the guild wants the den cleared on its terms, the householders want the garrison's pile opened first.",
          },
          {
            term: "Why it works",
            text: "Prices rose, but nobody at the table cares about the price; they care that the smith they like has closed, the baker blames the council, the guards search their cart, and two groups they know both claim the same pile. Every link produced a person with a demand, which gives the party several doors into the same crisis.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Keep the arithmetic light and the owners heavy",
        paragraphs: [
          "Resist building a price model with stages and multipliers. A three-word scale per good (plentiful, tight, scarce) plus one visible sign each is enough to run a shortage across sessions, and it survives contact with player improvisation far better than a table of figures. When the party clears the den or opens a new supply, move the marker back and show the relief the same way: longer loaves, open shutters, a shorter queue.",
          "Put the bookkeeping into owners instead. One line per claimant (what they need, what they hold, what they will do next) tells you who acts between sessions and who approaches the party first. The faction facing the fastest loss moves first and offers most, which means the shortage recruits its own adventure party without any hook being written.",
        ],
      },
      {
        kind: "checklist",
        heading: "Before the shortage reaches the table",
        intro: "For each scarce good, confirm:",
        items: [
          "Can you name the single cause in one sentence the party could verify?",
          "Do you know who goes without first, second, and last?",
          "Does each affected group have its own characteristic response, not just higher prices?",
          "Which two groups need the same dwindling stock, and where do they confront each other?",
          "Is every link visible as a changed price, queue, closure, checkpoint, or face the party knows?",
          "Which claimant will approach the party first, and what can they offer?",
        ],
      },
    ],
    codexConnection: {
      heading: "Tracking claimants while the pile shrinks",
      paragraphs: [
        "A shortage is easy to start and hard to keep straight, because every session moves several markers at once: who holds stock, who has switched to substitutes, whose patience has run out. Prose notes blur those positions within a fortnight of game time. Codex Cryptica holds each claimant as a connected entity with its stock, its wants, and its rivals, so the state of the shortage is readable at a glance when the party returns.",
        "The faction generator is the fastest route to those claimants: a guild with full yards, a council with a bonded pile, a crew with night deliveries. The chain above decides what they fight over and who reaches the party first.",
      ],
      linkText: "Try the faction generator",
      href: "/generators/faction",
    },
    relatedTools: [
      {
        title: "Faction generator",
        description:
          "Create the guilds, councils, and crews whose competing claims drive the shortage.",
        href: "/generators/faction",
      },
      {
        title: "Settlement generator",
        description:
          "Ground the shortage in a town whose stores, queues, and checkpoints can show it.",
        href: "/generators/settlement",
      },
      {
        title: "Rumour generator",
        description:
          "Spread conflicting stories about hoards, substitutes, and who caused the lack.",
        href: "/generators/rumour",
      },
      {
        title: "World generator",
        description:
          "Name the alternative sources and distant suppliers the party might seek out.",
        href: "/generators/world",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for fantasy worldbuilding",
        description:
          "Keep shortages, stock holders, and competing claims connected across a campaign.",
        href: "/for/fantasy-worldbuilding",
      },
    ],
    relatedAnswers: [
      "how-do-i-build-a-believable-economy-for-a-fantasy-world",
      "how-do-i-decide-what-a-settlement-produces-imports-and-exports",
      "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
      "how-do-you-create-a-fantasy-faction",
      "how-to-create-rumours-for-a-fantasy-town",
      "how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
    ],
    discovery: {
      id: "answer-scarcity-shortages-prices-conflict",
      parentCluster: "economy-trade",
      clusters: ["economy-trade"],
      primaryIntent:
        "how scarcity and shortages affect prices and conflict in an rpg world",
      intentAliases: [
        "rpg shortage price rises faction conflict",
        "how to run scarcity in a fantasy campaign",
        "fantasy world shortages effects on trade",
      ],
      uniqueValue:
        "A five-link method (missing good, order of pain, behaviour responses, colliding claims, visible signs) for running shortages through competing groups rather than price maths, with a charcoal-crisis worked example.",
      userJob: "understand",
      relatedIntents: [
        "answer-believable-fantasy-economy",
        "answer-settlement-production-imports-exports",
        "answer-trade-routes-shape-cities-kingdoms",
        "generator-faction",
        "generator-settlement",
      ],
    },
    seo: {
      title: "How Do Scarcity and Shortages Affect Prices? | Codex Cryptica",
      description:
        "Run RPG shortages beyond higher prices: rationing, hoarding, substitutes, smuggling, and colliding claims, with a worked example.",
      image:
        "https://assets.codexcryptica.com/og/how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world.jpg",
      imageAlt:
        "A market town wood yard with guarded fuel stores, a lengthening queue, and closed smithy shutters",
    },
  };
