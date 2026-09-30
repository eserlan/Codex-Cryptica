import type { AnswerConfigInput } from "../schema";

export const howDoITurnEconomicPressuresIntoRpgAdventureHooks: AnswerConfigInput =
  {
    slug: "how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
    category: "session-prep",
    publishedAt: "2026-09-27",
    question: "How do I turn economic pressures into RPG adventure hooks?",
    kind: "how-to",
    shortAnswer:
      "Convert any economic pressure into a hook by naming who gains and who pays, giving each side a response the party can observe, letting those responses collide over something both sides need, and leaving the party a clear way in with more than one employer to choose between. A shortage, a new route, or a blocked pass becomes playable the moment two interested groups pull in opposite directions and either of them would pay the party to tip the balance.",
    sections: [
      {
        kind: "prose",
        heading: "Hooks that prescribe a plot get refused",
        paragraphs: [
          "Economic hooks often arrive as assignments with one correct answer: escort this caravan, clear that road, deliver this shipment. Competent players sense the single track and either follow it dutifully or swerve off entirely, and both outcomes waste the pressure behind the errand. The economy was only set dressing for a task someone else had already solved.",
          "A situation behaves differently from an assignment. Two groups want incompatible things, both have reasons the party can grasp in a minute, and neither can finish the job alone. The players choose whom to help, whether to play both sides, or what third option the groups missed. The pressure supplies the stakes; the table supplies the plan.",
        ],
      },
      {
        kind: "list",
        heading: "Five steps from pressure to situation",
        intro:
          "Run any pressure from the earlier answers in this cluster through these steps:",
        items: [
          {
            term: "Name the pressure",
            text: "Take one line from your ledger, route, or shortage: the pass is held, the harbour dues rose, the charcoal stopped coming, the new road steals carriers. The pressure should already be visible in prices, queues, or closures before the hook begins.",
          },
          {
            term: "Split winners from losers",
            text: "List who gains while it lasts and who bleeds: the smugglers prosper while the staple guild starves, the road town booms while the harbour town empties. If everyone suffers equally there is no conflict yet, only weather, so look harder for the one party quietly profiting.",
          },
          {
            term: "Give each side a response",
            text: "Decide what each side already does about it: the guild hires guards for its remaining hulls, the smugglers recruit porters, the bypassed town offers hazard pay, the profiteers buy up stored stock. Responses in motion beat plans on paper, because the party meets people mid-action.",
          },
          {
            term: "Collide them over one thing",
            text: "Aim both responses at the same narrow prize: the last bonded store, the only pilot who knows the reef passage, the single passable week before snow, the charter vote that decides the toll. One prize with two claimants is the whole conflict; everything else is background.",
          },
          {
            term: "Open two doors",
            text: "Give the party a way in through each side: both claimants hire, both have something the party already wants, or both threaten something the party protects. Two doors keep the choice genuine. A single employer with a fixed fee is an assignment again, however well dressed.",
          },
        ],
        outro:
          "Write the result as interests, not scenes: who wants what, what they offer, what they will do if refused. Scenes follow from those lines wherever the party knocks.",
      },
      {
        kind: "example",
        heading: "Worked example: the blocked pass and two more in brief",
        paragraphs: [
          "The Grey Steppe pass is held by deserters, so Kettlebeck iron cannot reach the lowland forges and lowland grain cannot climb back up. Both towns from the earlier cluster answers now pull at the same party.",
        ],
        items: [
          {
            term: "The full situation",
            text: "The mine owners offer good coin for guards to force a convoy through before snow, and quietly add a bonus for dealing with the deserters permanently. The lowland forge masters offer less coin but a share of every future shipment, plus grain on credit to any crew that opens the pass without bloodshed, since dead deserters bring reprisals down on carriers. The deserters themselves send word that they will take a toll like any guild and keep the road safer than the guild ever did. Three doors, three incompatible ideas of what open means.",
          },
          {
            term: "New road, dying town",
            text: "Halrow's repaired road prospers while Vennport empties. Vennport's guild pays for proof the road is unsafe: witnesses, wrecked wagons, frightened carriers. Halrow pays for escorts and counterspies. The prize is the carriers' confidence, and the party decides which town's story the road tells.",
          },
          {
            term: "A seam found under disputed ground",
            text: "A rich ore seam surfaces where two charters overlap. Both holders hire assay guards, witnesses, and swords in that order. The prize is the assay result and the hands that hold it overnight. Whoever the party protects owns the morning.",
          },
          {
            term: "Why it works",
            text: "Each case reuses pressure the table already believes, splits it into winners and losers with observable responses, aims both at one prize, and opens at least two doors. Nothing prescribes what the party should do, yet everything tells them what doing nothing costs.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Interests first, timetables second",
        paragraphs: [
          "Once the doors are open, give each side a short timetable of what happens without the party: the convoy leaves on the full moon guarded or not, the guild vote falls on the assize date, the bonded store runs out within the fortnight. Timetables turn refusal into a consequence rather than a pause, because the world keeps spending while the players deliberate.",
          "Keep every timetable visible through the same signs the earlier answers use: hiring posters, lengthening queues, closed shutters, riders asking questions. The players should be able to feel the week running out without a single whispered briefing. When they act, cross one line off each affected timetable and write the next response the same evening, while the outcome is still warm.",
        ],
      },
      {
        kind: "checklist",
        heading: "Before the hook reaches the table",
        intro: "Confirm the situation is open, not scripted:",
        items: [
          "Is the underlying pressure already visible in prices, queues, closures, or talk?",
          "Can you name one winner and one loser, with the winner gaining something concrete?",
          "Is each side already doing something the party could witness this session?",
          "Do both responses aim at the same narrow prize?",
          "Are there at least two doors in, through different employers or threatened interests?",
          "Do you know what each side does next if the party walks away?",
        ],
      },
    ],
    codexConnection: {
      heading: "Holding every claimant and timetable together",
      paragraphs: [
        "A capstone situation juggles the most notes in the cluster: pressures, winners, losers, prizes, doors, and timetables, each attached to people and places the party may visit in any order. Memory alone drops threads by the second session. Codex Cryptica holds claimants, their offers, and their deadlines as connected entities, so whichever door the party opens, the rest of the situation stays aligned behind it.",
        "The faction generator drafts each side's wants and means in minutes, the rumour generator spreads competing stories about the prize, and the settlement generator keeps the towns showing the strain. The five steps above decide what the pressure means and who pays the party to resolve it.",
      ],
      linkText: "Try the faction generator",
      href: "/generators/faction",
    },
    relatedTools: [
      {
        title: "Faction generator",
        description:
          "Draft each side of the conflict with wants, means, and someone worth meeting.",
        href: "/generators/faction",
      },
      {
        title: "Quest hook generator",
        description:
          "Turn a claimant's offer into a hook with a clear way in and room to manoeuvre.",
        href: "/tools/quest-hook-generator",
      },
      {
        title: "Settlement generator",
        description:
          "Keep the pressured towns showing queues, closures, and hiring posters.",
        href: "/generators/settlement",
      },
      {
        title: "Rumour generator",
        description:
          "Let each side's version of the prize travel ahead of the party.",
        href: "/generators/rumour",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for fantasy worldbuilding",
        description:
          "Keep pressures, claimants, prizes, and deadlines connected across a campaign.",
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
      "how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
      "how-do-you-create-quest-hooks-without-railroading",
      "what-can-players-actually-buy-and-sell-in-a-fantasy-settlement",
    "how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
  ],
    discovery: {
      id: "answer-economic-pressures-adventure-hooks",
      parentCluster: "economy-trade",
      clusters: ["economy-trade"],
      primaryIntent: "how to turn economic pressures into rpg adventure hooks",
      intentAliases: [
        "economy based adventure hooks for rpgs",
        "turn trade disputes into quests",
        "economic conflict adventure ideas tabletop",
      ],
      uniqueValue:
        "A five-step conversion (pressure, winners and losers, responses, collision, two doors) that turns cluster pressures into open situations with timetables, closing with four worked cases.",
      userJob: "create",
      relatedIntents: [
        "answer-believable-fantasy-economy",
        "answer-settlement-production-imports-exports",
        "answer-trade-routes-shape-cities-kingdoms",
        "answer-scarcity-shortages-prices-conflict",
        "generator-faction",
        "for-economy-trade",
      ],
    },
    seo: {
      title: "How Do I Turn Economic Pressures into Hooks? | Codex Cryptica",
      description:
        "Convert shortages, tolls, and blocked routes into open adventure situations with winners, losers, prizes, and two doors in.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-turn-economic-pressures-into-rpg-adventure-hooks.jpg",
      imageAlt:
        "A divided mountain pass with a guarded convoy on one trail and rival camps watching from opposite ridges",
    },
  };
