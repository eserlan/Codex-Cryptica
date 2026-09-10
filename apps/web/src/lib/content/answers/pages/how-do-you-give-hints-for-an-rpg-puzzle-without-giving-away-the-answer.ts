import type { AnswerConfigInput } from "../schema";

export const howDoYouGiveHintsForAnRpgPuzzleWithoutGivingAwayTheAnswer: AnswerConfigInput =
  {
    slug: "how-do-you-give-hints-for-an-rpg-puzzle-without-giving-away-the-answer",
    category: "session-prep",
    publishedAt: "2026-09-10",
    question:
      "How do you give players hints for an RPG puzzle without giving away the answer?",
    kind: "how-to",
    shortAnswer:
      "Use a three-step hint ladder that gets more concrete each time it fires, but never states the exact solution: first repeat an existing clue in a new form, then point at whatever changed as a result of the party's last attempt, then state the puzzle's immediate goal without naming the method. Escalate one step at a time, and only when the table has genuinely stalled rather than on a fixed schedule.",
    sections: [
      {
        kind: "prose",
        heading: "Hints fail in one of two directions",
        paragraphs: [
          "A hint that restates what the party already knows changes nothing; five minutes later the table is exactly as stuck as before. A hint that names the mechanism outright solves the puzzle for them, and the moment that happens once, players stop trying to solve the next one and start waiting for the GM to explain it.",
          "Both failures come from treating a hint as one event instead of a sequence. A single hint has to guess the right amount of help in advance, which is nearly impossible mid-session. A ladder does not: each step gives slightly more than the last, and you stop climbing the moment the party moves again.",
        ],
      },
      {
        kind: "list",
        heading: "A three-step hint ladder",
        intro:
          "Prepare all three before the puzzle reaches the table, in this order of increasing directness.",
        items: [
          {
            term: "Repeat a clue in a new form",
            text: "Say the same true fact again, but through a different sense or character. A clue that was read on a plaque gets spoken aloud by an NPC; a visual detail becomes something a character can touch or hear. This costs nothing narratively and only helps a table that missed the clue the first time.",
          },
          {
            term: "Point at what changed",
            text: 'Name the effect of the party\'s last attempt, even a failed one. "The dust that was grey is now falling upward" or "the humming stopped when you touched the third ring." This tells the table their actions matter and gives them a fresh detail to reason from, without stating why it happened.',
          },
          {
            term: "State the goal, not the method",
            text: 'Say what the puzzle needs to happen, in plain terms, without saying how. "The mechanism wants three things offered to it, in some order" is a hint; "put the star ring on the crescent niche" is the answer. The goal narrows the search space enormously while leaving the actual solving to the players.',
          },
        ],
      },
      {
        kind: "example",
        heading: "The same stalled puzzle, three ways",
        paragraphs: [
          "A locked mechanism has gone quiet for ten minutes. The table has tried two things and is now repeating itself.",
        ],
        items: [
          {
            term: "Too little",
            text: '"You notice the mechanism has three parts." They already knew that. The table stays stuck.',
          },
          {
            term: "Too much",
            text: '"You need to turn the left dial to the symbol that matches the mural." The puzzle is over, and the players did not do the solving.',
          },
          {
            term: "The ladder, fired once",
            text: '"The mural you noticed earlier has three figures in it, and you haven\'t mentioned them since." This is step one: an existing clue, restated through a new angle. If the table is still stuck five minutes later, step two follows: "the dial you turned last is now warm." Only if that also fails does step three arrive: "the mechanism wants all three dials to agree with something in the room."',
          },
        ],
      },
      {
        kind: "prose",
        heading: "When to climb, and when not to",
        paragraphs: [
          "Advance one step when the table has stopped generating new ideas, not on a timer. Genuine progress, even slow progress, is a reason to hold the current step; circling back to an idea already tried, or falling into silence, is the actual signal.",
          "Never skip a step to save time. Jumping straight from nothing to the goal-statement step removes the middle ground where most tables actually get unstuck on their own, and teaches players that a long enough silence gets rewarded with the answer.",
          "If the table reaches the top of the ladder and is still stuck, that is a design problem with the puzzle, not a reason to invent a fourth, more direct hint on the spot. Decide in advance what happens next: an NPC who can be paid or persuaded for the missing piece, a resource cost that opens an alternate route, or simply letting the mechanism itself do something that makes the next step obvious.",
        ],
      },
      {
        kind: "prose",
        heading: "See the ladder written into a real puzzle",
        paragraphs: [
          "Every generated puzzle carries its own three-step ladder in the GM reference rail, built on this exact shape. A fantasy example: the bell's escalating hints move from repeating an image already seen, to naming the ring that just changed, to stating that the mechanism wants three things offered to it, in some order, without ever naming the order itself.",
        ],
        cta: {
          text: "Read the Bell Beneath Blackglass puzzle example",
          href: "/examples/the-bell-beneath-blackglass-fantasy-puzzle",
        },
      },
      {
        kind: "prose",
        paragraphs: [
          "A cyberpunk example under time pressure works the same way: the escalating hints move from naming that the plates and rails form one dispatch machine, to pointing out which relay just warmed up, to stating the route's start and end without giving the exact path.",
        ],
        cta: {
          text: "Read the Null-Key Reliquary puzzle example",
          href: "/examples/the-null-key-reliquary-cyberpunk-puzzle",
        },
      },
      {
        kind: "checklist",
        heading: "Before the puzzle reaches the table",
        items: [
          "All three hint steps are written down, not improvised.",
          "Step one restates an existing clue rather than introducing new information.",
          "Step two names something that changed because of a party action, even a failed one.",
          "Step three states the goal without naming the method.",
          "You know what happens if the party stalls past step three.",
        ],
      },
    ],
    codexConnection: {
      heading: "The generator writes this ladder for you",
      paragraphs: [
        "Every puzzle from Codex's puzzle generator ships with its own three-step escalating hint ladder in the GM reference rail, built on exactly this shape: repeat a clue, point at what changed, state the goal without the method. You do not have to write the ladder from scratch, only decide when to climb it during play.",
        "The generator also keeps the intended solution out of the player-facing text entirely, so nothing you read aloud accidentally gives the answer away before the first hint is even needed.",
      ],
      linkText: "Try the puzzle generator",
      href: "/generators/puzzle",
    },
    relatedTools: [
      {
        title: "Puzzle generator",
        description:
          "Free, no login. Every output includes its own escalating hint ladder in the GM rail.",
        href: "/generators/puzzle",
      },
      {
        title: "Encounter generator",
        description:
          "Situations already in progress, for when the hint itself needs a face.",
        href: "/generators/encounter",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for D&D",
        description:
          "Clues, NPCs and hints connected so the right hint-giver is always one click away during a session.",
        href: "/for/dungeons-and-dragons",
      },
    ],
    relatedAnswers: [
      "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
      "how-do-you-prep-a-weekly-rpg-session-quickly",
    ],
    discovery: {
      id: "answer-rpg-puzzle-hints",
      parentCluster: "puzzle-design",
      clusters: ["puzzle"],
      primaryIntent:
        "how do you give players hints for an rpg puzzle without giving away the answer",
      intentAliases: [
        "rpg puzzle hints",
        "giving hints without spoiling the puzzle",
        "puzzle hint ladder",
      ],
      uniqueValue:
        "A three-step escalating hint ladder (restate, point at change, state the goal) distinct from the broader puzzle-design answer's multiple-solutions framework, with the exact criteria for when to climb it.",
      relatedIntents: [
        "generator-puzzle",
        "answer-rpg-puzzles",
        "example-bell-beneath-blackglass",
        "example-null-key-reliquary",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-rpg-puzzles",
          reason:
            "Both cover puzzle design in the same cluster, but the broader answer owns how to design a puzzle that has multiple solutions and cheap failure; this answer owns the narrower, distinct problem of what a GM says out loud mid-session once a puzzle has already stalled.",
        },
      ],
    },
    seo: {
      title:
        "How to Hint at an RPG Puzzle Without Giving It Away | Codex Cryptica",
      description:
        "A three-step escalating hint ladder for tabletop RPG puzzles: restate a clue, point at what changed, then state the goal without the method. When to climb it, and when not to.",
      image:
        "https://assets.codexcryptica.com/og/how-do-you-give-hints-for-an-rpg-puzzle-without-giving-away-the-answer.jpg",
      imageAlt:
        "A game master's hand pointing toward a glowing rune on an ancient stone puzzle mechanism at a lantern-lit tabletop",
    },
  };
