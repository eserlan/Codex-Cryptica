import type { AnswerConfigInput } from "../schema";

export const howShouldAFantasyAdventuringGuildHandleWagesDuesAndSharedExpenses: AnswerConfigInput =
  {
    slug: "how-should-a-fantasy-adventuring-guild-handle-wages-dues-and-shared-expenses",
    category: "worldbuilding",
    publishedAt: "2026-10-06",
    question:
      "How should a fantasy adventuring guild handle wages, dues, and shared expenses?",
    kind: "framework",
    shortAnswer:
      "Give your adventuring guild one clear money rule that fits its current pressure, not a supposedly correct historical percentage. Choose from fixed dues, a percentage of income, a cut of guild-arranged contracts, communal earnings with a modest stipend, or a hybrid, then set contribution rates as dials. A struggling hall might take around 20 to 40 percent of steady day-job wages and a larger share of guild contracts, pay every member a reliable living allowance, and hold the rest as a common fund for rent, food, gear, healing, burials, fines, dependants, and bad months.",
    sections: [
      {
        kind: "prose",
        heading: "Why adventuring income breaks ordinary pay",
        paragraphs: [
          "Ordinary wages in most fantasy settlements are small, regular, and predictable: a few coppers a day, paid for visible work, with the household able to plan around them. Adventuring income is the opposite. It arrives in lumps after weeks of nothing, varies wildly from a handful of coin to a chest of treasure, depends on danger and luck rather than steady labour, and often requires long recovery. That mismatch is why guild money so often causes arguments at the table.",
          "If the guild treats every member as if they earn the same way, friction follows. The town guard who works five days a week resents paying the same share as an adventurer who returns once a season with a sack of coin. The adventurer resents handing over a fixed fee when the last three expeditions returned nothing and the next might require paid healing. A good set of guild rules acknowledges both patterns and makes the trade explicit: stability for the irregular earner, and extra capacity for the steady earner, in return for a fair contribution to the hall they both need.",
          "The choice also shapes behaviour. What the guild charges, what it keeps, and what it hands back determines who joins, who stays, and what risks members are willing to take. A flat fee encourages coin-hungry risk taking to cover the cost. A high contract cut makes members avoid guild work and chase private jobs. A communal pot with a fixed allowance encourages caution and mutual support but can chafe anyone who brings home a windfall.",
        ],
      },
      {
        kind: "list",
        heading: "Five workable models and what each one changes",
        intro:
          "Pick one model as your guild's current rule. The right choice depends on whether the hall is rich or struggling, formal or loose, and whether you want tension around money to be quiet background or active plot. Each model changes culture, incentives, stability, and how the guild handles a member who suddenly earns big or earns nothing:",
        items: [
          {
            term: "Fixed membership dues",
            text: "Every member pays the same coin each month, often in advance, regardless of earnings. Simple to track and feels egalitarian, which suits a fraternal or civic guild that wants equality on paper. It strains low earners in bad months, lets high earners keep windfalls untouched, and produces thin reserves unless dues are high enough to hurt. Best for a stable hall with many steady workers and adventuring as a side line, not its core.",
          },
          {
            term: "Percentage of income contributions",
            text: "Every member gives a set share of whatever they earn, from any source, usually assessed monthly or quarterly. Feels fairer when incomes differ widely and automatically rises and falls with fortune. It requires honesty about earnings, invites under-reporting, and needs a trusted treasurer who can handle a season of near-zero income without panic. A struggling communal hall often lands around 20 to 40 percent of ordinary day-job wages as its working dial, with a higher share on guild-arranged bounties where the hall did the finding and negotiating.",
          },
          {
            term: "Guild takes a cut of contracts and bounties",
            text: "Membership itself costs little, but any job the guild arranges carries a cut taken at source, commonly around a third to a half for jobs that use the hall's name, contacts, and vetting. Private jobs found without guild help pay nothing extra. This model pushes members toward guild work when the hall is trusted and away from it when the cut feels steep. It gives the guild a direct incentive to find paying work, and members a reason to argue about which jobs really count as guild jobs.",
          },
          {
            term: "Communal income with fixed member stipends",
            text: "All earnings go into the common fund, then every full member receives the same modest living allowance plus board, lodging, and basic gear. Surplus stays with the guild as reserves and investment. Strong on solidarity, it removes haggling over each job and guarantees no one starves between jobs, but it dampens personal incentive to chase big scores and can breed resent after a large haul unless exceptional rewards are recognised with bonuses, extra leave, or a larger share of that specific job.",
          },
          {
            term: "Hybrid systems",
            text: "Most believable halls mix elements: a low fixed due that keeps the hall open, plus a contract cut on guild work, plus a small reserve funded by a percentage in good months. One practical dial for a small struggling guild is a modest monthly due that covers rent alone, 20 to 40 percent of ordinary wages swept into the common pot, 30 to 50 percent taken from guild-arranged contracts, and a fixed stipend that covers food, lodging, and mending so members can plan. Treat the exact numbers as levers for play, not as economic law, and move them when the guild's fortunes change.",
          },
        ],
        outro:
          "Whatever model you choose, write it as a sentence the players can quote: who pays what, when it is collected, and what they get back for it. If that sentence does not exist, the guild has no rule, only an argument waiting to happen.",
      },
      {
        kind: "prose",
        heading: "What the common fund actually pays for",
        paragraphs: [
          "The fund is not abstract profit. It is the reason the hall exists. Members tolerate dues because the hall turns irregular coin into reliable support: a roof that stays rented when no contracts come, food on the table between jobs, tools replaced without a whip-round, and help when injury or law takes someone out of work.",
          "Typical calls on the fund include headquarters rent and upkeep, firewood, water, and repairs; food and lodging for resident members and for injured members who cannot work; tools, rope, plain weapons, and basic equipment; healer fees, medicines, and recovery costs after a bad outing; burial and funeral expenses and a little coin for dependants; legal fees, fines, and bribes when a job annoys the watch or a patron; support for injured, retired, or widowed members and their households; and a reserve for bad months when no contracts pay. When you name these in play, the guild stops being a tax and becomes a household the players can care about.",
          "For a struggling hall, keep the fund visible. Let members see the ledger groan when the roof leaks, the healer charges extra, or the reserve drops below a month of wages. That visibility turns every contribution rule into a choice with weight: raise the contract cut and risk losing hunters to private work, or keep the cut low and postpone repairs.",
        ],
      },
      {
        kind: "list",
        heading: "Practical dials you can use at the table",
        intro:
          "Fantasy economies are not precise, so offer ranges the GM can move without pretending to know a correct price. Frame each number as a dial with an effect, not a fact:",
        items: [
          {
            term: "Ordinary wages",
            text: "For members with steady jobs such as guards, clerks, or artisans, a monthly contribution of about 20 to 40 percent into the common pot feels demanding but plausible for a communal hall that provides lodging, meals, and gear. Below 20 percent the hall struggles to cover rent without outside patronage. Above 40 percent members need a clear return, such as guaranteed meals and no extra charges for healing.",
          },
          {
            term: "Guild-arranged adventuring contracts",
            text: "For jobs the hall finds, vets, and negotiates, a larger share is accepted because the hall added real value. Many tables use around a third to a half of the coin from those contracts, with the remainder split among the team that took the risk. Members keep all of private work found without guild help, but lose access to guild healing, lodging, or legal cover for that job.",
          },
          {
            term: "Windfalls and irregular hauls",
            text: "Adventuring income arrives unevenly, so collecting monthly on paper earnings creates awkward debt in slow seasons. Instead, assess adventuring contributions per job or per season when the coin actually arrives. On a windfall, a hybrid hall might take its contract cut, then pay the team from the remainder and sweep a smaller share of the team payout into reserves. Agree in advance whether treasure counts as income or only contracted pay does.",
          },
          {
            term: "The allowance going back to members",
            text: "A communal or hybrid guild should pay a predictable stipend that covers a modest living standard, plus board or its equivalent in coin, so players can plan. Keep the allowance fixed for several months, even when contracts are thin. When reserves fall below about one to two months of stipends and rent, that is your signal in play to raise the cut, defer upkeep, seek patronage, or chase a paying job rather than a worthy cause.",
          },
          {
            term: "When to move the dials",
            text: "Move one dial when the guild's pressure changes: new rent, a large healer bill, a lost patron, a good season, or a death that leaves dependants. Announce the change in character from the treasurer or council, explain what the fund pays for this month, and let members vote, grumble, or volunteer for extra work. A rule that never moves under pressure feels like set dressing.",
          },
        ],
      },
      {
        kind: "example",
        heading:
          "Worked example: the Grey Lanterns, a struggling hall of twelve",
        paragraphs: [
          "The Grey Lanterns rent the upper floor of a riverside warehouse. Seven members work steady town jobs, five take to the field when contracts appear. The hall is behind on roof repairs, the reserve covers about three weeks of food and stipends, and the treasurer keeps a slate by the door so everyone sees the numbers.",
        ],
        items: [
          {
            term: "The muddled default",
            text: "The GM sets a flat 5 silver monthly due for everyone and says nothing else. The guard pays easily, the apprentice scribe struggles, and the field team argues after a 200 silver bounty about whether that counts as guild income. Treasure from a tomb found without a contract is undeclared. The hall has no rule for who pays the healer when a member is carried home, so the table negotiates it from scratch each time and resentment builds without ever producing play.",
          },
          {
            term: "The clear hybrid",
            text: "The GM replaces the flat fee with a written rule read aloud by the treasurer: every member with a steady wage contributes 30 percent of those wages to the common pot on payday, which covers rent, firewood, and a daily bowl and bed. Guild-arranged contracts pay 40 percent to the hall at source, with the remaining 60 percent split among the team; private work pays no cut but earns no guild healing or lodging for that job. Members with steady jobs keep the rest of their wages, and each member draws the same fixed stipend from the common pot. The first bounty of the season brings 180 silver: 72 silver goes to the hall, and the team keeps 108 silver split four ways. That bounty is not charged the 30 percent wage contribution a second time; each steady worker contributes from their actual day-job pay when it arrives. The slate shows rent, food, and the new reserve, and the next job appears with a note that the hall will waive its cut if the team clears the flooded cellar that is causing the repairs.",
          },
          {
            term: "Why it works",
            text: "Every coin now has an owner and a consequence the players can see. The 20 to 40 percent range and the 40 percent contract cut are presented as the Lanterns' current dials, not as universal truth, so the treasurer can credibly ask to move them when the roof finally fails. The stipend makes bad months survivable, which makes risky work a choice rather than desperation. The ledger becomes a prop for play: a blocked cistern is not just colour, it is the reason the next contract matters, and the players must decide whether to take a well-paid but unsavoury bounty to keep the hall afloat.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Set your guild's money rules before the next session",
        intro:
          "If time is short, lock these in now and refine later when pressure forces a change:",
        items: [
          "Name your current model in one sentence and who it suits: fixed dues, percentage, contract cut, communal stipend, or hybrid.",
          "Set two numbers as visible dials: the share of ordinary wages that goes to the fund, and the share the hall takes from contracts it arranges.",
          "Decide how windfalls and private jobs are treated, and whether treasure counts as income or only contracted pay does.",
          "Fix the stipend or allowance members receive back, and what it covers: meals, lodging, gear repair, healing, or coin.",
          "List what the fund actually pays for this season and show the reserve in weeks of stipends and rent, not in abstract totals.",
          "Name who collects, who keeps the ledger, and when members can vote to move a dial when the hall is under strain.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keeping the hall, its people, and its debts connected",
      paragraphs: [
        "A guild's money rule is only useful if the hall, its members, its patrons, and its obligations stay linked between sessions. When rent is late, the healer sends a bill, or the reserve thins, you want those pressures to surface next to the NPCs and factions the party already knows, not as an isolated ledger.",
        "Codex Cryptica keeps places, factions, NPCs, and notes as connected entities, so the guildhall, its treasurer, the town council that levies a fine, and the patron who offers coin can sit in the same graph. The faction and settlement generators are useful starting points for those neighbours, but the finance rule itself remains your call.",
      ],
      linkText: "Try the faction generator",
      href: "/generators/faction",
    },
    relatedTools: [
      {
        title: "Faction generator",
        description:
          "Sketch the guild's council, rivals, or patrons with motives and a place in town.",
        href: "/generators/faction",
      },
      {
        title: "Settlement generator",
        description:
          "Place the hall in a town with resources, rents, and neighbours who need its services.",
        href: "/generators/settlement",
      },
      {
        title: "NPC generator",
        description:
          "Create the treasurer, quartermaster, or healer who keeps the ledger and the gossip.",
        href: "/generators/npc",
      },
      {
        title: "World generator",
        description:
          "Shape the wider region that supplies contracts, patrons, and competing guilds.",
        href: "/generators/world",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for fantasy worldbuilding",
        description:
          "Keep regions, settlements, factions, and economic pressures connected across a campaign.",
        href: "/for/fantasy-worldbuilding",
      },
      {
        title: "TTRPG Economy & Trade",
        description:
          "Build believable prices, trade, scarcity, and wealth without simulating a whole economy.",
        href: "/for/economy-trade",
      },
    ],
    relatedAnswers: [
      "how-do-i-build-a-believable-economy-for-a-fantasy-world",
      "how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
      "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
      "how-do-i-decide-what-a-settlement-produces-imports-and-exports",
      "what-can-players-actually-buy-and-sell-in-a-fantasy-settlement",
      "how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
      "how-do-i-run-a-campaign-where-the-players-own-a-business",
      "how-do-you-create-a-fantasy-faction",
    ],
    discovery: {
      parentCluster: "economy-trade",
      clusters: ["economy-trade"],
      primaryIntent:
        "how should a fantasy adventuring guild handle wages dues and shared expenses",
      intentAliases: [
        "how does an adventurers guild make money",
        "how much should guild members contribute",
        "how do adventurers guilds pay their members",
        "what should guild dues look like in a fantasy rpg",
        "adventuring guild wages shared fund",
        "fantasy guild contribution and allowance system",
      ],
      uniqueValue:
        "Five table-ready guild finance models with practical 20 to 40 percent dials, a clear account of what the common fund pays for, and a struggling-hall worked example that ties money rules to visible play.",
      userJob: "understand",
      relatedIntents: [
        "answer-believable-fantasy-economy",
        "answer-scarcity-shortages-prices-conflict",
        "answer-trade-routes-shape-cities-kingdoms",
        "answer-settlement-production-imports-exports",
        "answer-settlement-market-buy-sell",
        "answer-economic-pressures-adventure-hooks",
        "answer-run-player-owned-business",
        "generator-faction",
        "generator-settlement",
        "for-economy-trade",
      ],
    },
    seo: {
      title:
        "How Should an Adventuring Guild Handle Wages and Dues? | Codex Cryptica",
      description:
        "Five guild finance models, practical 20 to 40 percent contribution dials, and what the common fund pays for, with a struggling-hall example.",
      image:
        "https://assets.codexcryptica.com/og/how-should-a-fantasy-adventuring-guild-handle-wages-dues-and-shared-expenses.jpg",
      imageAlt:
        "Adventurers gathered around a guild hall table counting coin and ledger by lamplight",
    },
  };
