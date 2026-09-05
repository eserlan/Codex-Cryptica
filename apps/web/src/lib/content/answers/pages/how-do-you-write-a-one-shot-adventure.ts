import type { AnswerConfigInput } from "../schema";

export const howDoYouWriteAOneShotAdventure: AnswerConfigInput = {
  slug: "how-do-you-write-a-one-shot-adventure",
  category: "session-prep",
  publishedAt: "2026-09-04",
  question: "How do you write a one-shot adventure?",
  kind: "framework",
  shortAnswer:
    "Design backward from a strict session time limit, using a four-beat structure: an immediate inciting incident, an investigative exploration scene, a high-stakes complication, and a decisive final confrontation. Build in at least one elastic middle encounter that can be expanded or cut entirely depending on the clock, so the party reaches the climax before the session ends.",
  sections: [
    {
      kind: "prose",
      heading: "The clock is your only true antagonist",
      paragraphs: [
        "Most one-shot adventures fail not because the plot is weak, but because the table runs out of time. When a Game Master writes a single-session adventure like a miniature campaign arc, the party invariably spends ninety minutes bantering in a tavern, forty minutes investigating an inconsequential side room, and then finds themselves facing a rushed, anticlimactic boss fight with ten minutes remaining before players need to leave.",
        "A one-shot needs real structural discipline. Every scene should either deliver information the party needs, force an immediate decision, or push the party directly toward the central conflict. Elastic pacing is what lands the adventure comfortably within a three- to four-hour table window.",
      ],
    },
    {
      kind: "list",
      heading: "The four-beat one-shot framework",
      intro:
        "Structure your single-session adventure around four core beats, allocating approximate table times for a standard three-hour session:",
      items: [
        {
          term: "Beat 1: The immediate catalyst (20 to 30 minutes)",
          text: "Skip the tavern prologue. Start the characters at the dungeon threshold, mid-ambush, or standing over the murder victim with the town watch pounding on the door. Give the players an unequivocal objective within the first five minutes.",
        },
        {
          term: "Beat 2: Exploration and discovery (40 to 50 minutes)",
          text: "Present two or three connected locations or social encounters where the party gathers necessary tools, clues, or allies. Avoid dead ends; every clue should point forward to the destination.",
        },
        {
          term: "Beat 3: The elastic complication (30 to 45 minutes)",
          text: "Introduce a sudden reversal, trap, or skirmish that alters the context of the final confrontation. This is your accordion encounter: expand it if the group is running fast, or drop it instantly if the clock is running short.",
        },
        {
          term: "Beat 4: The climax and resolution (45 to 60 minutes)",
          text: "Deliver a dramatic set-piece encounter with environmental hazards, distinct tactical options, and clear victory conditions. Allow ten minutes afterward for a satisfying denouement and epilogue.",
        },
      ],
      outro:
        "Designating Beat 3 as deliberately elastic protects the climax from being truncated.",
    },
    {
      kind: "list",
      heading: "Managing table pacing with elastic adjustments",
      intro:
        "Prepare dynamic pacing adjustments for each phase to maintain steady momentum against the clock:",
      items: [
        {
          term: "The Opening",
          text: "If running ahead of schedule, introduce rival NPCs or a skill challenge. If running behind, hand out the objective immediately and drop straight into the action.",
        },
        {
          term: "The Investigation",
          text: "If running ahead, add an interactive puzzle or moral dilemma. If running behind, provide the essential key on the very first successful check or social exchange.",
        },
        {
          term: "The Complication",
          text: "If running ahead, trigger an ambush by elite reinforcements that drains spell slots. If running behind, cut the skirmish entirely and have players find the aftermath.",
        },
        {
          term: "The Climax",
          text: "If running ahead, give the adversary environmental lair actions or hostage complications. If running behind, reduce minion numbers and focus purely on the primary objective.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked scenario: The Sunken Vault of Archmage Vane",
      paragraphs: [
        "Observe how applying an elastic four-beat design saves a three-hour convention one-shot from running over time.",
      ],
      items: [
        {
          term: "The rigid conventional prep",
          text: "The Game Master mapped eight rooms and wrote a twenty-minute opening speech from a patron noble in a hillside manor. At the table, the party spent seventy minutes roleplaying contract negotiations and an hour fighting giant crabs in room three. The session ran out of time before anyone found the inner vault door.",
        },
        {
          term: "The four-beat elastic structure",
          text: "The Game Master begins the session with the characters standing waist-deep in water at the vault entrance, iron portcullis already grinding shut behind them. Beat 1 gives them twenty minutes to decipher the layout. Beat 2 is a flooded library containing the cipher key. Beat 3 is an optional sentinel golem: if ninety minutes remain, the golem activates; if under sixty minutes remain, the golem lies dormant and sparking. Beat 4 is a ticking-clock puzzle encounter against the vault custodian as seawater pours from the ceiling. The game ends at the two-hour-and-fifty-minute mark with a dramatic escape.",
        },
        {
          term: "Why it works",
          text: "Starting in media res removed forty minutes of meandering exposition. Designating the sentinel golem as an elastic encounter gave the Game Master an emergency buffer to guarantee the group reached the dramatic finale.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "One-shot adventure preparation checklist",
      intro:
        "Verify your adventure document meets these operational requirements before running the game:",
      items: [
        "A single, unmistakable objective that can be summarised in one sentence.",
        "Pre-generated character options or clear character parameters tied to the premise.",
        "A maximum of four to five distinct scene locations or dungeon rooms.",
        "One explicitly designated accordion encounter that can be excised without breaking plot logic.",
        "Multiple clues or paths pointing toward the final confrontation to prevent dead ends.",
        "Clear failure stakes that still produce a definitive ending rather than a stalemate.",
      ],
    },
  ],
  codexConnection: {
    heading: "Building one-shot adventures in Codex Cryptica",
    paragraphs: [
      "Codex Cryptica makes designing and running one-shot sessions straightforward. Using the Adventure Generator and Dungeon Builder, you can roll up modular locations, immediate catalysts, and escalating complications in minutes.",
      "Track your elastic encounters on an interactive board, so backup routes and cuttable skirmishes are ready at a single glance during play.",
    ],
    linkText: "Build one-shot dungeons with the Dungeon Builder",
    href: "/generators/dungeon-generator",
  },
  relatedTools: [
    {
      title: "Adventure generator",
      description:
        "Generate one-shot quest concepts, dramatic catalysts, and villain motivations.",
      href: "/generators/adventure-generator",
    },
    {
      title: "Dungeon generator",
      description:
        "Create compact five-room dungeon layouts tailored for single-session play.",
      href: "/generators/dungeon-generator",
    },
    {
      title: "NPC generator",
      description:
        "Roll up memorable patrons, captives, and rival adventurers in seconds.",
      href: "/generators/npc",
    },
  ],
  relatedAnswers: [
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "what-makes-a-good-random-encounter",
  ],
  discovery: {
    id: "answer-write-one-shot-adventure",
    parentCluster: "adventure-mapping",
    primaryIntent: "how to write a one shot adventure",
    intentAliases: [
      "how to prep a one-shot rpg",
      "writing a one shot dnd adventure",
      "one shot adventure structure",
      "pacing a one shot session",
      "designing a single session tabletop adventure",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Provides a structured four-beat single-session framework with elastic encounters to guarantee tabletop adventures finish on time without rushed finales.",
    acknowledgedOverlap: [
      {
        with: "answer-run-heist-in-tabletop-rpg",
        reason:
          "Heist focuses on specific 4-phase infiltration scores with alarm tracks, whereas one-shot addresses general single-session time pacing.",
      },
      {
        with: "answer-run-mystery-without-railroading",
        reason:
          "Mystery addresses non-linear clue distribution, whereas one-shot covers pacing and time management across a full session.",
      },
    ],
    relatedIntents: [
      "answer-prep-weekly-session-quickly",
      "answer-run-heist-in-tabletop-rpg",
    ],
  },
  seo: {
    title: "How to Write a One-Shot Adventure | Codex Cryptica",
    description:
      "A complete framework for designing and running single-session tabletop RPG adventures. Master pacing, elastic encounters, and tight four-beat structures.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-write-a-one-shot-adventure.jpg",
    imageAlt:
      "Illustration of an adventurer consulting a glowing parchment map inside an ancient water-filled stone vault",
  },
};
