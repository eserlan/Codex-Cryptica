import type { AnswerConfigInput } from "../schema";

export const howDoScarcityAndShortagesAffectPricesAndConflictInAnRpgWorld: AnswerConfigInput =
  {
    slug: "how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
    category: "worldbuilding",
    publishedAt: "2026-09-27",
    question:
      "How do scarcity and shortages affect prices and conflict in an RPG world?",
    kind: "framework",
    shortAnswer:
      "Run scarcity as a short chain: name what is missing and why, decide who loses access first, then let each affected group respond through changed prices or terms, rationing, conservation, substitutes, redistribution, migration, or smuggling. Scarcity changes access; changed access forces responses; incompatible responses can create conflict. Players feel a shortage through changed behaviour and visible pressure, not through an inflation formula, so track who holds stock, who needs it, and who can act rather than tracking percentages.",
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
        heading: "Five links from a missing good to visible pressure",
        intro:
          "Trace these for one scarce thing at a time. One line each is enough to run a session:",
        items: [
          {
            term: "What is missing, and why",
            text: "Name the good and one primary cause the players can understand: charcoal because a monster den closed the woods road, grain after a wet harvest, iron bars while the pass is held. Add secondary causes when they create useful choices, such as requisition alongside a poor harvest. Keep the shortage legible without making it simpler than the world around it.",
          },
          {
            term: "Who loses access first",
            text: "Shortages never land evenly. Ask who loses access first and who is protected longest, then why: income matters, but so do contracts, ration priority, military requisition, location, stockpiles, credit, guild ties, and political favour. The people who feel the shortage first may have the least power to respond; a council, guild, army, or wealthy merchant may be able to act sooner.",
          },
          {
            term: "How behaviour changes",
            text: "Give each affected group a plausible response: conserve, ration, redistribute, bargain, import from farther away, change production, switch to substitutes, migrate, hoard, or smuggle. Different responses make the shortage visible from several angles; they need not lead to violence.",
          },
          {
            term: "Where claims collide",
            text: "Find responses that cannot all be satisfied: smiths need charcoal for tools while householders need it for heat, or the garrison requisitions grain the bakers already promised. They might bargain, share, or accept limits; open conflict becomes likely when their claims stay incompatible and someone chooses to enforce one over another. Note who decides and what is at stake.",
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
            term: "Who loses access first",
            text: "Householders feel it first as cold hearths, then the bakers whose ovens eat fuel all day, then the smiths, who have small private stores and work shorter days before closing their shutters. The garrison, with its own contracted supply, feels nothing yet, which everyone else has noticed. Why is it protected while households freeze and workshops close: a prior contract, a defence priority, a strategic reserve, or corruption? The allocation rule is a question of power, not just logistics.",
          },
          {
            term: "The responses diverge",
            text: "The council rations sales to two sacks per household and posts guards at the wood yard. Two merchants stop selling openly and wait for dearer days. Bakers switch part of their firing to peat, which smokes and sours tempers. A porter gang starts siphoning from bonded garrison stock, and a burner crew offers night deliveries past the checkpoint for triple price. The town might also conserve fuel or negotiate a release from the garrison stores.",
          },
          {
            term: "Claims collide",
            text: "The smiths' guild demands the council release bonded stock to keep the forges lit and the town's tools coming. The householders demand the same stock for heat as nights turn cold. The council could negotiate a split, reduce use, or ask for outside supplies. If it protects the garrison's contract instead, the guild and householders may organise against that decision: the guild wants the den cleared on its terms, while the householders want the garrison's pile opened first.",
          },
          {
            term: "Why it works",
            text: "Prices rose, but price is only one term of access. The party sees a smith they like close, a baker blame the council, guards search their cart, and two groups they know make claims on the same pile. The council could negotiate a schedule or redistribute stock; if it protects one claim at another's expense, the pressure may turn into open conflict. Every link gives the party people and choices to engage with.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Keep the arithmetic light and the owners heavy",
        paragraphs: [
          "Resist building a price model with stages and multipliers. Scarcity changes the terms of access, and price is only one of them: quantity, quality, waiting time, ration size, eligibility, payment terms, favours, substitutes, and enforcement can all change. A three-word scale per good (plentiful, tight, scarce) plus one visible sign each is enough to run a shortage across sessions. Recovery can come from clearing the den or opening a new supply, but also from lower demand, accepted substitutes, stable rationing, released stocks, changed production, a new supplier, a turning season, or a lifted restriction. Show the relief through longer loaves, open shutters, or a shorter queue.",
          "Put the bookkeeping into owners instead. One line per claimant — what they need, what they hold, what they can do, and how urgent it is — tells you who may act between sessions and who might approach the party first. Urgency and capacity differ: a household may need change fastest but have little leverage, while a council or guild can act early to protect its future position. That gap gives the party people to help, persuade, or challenge.",
        ],
      },
      {
        kind: "checklist",
        heading: "Before the shortage reaches the table",
        intro: "For each scarce good, confirm:",
        items: [
          "Can you name one primary cause the party could understand, with any useful secondary causes?",
          "Who loses access first, who is protected longest, and why?",
          "Does each affected group have its own characteristic response, not just higher prices?",
          "Which groups' responses are incompatible, and could they bargain, adapt, or cooperate before conflict?",
          "Is every link visible as changed terms, a queue, closure, checkpoint, or face the party knows?",
          "Who needs change most urgently, who has capacity to act, and what can each do or offer?",
        ],
      },
    ],
    codexConnection: {
      heading: "Tracking claimants while the pile shrinks",
      paragraphs: [
        "A shortage is easy to start and hard to keep straight, because every session moves several markers at once: who holds stock, who has switched to substitutes, whose patience has run out. Prose notes blur those positions within a fortnight of game time. Codex Cryptica holds each claimant as a connected entity with its stock, its wants, and its rivals, so the state of the shortage is readable at a glance when the party returns.",
        "The faction generator is the fastest route to those claimants: a guild with full yards, a council with a bonded pile, a crew with night deliveries. The chain above shows what they need, what they can do, and where their responses might align or collide.",
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
      "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
      "how-do-you-create-a-fantasy-faction",
      "how-to-create-rumours-for-a-fantasy-town",
      "how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
      "what-can-players-actually-buy-and-sell-in-a-fantasy-settlement",
      "how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
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
        "A five-link method (missing good, access, behaviour responses, competing claims, visible signs) for running shortages through group responses rather than price maths, with a charcoal-crisis worked example.",
      userJob: "understand",
      relatedIntents: [
        "answer-believable-fantasy-economy",
        "answer-settlement-production-imports-exports",
        "answer-trade-routes-shape-cities-kingdoms",
        "generator-faction",
        "generator-settlement",
        "for-economy-trade",
      ],
    },
    seo: {
      title: "How Do Scarcity and Shortages Affect Prices? | Codex Cryptica",
      description:
        "Run RPG shortages beyond higher prices: changing access, rationing, substitutes, competing responses, and visible pressure, with a worked example.",
      image:
        "https://assets.codexcryptica.com/og/how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world.jpg",
      imageAlt:
        "A market town wood yard with guarded fuel stores, a lengthening queue, and closed smithy shutters",
    },
  };
