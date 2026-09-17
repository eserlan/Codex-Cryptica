import type { AnswerConfigInput } from "../schema";

export const canYouPlayATabletopRpgIn30MinuteSessions: AnswerConfigInput = {
  slug: "can-you-play-a-tabletop-rpg-in-30-minute-sessions",
  category: "session-prep",
  publishedAt: "2026-09-16",
  question: "Can you play a tabletop RPG in 30-minute sessions?",
  kind: "framework",
  shortAnswer:
    "Yes, but a 30-minute session has to be designed as a short episode rather than a compressed version of a normal three to four hour session. Prepare one meaningful scene, problem, decision, or encounter that can produce a real change in about half an hour, start at the interesting moment instead of narrating the approach to it, and move levelling, shopping, and long rules discussion outside the slot when the group is willing. Combat can work if it's scoped for the window: fewer, more meaningful enemies, a clear objective, and a willingness to let a fight run into next time rather than forcing it to finish. Stop the session once something has genuinely changed.",
  sections: [
    {
      kind: "prose",
      heading: "A short session is a different shape, not a smaller one",
      paragraphs: [
        "The failure mode with thirty-minute sessions is trying to run a normal session at speed: arrive in town, take the quest, investigate three locations, talk to several witnesses, then run out of time before anything gets resolved. Compressing a full session into a fraction of the time mostly compresses the setup, and setup is the part players remember least.",
        "A thirty-minute session works when it's built around a single playable unit with a beginning, a decision, and a consequence, the same shape a longer session has, just with one playable unit instead of several. That's a scheduling and session-design problem, not a smaller version of ordinary pacing advice: recap, admin, and scene transitions eat a much larger share of a thirty-minute slot than a three-hour one, so they have to be cut or moved out rather than merely trimmed.",
      ],
    },
    {
      kind: "list",
      heading: "Start at the interesting moment",
      intro:
        "Most of a short session's time budget is protected by how it opens, not by how fast anyone talks:",
      items: [
        {
          term: "Keep the recap to one or two sentences",
          text: '"You tracked the missing children to the old mill" does the job. A full summary of last session belongs in written notes between sessions, not spoken at the start of a slot that can\'t afford it.',
        },
        {
          term: "End the previous session with a clear next action",
          text: "If last time ended with the party deciding to break into the mill tonight, this session can open on the mill without needing to re-establish why they're there.",
        },
        {
          term: "Open at the decision, not the approach to it",
          text: "Begin with the party at the locked door, the negotiation already tense, or the ambush already sprung, rather than narrating the walk there. Travel, arrival, and small talk can be assumed unless something happens during them.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Prepare one playable unit",
      intro:
        "Rather than a conventional multi-scene session, prepare a single scene that can genuinely resolve in the time available. Any of these work:",
      items: [
        {
          term: "One tense negotiation",
          text: "A single conversation with something concrete at stake and a clear point where it succeeds, fails, or escalates.",
        },
        {
          term: "One investigation scene with a concrete discovery",
          text: "Not a whole mystery, one location with one piece of information that changes what the party knows or plans to do next.",
        },
        {
          term: "One trap, puzzle, or problem",
          text: "Self-contained, with an obvious start and a resolution the table can reach without needing information from elsewhere.",
        },
        {
          term: "One chase or escape",
          text: "A short, high-tension sequence that ends decisively either way rather than dragging across several exchanges.",
        },
        {
          term: "One compact combat",
          text: "Scoped deliberately for the time available, not a full-size encounter run at speed.",
        },
        {
          term: "One faction decision or consequence scene",
          text: "The moment a faction's earlier move lands: a price rises, a patrol changes, an ally calls in a favour.",
        },
      ],
    },
    {
      kind: "prose",
      heading:
        "Should combat, roleplay, and exploration get separate sessions?",
      paragraphs: [
        "Scoping a short session around one dominant activity is genuinely useful, because switching modes carries overhead a thirty-minute slot can't absorb: shifting from a tense negotiation into map-and-minis combat and back again eats time that could have gone to either.",
        "But treat that as a scoping tool, not a fixed rotation. A rigid pattern of combat one week, roleplay the next, exploration the week after stops the fiction from deciding what actually happens next, and eventually produces a session that has to force a fight or a conversation because the calendar says so rather than because the story called for it. A thirty-minute scene can still shift within itself, a negotiation that breaks down into a chase is fine, as long as it stays one focused unit rather than trying to cover several unrelated ones.",
      ],
    },
    {
      kind: "list",
      heading: "Move admin outside the slot when the group is willing",
      intro:
        "None of the following need to happen during limited play time, if the table is happy to handle them separately:",
      items: [
        {
          term: "Levelling choices",
          text: "A player can decide new features or spells between sessions and simply report the result at the table.",
        },
        {
          term: "Equipment shopping",
          text: "A shopping list resolved by message beats several minutes of price negotiation eating into the one scene you prepared.",
        },
        {
          term: "Scheduling and long rules discussions",
          text: "Both belong in a group chat, not the thirty minutes everyone specifically carved out to actually play.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Designing combat for a short window",
      paragraphs: [
        "Ordinary full-size encounters are risky in thirty minutes, not because combat can't work, but because a fight built for a longer session brings more turns, more conditions, and more incidental decisions than the window can absorb. Scope it deliberately instead: fewer, more meaningful enemies rather than a crowd of disposable ones, a clear objective beyond reducing every combatant to zero hit points, visible initiative with quick turn transitions, and a start that puts the party close to the interesting tactical choice rather than at the edge of the room.",
        "If a system's combat routinely runs an hour or more, the honest options are reserving occasional longer sessions for major battles, or deliberately using smaller encounter structures the rest of the time. Letting a fight run past the end of the slot and pick up again next time is a normal outcome, not a failure of the session, as long as the table knows going in that it might happen.",
      ],
    },
    {
      kind: "list",
      heading: "End on a deliberate beat",
      intro: "Stop the session once something has genuinely changed:",
      items: [
        {
          term: "A choice gets made",
          text: "The party commits to a course of action they weren't committed to at the start of the scene.",
        },
        {
          term: "A clue or reveal lands",
          text: "An NPC discloses something, or the party discovers something the earlier scene was building toward.",
        },
        {
          term: "An encounter resolves or shifts",
          text: "An enemy is defeated, escapes, or the tactical situation changes decisively.",
        },
        {
          term: "The next problem becomes visible",
          text: "A door opens, a message arrives, or a new complication is now on the table.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the old mill",
      paragraphs: [
        "The same situation, the party is tracking children who went missing near an abandoned mill, run as a normal session and as a thirty-minute one.",
      ],
      items: [
        {
          term: "Normal-session version",
          text: "The party arrives in town, takes the quest from the worried parent, investigates three locations around town, questions several witnesses, follows tracks into the woods, and eventually fights goblins at the old mill once they arrive there late in the session.",
        },
        {
          term: "30-minute version",
          text: 'The GM opens with: "You have tracked the missing children to the old mill. Through a broken window you can see two goblins arguing while someone cries behind a locked door. What do you do?" The scene runs as a single compact combat or negotiation with the goblins, scoped for two or three meaningful exchanges, and ends the moment the door opens or the fight is decided.',
        },
        {
          term: "Why it works",
          text: "The shorter version is not a lesser session, it starts later and stops earlier. Everything before the window, the quest, the search, the tracking, is assumed to have happened, and everything after it becomes next session's opening beat.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you run a 30-minute session",
      intro: "Check these before the slot begins:",
      items: [
        "You've prepared one playable unit with a beginning, a decision, and a consequence, not a full multi-scene session compressed.",
        "You can open with a one- or two-sentence recap and start directly at the interesting moment.",
        "Levelling, shopping, and long rules questions have somewhere to happen outside the session, if the group wants that.",
        "Any combat is scoped for the window: fewer meaningful enemies, a clear objective, and a plan for what happens if it runs long.",
        "You know what change or reveal will mark the end of the session before you start playing.",
      ],
    },
  ],
  codexConnection: {
    heading: "One focused seed for a short slot",
    paragraphs: [
      "Designing a good thirty-minute session still comes down to picking the right single scene and knowing when to end it, that's a GM judgement call a tool can't make.",
      "What a tool can shorten is the time spent producing that one scene's raw material. Codex Cryptica's puzzle, rumour, and encounter generators each produce a single focused, immediately usable element, a trap, a lead, or a compact fight, in less time than it takes to draft one from scratch.",
    ],
    linkText: "Try the puzzle generator",
    href: "/generators/puzzle",
  },
  relatedTools: [
    {
      title: "Puzzle generator",
      description:
        "A single self-contained trap or puzzle, ready to drop into a short session.",
      href: "/generators/puzzle",
    },
    {
      title: "Rumour generator",
      description:
        "A concrete lead or discovery to open a short investigation scene with.",
      href: "/generators/rumour",
    },
    {
      title: "Encounter generator",
      description:
        "Compact, objective-driven encounters scoped for a limited window rather than a full session.",
      href: "/generators/encounter",
    },
  ],
  relatedAnswers: [
    "how-do-i-start-gming-for-the-first-time",
    "how-do-you-make-a-tabletop-rpg-session-more-engaging",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "how-do-i-run-a-successful-session-0",
    "how-do-you-run-dnd-for-a-large-group-of-players",
    "how-do-you-run-a-chase-in-a-tabletop-rpg",
    "what-rpg-system-is-good-for-solo-play",
  ],
  discovery: {
    id: "answer-short-session",
    parentCluster: "session-prep",
    clusters: ["first-time-gm"],
    primaryIntent: "can you play a tabletop rpg in 30 minute sessions",
    intentAliases: [
      "can you play dnd in 30 minute sessions",
      "can you play dnd for 30 minutes",
      "how short can a dnd session be",
      "how to run short dnd sessions",
      "30 minute dnd session ideas",
      "how to play dnd with limited time",
      "micro rpg sessions",
      "short tabletop rpg sessions",
      "how to run dnd during lunch break",
    ],
    uniqueValue:
      "Answers the short-session intent directly: reframes a 30-minute slot as one designed episode rather than a compressed normal session, addresses whether combat, roleplay, and exploration should get separate sessions, and gives a worked before/after example showing the same start-later-stop-earlier principle.",
    relatedIntents: [
      "answer-first-time-gm-hub",
      "answer-session-engagement",
      "answer-large-group-dnd",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-session-engagement",
        reason:
          "The session-engagement answer covers general techniques for keeping any table invested; this answer is specifically about designing a session to fit an unusually short time slot, a distinct structural constraint.",
      },
      {
        with: "answer-large-group-dnd",
        reason:
          "Both are companion scheduling-and-format answers in the session-prep cluster, but this answer addresses sessions constrained by time, while the large-group answer addresses sessions constrained by player count.",
      },
    ],
  },
  seo: {
    title: "Can You Play a Tabletop RPG in 30 Minutes? | Codex Cryptica",
    description:
      "Running 30-minute RPG sessions: fast starts, one-scene prep, admin outside play, scoping combat for the window, and ending on a deliberate beat.",
    image:
      "https://assets.codexcryptica.com/og/can-you-play-a-tabletop-rpg-in-30-minute-sessions.jpg",
    imageAlt:
      "A single tense tabletop RPG scene at a locked mill door lit by a lantern, dice and a stopwatch on the table",
  },
};
