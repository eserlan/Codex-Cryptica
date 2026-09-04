import type { AnswerConfigInput } from "../schema";

export const howDoYouDesignRpgPuzzlesThatDoNotStallTheGame: AnswerConfigInput =
  {
    slug: "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    category: "session-prep",
    question: "How do you design RPG puzzles that do not stall the game?",
    kind: "framework",
    shortAnswer:
      "Give the puzzle more than one solution and make failure cost something other than time. A puzzle stalls when there is exactly one intended answer and no way forward until someone says it out loud — the table stops, guesses, and waits. If the party can make partial progress, buy information, or take a worse route through, the puzzle becomes a pressure point rather than a locked door.",
    sections: [
      {
        kind: "prose",
        heading: "The stall has one cause",
        paragraphs: [
          "Almost every puzzle that kills an hour has the same shape: a single correct answer, held in the GM's notes, with no partial credit and no alternative path. Everything else — difficulty, cleverness, theme — is secondary. A hard puzzle with three routes through it does not stall. An easy puzzle with one route stalls the moment nobody happens to think of it.",
          'This is worth stating plainly because the usual advice, "make puzzles easier", treats the symptom. The problem is not that players are stuck on a difficult thing; it is that being stuck has no exit.',
        ],
      },
      {
        kind: "list",
        heading: "Four properties of a puzzle that keeps moving",
        items: [
          {
            term: "More than one way through",
            text: "The intended solution, plus a slower or costlier alternative. Force, bribery, a second entrance, or simply spending a resource. The second route should be genuinely worse, not equivalent — that is what preserves the puzzle's weight.",
          },
          {
            term: "Failure that costs something other than time",
            text: "A wrong answer should spend a resource, make noise, injure someone, or alert something. Then a wrong attempt is still play. When failure costs only minutes, the table's only strategy is to keep guessing.",
          },
          {
            term: "Information the party can buy",
            text: "A clue elsewhere in the location, a knowledgeable NPC, a rubbing that can be taken away and studied. Being stuck should convert into a task.",
          },
          {
            term: "Feedback on partial progress",
            text: "Three of the five symbols glow. The mechanism turns halfway. Players will persist almost indefinitely if they can tell they are getting closer, and give up in five minutes if they cannot.",
          },
        ],
      },
      {
        kind: "example",
        heading: "The same door, redesigned",
        paragraphs: [
          "A sealed vault door in a drowned chapel. The first version is the one that eats an hour.",
        ],
        items: [
          {
            term: "The stalling version",
            text: "A riddle carved on the door. Answer it correctly and it opens. Nothing else works, and there is no other way into the vault.",
          },
          {
            term: "The redesign",
            text: "The riddle still opens the door cleanly. The hinges are also corroded and can be broken through in ten minutes of loud work — which draws whatever is in the flooded nave. The chapel's register, two rooms away, records the answer obliquely if anyone thinks to look. And each wrong answer spoken aloud drops the water level marker one notch, so guessing is possible but visibly expensive.",
          },
          {
            term: "What changed",
            text: "The riddle is still the best solution and still feels like an achievement. But the party is never stuck — they are choosing between clever, loud and slow, and every one of those is a scene.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Puzzles the characters solve, not the players",
        paragraphs: [
          "There is a real design fault line here and no consensus about it, so pick a side deliberately. Some tables want puzzles their players solve out of character — lateral thinking, wordplay, logic — and treat character skills as irrelevant. Others want the character sheet to matter, so the puzzle is a task with a difficulty and the player's job is to decide how to approach it.",
          "Both work. The failure is mixing them without saying so: presenting a riddle that only player insight can solve, then allowing an Investigation roll when the table gets frustrated, which teaches everyone that thinking was optional.",
          "If you do want player-facing puzzles, keep them physical and manipulable where you can. Something the players can hold, draw, or rearrange holds a table far better than a description read aloud twice.",
        ],
      },
      {
        kind: "list",
        heading: "Practical safety valves",
        intro: "Have at least one of these ready before the puzzle is in play.",
        items: [
          {
            term: "A clock",
            text: "Something that advances while the party works. Pressure converts deliberation into decisions.",
          },
          {
            term: "A character who knows",
            text: "An NPC who can be persuaded, hired or coerced into a partial answer. Costly, and therefore not a free pass.",
          },
          {
            term: "A ten-minute rule",
            text: "Decide in advance what you will hand them if the table has been circling for ten minutes. Improvising this in the moment is how puzzles get abandoned instead of solved.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Before the puzzle reaches the table",
        items: [
          "There are at least two ways past it, one of them worse.",
          "A wrong attempt costs something you can name.",
          "There is a clue available somewhere other than the puzzle itself.",
          "The party can tell when they are partway there.",
          "You know what you will do if they are still stuck after ten minutes.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keeping the clues findable during prep",
      paragraphs: [
        'The part of this that is genuinely hard to hold in your head is the clue graph: which clue sits where, who knows what, and what the party has already found. Recording clues as entities linked to the location and the person holding them means the answer to "is there anything else they could have used?" is visible rather than reconstructed mid-session.',
        "Codex's free puzzle generator is a starting point for the mechanism itself. The alternative routes and the failure costs are the part worth writing yourself.",
      ],
      linkText: "Try the puzzle generator",
      href: "/generators/puzzle",
    },
    relatedTools: [
      {
        title: "Puzzle generator",
        description:
          "Free, no login. Mechanisms and riddles you can hang alternative routes off.",
        href: "/generators/puzzle",
      },
      {
        title: "Dungeon generator",
        description:
          "Layouts where a puzzle can have a second entrance and somewhere to hide the clue.",
        href: "/generators/dungeon-generator",
      },
      {
        title: "Adventure generator",
        description:
          "Full scenarios with obstacles, stakes and a reason for the door.",
        href: "/generators/adventure-generator",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for D&D",
        description:
          "Prep, clues and locations connected so nothing goes missing between sessions.",
        href: "/for/dungeons-and-dragons",
      },
    ],
    relatedAnswers: [
      "what-makes-a-good-random-encounter",
      "what-is-a-point-crawl",
      "how-do-you-run-a-conspiracy-campaign",
    ],
    discovery: {
      id: "answer-rpg-puzzles",
      parentCluster: "puzzle-design",
      primaryIntent: "how do you design rpg puzzles that do not stall the game",
      intentAliases: ["rpg puzzle design", "stop puzzles stalling the table"],
      uniqueValue:
        "Names the single cause of stalling, gives four properties that prevent it, redesigns a vault door, and lists safety valves to prepare.",
      relatedIntents: ["generator-puzzle"],
    },

    seo: {
      title:
        "How do you design RPG puzzles that do not stall the game? | Codex Cryptica",
      description:
        "Puzzles stall when there is one answer and no exit. Four properties that keep play moving, a redesigned vault door, and safety valves to prepare in advance.",
    },
  };
