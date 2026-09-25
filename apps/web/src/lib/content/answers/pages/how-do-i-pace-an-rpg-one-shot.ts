import type { AnswerConfigInput } from "../schema";

export const howDoIPaceAnRpgOneShot: AnswerConfigInput = {
  slug: "how-do-i-pace-an-rpg-one-shot",
  category: "session-prep",
  publishedAt: "2026-09-25",
  question: "How do I pace an RPG one-shot?",
  kind: "framework",
  shortAnswer:
    "Pace an RPG one-shot by budgeting backward from your hard stop: reserve the final 50 to 70 minutes of usable play for the climax and epilogue, place one explicit checkpoint at the halfway mark to test momentum, and prepare an elastic middle encounter that can expand or vanish entirely depending on the table clock.",
  sections: [
    {
      kind: "prose",
      heading: "Budget backward from table time, not fictional time",
      paragraphs: [
        "A four-hour scheduled session rarely contains four hours of play. Setting up character sheets, answering rules queries, ordering food, and taking mid-session breaks routinely consume sixty to ninety minutes. When Game Masters design a scenario for four unbroken hours of action, the table reaches the three-hour mark only halfway through the dungeon, forcing a rushed boss fight or an unfinished cliffhanger.",
        "Effective pacing treats table time as an unforgiving constraint. Begin by establishing your non-negotiable end time. For a four-hour booking, allow sixty to ninety minutes for arrivals, rules refreshers, breaks, and other overhead; that leaves 150 to 180 minutes of play. Reserve forty to sixty of those minutes for the climax and about ten for the epilogue. The opening and middle must fit in the time left, usually 80 to 130 minutes, and accommodate only three to five core decisions.",
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
          term: "Beat 3: The halfway checkpoint (75 to 90 minutes of play)",
          text: "Set this checkpoint halfway through your usable play time. In a four-hour booking with 60 to 90 minutes of overhead, that is about 75 to 90 minutes after play begins. The party should understand the central threat; if they are still debating who the culprit is or where the vault lies, bring an unambiguous clue into their current scene.",
        },
        {
          term: "Beat 4: The elastic middle (after the checkpoint to about two-thirds of play time)",
          text: "The accordion phase of the adventure. Prepare secondary encounters, environmental hazards, or rival skirmishes that can be expanded if the group moves fast, or bypassed completely if table time is tight.",
        },
        {
          term: "Beat 5: The point of no return (about two-thirds of play time)",
          text: "Force an irreversible decision that propels the party directly into the climax: entering the inner sanctum, sounding the alarm, initiating the heist getaway, or sealing the escape hatch.",
        },
        {
          term: "Beat 6: The protected climax and aftermath (final 50 to 70 minutes)",
          text: "Begin the climax with enough time for a forty-to-sixty-minute finale and about ten minutes for resolution and epilogue. If the clock is too late, cut or shorten an optional scene before starting the climax.",
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
      heading:
        "Worked table budgets: Three hours of play in a four-hour booking",
      paragraphs: [
        "These examples allow one hour for arrivals, setup, rules questions, and a break, leaving 180 minutes of play. Adjust the overhead allowance to match your group, then move the beats while keeping the checkpoint near the midpoint and the climax in the final 50 to 70 minutes.",
      ],
      items: [
        {
          term: "Investigative Horror (e.g. Call of Cthulhu)",
          text: "0:00 to 0:20: Introductions, character ties, and immediate crime scene. 0:20 to 1:20: Investigation locations with redundant clues. 1:30 (Checkpoint): The horrifying implication is revealed. 1:30 to 2:00: Elastic middle (cultist ambush or archive research; cuttable if slow). 2:00 to 2:10: Preparation and resource commitment. 2:10 to 2:50: Climax ritual confrontation or desperate escape. 2:50 to 3:00: Sanity fallout and epilogue.",
        },
        {
          term: "Action Infiltration (e.g. Blades in the Dark or Cyberpunk)",
          text: "0:00 to 0:20: Briefing, gear selection, and engagement roll. 0:20 to 1:20: Infiltration and perimeter security breach. 1:30 (Checkpoint): Objective reached, but an unexpected complication arises. 1:30 to 2:00: Elastic middle (alarm response or rival team arrival). 2:00 to 2:50: High-velocity escape set-piece with environmental hazards. 2:50 to 3:00: Payoff and wrap-up.",
        },
        {
          term: "Tactical Fantasy Dungeon (e.g. D&D or Shadowdark)",
          text: "0:00 to 0:15: Start at the dungeon portal with pre-rolled characters. 0:15 to 1:00: Entrance puzzle and light skirmish (Combat 1). 1:00 to 1:25: Trapped crossroads and optional treasure vault (Combat 2, cuttable). 1:30 (Checkpoint): The route to the boss is clear. 1:30 to 2:00: Reach the boss chamber or cut directly there if behind schedule. 2:00 to 2:50: Boss encounter with environmental terrain and phases (Combat 3). 2:50 to 3:00: Loot and aftermath.",
        },
        {
          term: "Why it works",
          text: "Each example reaches its checkpoint near the midpoint, keeps one optional scene that can be cut, and protects the final hour for the climax and wrap-up. If overhead differs, use the same proportions against the play time you actually have.",
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
        "Did you subtract 60 to 90 minutes of overhead from the scheduled time before assigning scene beats?",
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
