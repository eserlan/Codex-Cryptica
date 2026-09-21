import type { AnswerConfigInput } from "../schema";

export const whatRpgShouldIPlayForInvestigativeHorror: AnswerConfigInput = {
  slug: "what-rpg-should-i-play-for-investigative-horror",
  category: "getting-started",
  publishedAt: "2026-09-21",
  question: "What RPG should I play for investigative horror?",
  kind: "comparison",
  shortAnswer:
    "The right investigative horror system depends on the investigation your group wants. For classic cosmic horror with fragile researchers, Call of Cthulhu. For modern conspiracy horror played by competent federal agents, Delta Green. For folklore mysteries in a mythic Scandinavia, Vaesen. For investigations that cannot stall on a missed roll, Trail of Cthulhu. For collaborative mysteries where even the GM discovers the solution in play, Brindlewood Bay.",
  sections: [
    {
      kind: "prose",
      heading: "Start from the investigation your group wants",
      paragraphs: [
        "Groups who ask for investigative horror are usually picturing different evenings. One table wants ordinary people finding things humanity was not meant to know, and paying for it. Another wants trained professionals containing something unnatural before the public learns it exists. A third wants candle-lit folklore, village secrets, and monsters with motives the party can almost sympathise with. The system decides which of those evenings the rules produce, so name the investigation before comparing books.",
        "Three practical questions separate the games below. First, who are the investigators: fragile amateurs or capable professionals. Second, what happens when a clue roll fails: does the trail go cold, or do the rules protect the flow of information. Third, how much horror the table wants aimed at the characters: slow dread that erodes them, or sharp shocks that can end them. Answer those with the group and the list below narrows quickly.",
      ],
    },
    {
      kind: "list",
      heading: "If you want...",
      intro:
        "Each of these produces a different kind of investigative horror. Find the row that describes your group's best evenings.",
      items: [
        {
          term: "Classic cosmic-horror investigation",
          text: "Call of Cthulhu. Chaosium's long-running game casts the party as 1920s antiquarians, journalists, doctors and dilettantes facing the Mythos with percentile skills and a Sanity track that records what the truth costs. Research, library work and interviews drive play, combat is something to avoid, and published campaigns are famously long and lethal. Pick this when the group wants fragile investigators and the weight of tradition behind them.",
        },
        {
          term: "Modern conspiracy and federal-agent horror",
          text: "Delta Green. Arc Dream's game puts the party inside an illegal government conspiracy: competent agents with tradecraft skills who exploit their positions to cover up unnatural incursions. Bonds with family and friends act as the Sanity safety net and wear down across operations, while the Lethality rating makes heavy weapons brutally final for anyone nearby. Play alternates between missions and Home scenes where ordinary life frays. Pick this for X-Files pressure with genuine consequences.",
        },
        {
          term: "Folklore and monster investigation",
          text: "Vaesen. Free League's Nordic horror game sets the party as members of a Society investigating creatures from Scandinavian folklore: church grim, changelings, water spirits with comprehensible motives. It runs on the Year Zero Engine's dice pools, structures each case as a Mystery with scenes that escalate toward a confrontation, and gives the party a shared headquarters to develop between cases. Pick this when the group wants monsters it can understand rather than truths that destroy understanding.",
        },
        {
          term: "Investigations that cannot stall on a missed roll",
          text: "Trail of Cthulhu. Pelgrane Press built this 1930s game on the GUMSHOE system, which starts from one design promise: finding a core clue is never gated behind a die roll, so the challenge sits in interpreting clues rather than discovering them. Investigative spends buy extra detail, while the split between Stability (short-term composure) and Sanity (long-term grasp on reality) tracks two different kinds of damage. Purist and Pulp modes tune the lethality. Pick this when the group has been burned by dead-end mysteries.",
        },
        {
          term: "Collaborative mystery-first horror",
          text: "Brindlewood Bay. Jason Cordova's cosy mystery game casts the players as elderly amateur sleuths in a New England town, and it never pre-solves the murder: the GM prepares clues without fixing a culprit, and the Theorize move lets the table assemble its own solution from what play produced. A slow-burn Dark Conspiracy thread adds cosmic horror across sessions for groups that want it. Pick this when the group would rather build the answer together than guess the answer the GM wrote down.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "What should the investigation mechanics do",
      paragraphs: [
        "Every investigative system has to answer one design question: who guarantees the clue reaches the table. Traditional percentile systems leave it to the dice, which means a failed Library Use roll can quietly bury the one lead the session needed. Groups that enjoy that tension call it stakes; groups that have sat through a stalled evening call it a design flaw. Know which reaction your table has before choosing.",
        "The games above answer differently. Trail of Cthulhu removes the question by rule: core clues arrive free, and points buy depth rather than access. Brindlewood Bay dissolves it from the other direction: with no pre-written solution, there is no required clue to miss, and the Theorize move turns scattered findings into a verdict the table owns. Call of Cthulhu and Delta Green keep the traditional roll, so the GM carries more responsibility for placing backup routes to the same truth. Vaesen sits between, with Mystery structures that schedule scenes and escalate pressure whether or not the party reads every sign correctly.",
      ],
    },
    {
      kind: "prose",
      heading: "How lethal should the horror be",
      paragraphs: [
        "Lethality in horror is a tone control, not a difficulty slider. Call of Cthulhu investigators are ordinary people, so a single confrontation can end a character the player spent weeks developing; the game expects replacements and says so. Delta Green agents are far more capable, yet the Lethality rules and the slow erosion of Bonds mean competence buys a longer fall rather than safety. Decide whether the table finds meaning in that arc or just frustration.",
        "The other three games offer gentler defaults with their own costs. Trail of Cthulhu's Pulp mode lets investigators survive what Purist mode would end, but survival still spends Stability the character may not recover. Vaesen characters are resilient society members, and the horror lands more through moral pressure and the countdown inside each Mystery than through body counts. Brindlewood Bay is the softest table here: elderly sleuths rarely die, and the price of a wrong theory is narrative rather than fatal, which suits groups that want dread without funerals.",
      ],
    },
    {
      kind: "example",
      heading: "One disappearance, three tables",
      paragraphs: [
        "A folklorist vanishes from a coastal town after mailing the party a sketch of something with too many joints. Three groups run the same premise in different systems.",
      ],
      items: [
        {
          term: "The classic table",
          text: "The party plays Call of Cthulhu. Evenings go to newspaper archives, uncomfortable interviews with the harbourmaster, and a night-time boat trip nobody wants to take. One investigator loses Sanity reading the folklorist's notes and spends the next session rationalising what she saw. The trail nearly dies on a failed roll until a backup lead, a blackmail letter the GM planted with a rival, puts it back on track.",
        },
        {
          term: "The clue-forward table",
          text: "The party plays Trail of Cthulhu in Purist mode. Every scene hands its core clue to whoever looks, so the evenings are spent arguing about what the sketch implies rather than hunting for the sketch itself. An Occult spend reveals the joint pattern matches a specific entity, and that knowledge costs Stability across the whole party. The session ends with the group knowing exactly what waits offshore and dreading the boat trip anyway.",
        },
        {
          term: "The collaborative table",
          text: "The party plays Brindlewood Bay. The GM prepares the town, the suspects and a pile of clues with no fixed answer. The sleuths gossip, snoop and collect contradictions, then the Theorize move lets them name the culprit and the motive their evidence best supports. The Dark Conspiracy thread suggests the folklorist found something older than a murderer, which becomes next session's hook.",
        },
        {
          term: "Why it works",
          text: "Nobody ranked the systems. Each table matched the premise to the investigation it enjoys: painstaking research with real risk, interpretation under pressure, or collective storytelling. The same disappearance produced three different evenings because the mechanics asked different questions.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you commit to a horror system",
      intro: "Work through these with the group before buying rulebooks:",
      items: [
        "Ask whether the table wants fragile amateurs or competent professionals, since that choice colours every session.",
        "Agree on what a failed clue roll should mean: a stalled trail, a costlier route, or something the rules prevent entirely.",
        "Check the lethality tolerance honestly, including how the group feels about replacing a developed character mid-campaign.",
        "Run a starter scenario or quickstart first; clue flow and Sanity pressure show up in play, not in reviews.",
        "Confirm the GM's prep appetite, since pre-solved mysteries demand careful clue placement while collaborative ones demand improvisation.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Call of Cthulhu",
      rationale:
        "Percentile Basic Roleplaying with a Sanity mechanic that measures the investigator's erosion on contact with the Mythos.",
      href: "https://www.chaosium.com",
    },
    {
      system: "Delta Green",
      rationale:
        "Bonds that regulate Sanity through Home scenes, paired with a Lethality rating that makes heavy combat brutally final.",
      href: "https://www.delta-green.com",
    },
    {
      system: "Trail of Cthulhu",
      rationale:
        "GUMSHOE core clues that reach the table without a roll, plus separate Stability and Sanity tracks for short-term and long-term harm.",
      href: "https://pelgranepress.com",
    },
    {
      system: "Brindlewood Bay",
      rationale:
        "The Theorize move resolves mysteries the GM never pre-solved, shifting play from guessing to collaborative construction.",
      href: "https://www.gauntlet-rpg.com/brindlewood-bay.html",
    },
  ],
  codexConnection: {
    heading: "Stock the mystery once the system is chosen",
    paragraphs: [
      "Codex Cryptica does not run investigations or automate rules for any of these systems. What it helps with is the material around the mystery: the rumours that point at the folklorist's house, the secret society that mailed the sketch, and the NPCs whose motives contradict each other.",
      "Generate those pieces as linked material, so a rumour, its source and the faction behind it reference each other from the first session, whatever system the group picks.",
    ],
    linkText: "Generate mystery rumours",
    href: "/generators/rumour",
  },
  relatedTools: [
    {
      title: "Rumour Generator",
      description:
        "Whispers and hearsay that point the party at people and places worth investigating.",
      href: "/generators/rumour",
    },
    {
      title: "Secret Society Generator",
      description:
        "Hidden organisations with motives, methods and ranks for conspiracy horror.",
      href: "/generators/secret-society",
    },
    {
      title: "Faction Generator",
      description:
        "Groups with goals and resources that can drive or obstruct an investigation.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Call of Cthulhu",
      description:
        "Notes and worldbuilding for groups running classic cosmic-horror investigation.",
      href: "/for/call-of-cthulhu",
    },
    {
      title: "Codex Cryptica for Delta Green",
      description:
        "Material for modern conspiracy horror and federal-agent campaigns.",
      href: "/for/delta-green",
    },
    {
      title: "Codex Cryptica for Cosmic Horror",
      description:
        "Broader support for dread, unnatural entities and slow-burn campaigns.",
      href: "/for/cosmic-horror",
    },
  ],
  relatedAnswers: [
    "what-rpg-should-i-use-for-tactical-combat",
    "what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
    "what-rpg-system-should-we-try-instead-of-dnd",
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-you-generate-useful-rpg-rumours",
    "how-do-you-create-a-secret-society-for-an-rpg-campaign",
  ],
  discovery: {
    id: "answer-investigative-horror-system-selection",
    parentCluster: "rpg-system-selection",
    clusters: ["rpg-system-selection"],
    primaryIntent: "choose a tabletop rpg system for investigative horror",
    intentAliases: [
      "best rpg for investigative horror",
      "tabletop rpg for mystery and horror",
      "cosmic horror rpg system",
      "rpg for conspiracy investigation",
      "call of cthulhu alternatives for investigation",
      "horror rpg with good investigation mechanics",
    ],
    uniqueValue:
      "Matches five mechanically distinct systems to the investigation each produces, so a group picks by clue handling, lethality and horror tone rather than by popularity.",
    userJob: "evaluate",
    relatedIntents: [
      "answer-system-selection",
      "answer-tactical-combat-system-selection",
      "answer-run-mystery-without-railroading",
      "answer-conspiracy-campaign",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-tactical-combat-system-selection",
        reason:
          "Sibling vibe-to-system chooser for tactical combat; this page owns investigative-horror system choice and links across rather than repeating the pattern.",
      },
      {
        with: "answer-run-mystery-without-railroading",
        reason:
          "That page teaches GMs to run mysteries inside a chosen system; this one helps groups choose a system for investigative horror.",
      },
    ],
  },
  seo: {
    title: "What RPG should I play for investigative horror? | Codex Cryptica",
    description:
      "Pick an investigative horror RPG by clue handling, lethality and tone: Call of Cthulhu, Delta Green, Vaesen, Trail of Cthulhu or Brindlewood Bay.",
    image:
      "https://assets.codexcryptica.com/og/what-rpg-should-i-play-for-investigative-horror.jpg",
    imageAlt:
      "A candle-lit investigator's study with a red-string conspiracy board, a magnifying glass over an occult symbol, and a shadowy figure at a fogged window",
  },
};
