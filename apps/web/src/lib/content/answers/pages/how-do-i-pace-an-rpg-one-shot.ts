import type { AnswerConfigInput } from "../schema";

export const howDoIPaceAnRpgOneShot: AnswerConfigInput = {
  slug: "how-do-i-pace-an-rpg-one-shot",
  category: "session-prep",
  publishedAt: "2026-09-25",
  question: "How do I pace an RPG one-shot?",
  kind: "framework",
  shortAnswer:
    "Pace an RPG one-shot by budgeting backward from your hard stop: reserve the final quarter of the session for the climax and epilogue, place one explicit checkpoint at the halfway mark to test momentum, and prepare an elastic middle encounter that can expand or vanish entirely depending on the table clock.",
  sections: [
    {
      kind: "prose",
      heading: "Budget backward from table time, not fictional time",
      paragraphs: [
        "A four-hour scheduled session rarely contains four hours of play. Setting up character sheets, answering rules queries, ordering food, and taking mid-session breaks routinely consume sixty to ninety minutes. When Game Masters design a scenario for four unbroken hours of action, the table reaches the three-hour mark only halfway through the dungeon, forcing a rushed boss fight or an unfinished cliffhanger.",
        "Effective pacing treats table time as an unforgiving constraint. Begin by establishing your non-negotiable end time. Subtract twenty minutes for late arrivals and rules refreshers, ten minutes for a mid-session break, forty minutes for the final confrontation, and ten minutes for resolution and epilogue. The remaining window represents your actual playable budget, which must accommodate only three to five core decisions.",
      ],
    },
    {
      kind: "list",
      heading: "The six pacing beats of a single-session scenario",
      intro:
        "Organise your playable time into distinct operational beats rather than a rigid sequence of numbered rooms:",
      items: [
        {
          term: "Beat 1: The immediate catalyst (Minutes 0 to 25)",
          text: "Open with the party already committed to action. Skip tavern negotiations and long travel descriptions. Deliver the core dilemma within five minutes and present two immediate, contrasting paths forward.",
        },
        {
          term: "Beat 2: The opening divergence (Minutes 25 to 65)",
          text: "Players explore their initial lead, gather preliminary resources, and encounter early opposition. This phase establishes the rules baseline and gives every character a moment to demonstrate competence.",
        },
        {
          term: "Beat 3: The halfway checkpoint (Minute 90)",
          text: "By the middle of the session, the party must understand the true nature of the central threat. If the players are still debating who the culprit is or where the vault lies at the 90-minute mark, supply an unambiguous clue immediately.",
        },
        {
          term: "Beat 4: The elastic middle (Minutes 90 to 140)",
          text: "The accordion phase of the adventure. Prepare secondary encounters, environmental hazards, or rival skirmishes that can be expanded if the group moves fast, or bypassed completely if table time is tight.",
        },
        {
          term: "Beat 5: The point of no return (Minute 150)",
          text: "Force an irreversible decision that propels the party directly into the climax: entering the inner sanctum, sounding the alarm, initiating the heist getaway, or sealing the escape hatch.",
        },
        {
          term: "Beat 6: The protected climax and aftermath (Minutes 150 to 210)",
          text: "Never let the climax begin with only fifteen minutes remaining. Reserve forty to sixty minutes for dynamic set-piece encounters, tactical maneuvers, moral resolutions, and a calm five-minute epilogue.",
        },
      ],
    },
    {
      kind: "list",
      heading: "What to cut first when running behind schedule",
      intro:
        "When the clock indicates your group is trailing behind pace, trim secondary connective tissue rather than player agency:",
      items: [
        {
          term: "Cut travel and logistical transitions",
          text: "Eliminate wandering monster checks, navigation skill rolls, and carriage journeys. Frame the next scene immediately at the target destination: 'You sprint through the rain and arrive at the warehouse docks.'",
        },
        {
          term: "Relocate essential clues to current actions",
          text: "If investigators skipped the archive where the cipher was stored, place the cipher in the pocket of the cultist they just incapacitated in the alleyway.",
        },
        {
          term: "Consolidate duplicate combat encounters",
          text: "Replace a planned guard patrol skirmish with signs of recent panic: open doors, dropped torches, and fleeing sentries that communicate danger without rolling initiative.",
        },
        {
          term: "Merge non-player characters",
          text: "If players need information from both the harbormaster and the local apothecary, have the harbormaster hold the medicinal draught on his desk when they walk into his office.",
        },
        {
          term: "Protect core player decisions",
          text: "Never cut the choices that determine how the finale unfolds. Players remember whether they decided to rescue the hostage or recover the relic; they rarely notice that a hallway trap was excised.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Escalate the situation instead of nudging the players",
      paragraphs: [
        "When a group spends twenty minutes deliberating over which door to open, telling them out of character to hurry up breaks immersion. Instead, let the fictional world apply pressure. An antagonist advances their plan, a patrol rounds the corner, the tide rises another foot, or the burning roof begins shedding embers into the chamber.",
        "Escalation shifts the table from passive analysis to active reaction. It creates dramatic momentum naturally while respecting player agency, forcing an immediate tactical choice rather than an administrative reminder from the Game Master.",
      ],
    },
    {
      kind: "prose",
      heading: "Adjusting your scope to system and table speed",
      paragraphs: [
        "A four-hour slot in a tactical grid-based game like Pathfinder or D&D Fifth Edition accommodates at most three combat encounters, as each fight frequently consumes forty to sixty minutes of table time. In contrast, narrative or rules-light systems like Shadowdark, Call of Cthulhu, or Blades in the Dark can easily resolve five to seven distinct dramatic situations in the same duration.",
        "Factor in table familiarity and communication friction. Running a one-shot online with five unfamiliar players on virtual tabletop software requires fifteen to twenty percent more administrative overhead than running four veteran friends around a kitchen table. Plan fewer scenes and broader transitions whenever communication latency increases.",
      ],
    },
    {
      kind: "example",
      heading: "Worked table budgets: Four-hour sessions across three styles",
      paragraphs: [
        "Compare how the same 240-minute table window is budgeted across different gameplay styles to protect the dramatic climax.",
      ],
      items: [
        {
          term: "Investigative Horror (e.g. Call of Cthulhu)",
          text: "0:00 to 0:25: Introductions, character ties, and immediate crime scene. 0:25 to 1:30: Three investigation locations with redundant clues. 1:30 (Checkpoint): The horrifying implication is revealed. 1:30 to 2:15: Elastic middle (cultist ambush or archive research; cuttable if slow). 2:15 to 2:30: Preparation and resource commitment. 2:30 to 3:30: Climax ritual confrontation or desperate escape. 3:30 to 4:00: Sanity fallout, epilogue, and debrief.",
        },
        {
          term: "Action Infiltration (e.g. Blades in the Dark or Cyberpunk)",
          text: "0:00 to 0:30: Briefing, gear selection, and engagement roll. 0:30 to 1:20: Infiltration and perimeter security breach. 1:20 (Checkpoint): Objective reached, but an unexpected complication arises. 1:20 to 2:10: Elastic middle (alarm response or rival team arrival). 2:10 to 3:20: High-velocity escape set-piece with environmental hazards. 3:20 to 4:00: Payoff, heat tracking, and wrap-up.",
        },
        {
          term: "Tactical Fantasy Dungeon (e.g. D&D or Shadowdark)",
          text: "0:00 to 0:25: Starting at the dungeon portal with pre-rolled characters. 0:25 to 1:15: Entrance chamber puzzle and light skirmish (Combat 1). 1:15 to 2:00: Trapped crossroads and optional treasure vault (Combat 2, cuttable). 2:00 (Checkpoint): Boss chamber entrance unsealed. 2:00 to 3:20: Boss encounter with environmental terrain and phases (Combat 3). 3:20 to 4:00: Looting, survival tally, and aftermath.",
        },
        {
          term: "Why it works",
          text: "Each archetype features an explicit time checkpoint and an elastic encounter in the second hour. Regardless of how long players deliberate during early scenes, the Game Master knows the exact minute when the table must pivot toward the climax.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "One-shot pacing prep checklist",
      intro:
        "Review these table-time checks before welcoming players to the session:",
      items: [
        "Have you agreed upon a strict hard stop when players must pack up and leave?",
        "Did you subtract 60 to 90 minutes of administrative overhead from your total scheduled time?",
        "Does the session open with the party already assembled at the crisis point?",
        "Have you scheduled a mid-session checkpoint where the core dilemma must be clear?",
        "Which specific encounter is marked as elastic to be expanded or dropped on the fly?",
        "If players stall during exploration, what external event will advance the danger?",
        "Are your essential clues movable to wherever the party decides to search?",
        "Have you protected at least 45 minutes for the final climax and resolution?",
        "Is there a five-minute buffer reserved for character epilogues?",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Shadowdark RPG",
      rationale:
        "Real-time torch timers of sixty minutes turn passing table time into immediate dungeon peril, driving fast decisions without GM prodding.",
      href: "https://www.thearcanelibrary.com/pages/shadowdark",
    },
    {
      system: "Blades in the Dark",
      rationale:
        "Segmented Progress Clocks display escalating danger and impending deadlines openly, keeping table momentum visible to all players.",
      href: "https://evilhat.com/product/blades-in-the-dark/",
    },
    {
      system: "Fate Core",
      rationale:
        "Concession rules allow combatants to yield before total elimination, ending dragged-out fights quickly while preserving dramatic consequences.",
      href: "https://evilhat.com/product/fate-core-system/",
    },
  ],
  codexConnection: {
    heading: "Pacing single-session adventures in Codex Cryptica",
    paragraphs: [
      "Codex Cryptica helps Game Masters plan resilient session schedules without rigid scripting. Use the Session Prep Builder to structure flexible beat sheets, separate core locations from optional encounters, and track escalation clocks in real time.",
      "Visualise encounter branches in your campaign graph so cuttable detours and fallback clue locations remain accessible during live play.",
    ],
    linkText: "Build session run sheets with the Session Prep Builder",
    href: "/tools/session-prep-builder",
  },
  relatedTools: [
    {
      title: "Session prep builder",
      description:
        "Generate focused single-session run sheets with modular beats and cuttable encounters.",
      href: "/tools/session-prep-builder",
    },
    {
      title: "Adventure generator",
      description:
        "Create high-stakes catalysts, escalating complications, and memorable climaxes.",
      href: "/generators/adventure-generator",
    },
    {
      title: "Dungeon generator",
      description:
        "Draft compact five-room layouts optimized for single-evening exploration.",
      href: "/generators/dungeon-generator",
    },
  ],
  relatedAnswers: [
    "how-do-you-write-a-one-shot-adventure",
    "how-do-i-write-a-good-call-of-cthulhu-one-shot",
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-i-prepare-an-rpg-session-step-by-step",
    "how-much-prep-do-you-need-for-an-rpg-session",
  ],
  discovery: {
    id: "answer-pace-rpg-one-shot",
    parentCluster: "adventure-mapping",
    clusters: ["adventure-mapping", "session-prep"],
    primaryIntent: "how to pace an rpg one shot",
    intentAliases: [
      "pacing a one shot session",
      "rpg one shot pacing",
      "how long should a ttrpg one shot be",
      "how much content for a 4 hour one shot",
      "how to keep a one shot on time",
      "one shot running too long",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Teaches Game Masters to pace single-session tabletop games by budgeting backwards from a hard stop, protecting the final hour, and cutting connective tissue rather than player decisions.",
    acknowledgedOverlap: [
      {
        with: "answer-write-one-shot-adventure",
        reason:
          "The cornerstone one-shot answer covers whole-scenario creation and four-beat structure; this answer focuses specifically on real-time table management, dynamic cuts, and system-speed budgeting.",
      },
      {
        with: "answer-write-call-of-cthulhu-one-shot",
        reason:
          "The Call of Cthulhu answer focuses on cosmic horror clue webs and sanity pacing, whereas this answer provides cross-genre table-time budgeting and real-time adjustment heuristics.",
      },
      {
        with: "answer-prepare-session-step-by-step",
        reason:
          "The session-prep answer provides a nine-step prep routine for weekly play, whereas this answer specifically addresses time budgeting and mid-session pruning for single-session one-shots.",
      },
      {
        with: "answer-run-heist-in-tabletop-rpg",
        reason:
          "The heist answer focuses on four-phase infiltration scores with alarm tracks, whereas this answer provides broad table-time management and time-budgeting heuristics for one-shots.",
      },
    ],
    relatedIntents: [
      "answer-write-one-shot-adventure",
      "answer-write-call-of-cthulhu-one-shot",
      "answer-prepare-session-step-by-step",
    ],
  },
  seo: {
    title: "How to Pace an RPG One-Shot | Codex Cryptica",
    description:
      "Master table-time pacing for single-session RPG one-shots. Learn backward time budgeting, halfway checkpoints, elastic middle scenes, and what to cut first.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-pace-an-rpg-one-shot.jpg",
    imageAlt:
      "Illustration of a Game Master tracking session beats and table time with a pocket watch and notes behind a wooden GM screen",
  },
};
