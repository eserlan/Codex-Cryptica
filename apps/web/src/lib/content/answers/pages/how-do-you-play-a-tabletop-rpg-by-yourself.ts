import type { AnswerConfigInput } from "../schema";

export const howDoYouPlayATabletopRpgByYourself: AnswerConfigInput = {
  slug: "how-do-you-play-a-tabletop-rpg-by-yourself",
  category: "getting-started",
  publishedAt: "2026-10-17",
  question: "How do you play a tabletop RPG by yourself?",
  kind: "how-to",
  shortAnswer:
    "To play a tabletop RPG alone, you replace the game master's surprise with a repeatable loop: set a scene, ask a yes-or-no question, roll on an oracle or random table to get an answer, interpret the result in context, write down what is now true, and let the consequences shape the next scene. You need a character, a place to start, one set of rules (or none), dice, and somewhere to keep notes. No game master, group or prepared adventure is required.",
  sections: [
    {
      kind: "prose",
      heading: "What changes when there is no game master",
      paragraphs: [
        "In a group game, the GM does three jobs at once: they decide what the world contains, they answer questions the players cannot answer themselves, and they surprise everyone. Playing alone, you still make decisions as your character, but the other two jobs have to come from somewhere other than your own head, because you cannot be surprised by something you chose.",
        "That is the whole reason solo play uses oracles and random tables. They are not there to make the game random for its own sake. They give you an answer you did not pick, which is the thing a GM normally provides. Your own interpretation then turns that answer into something that fits the scene.",
        "Solo play does not require a dedicated solo game. Many players use a published solo system, but you can also play a favourite group RPG alone by adding an oracle, or run a dungeon crawl from random tables with no story at all. The loop below stays the same across all of them.",
      ],
    },
    {
      kind: "list",
      heading: "What you need to start",
      intro:
        "Most solo sessions begin with a short list, and none of it needs to be bought new:",
      items: [
        {
          term: "A character",
          text: "One protagonist is simpler than a party. Write down a name, a goal, and one reason they would leave home today. The goal is what makes your later choices feel like choices.",
        },
        {
          term: "A ruleset, or a deliberate absence of one",
          text: "Use a solo-friendly system, a group system you already know, or plain fiction-first play where you decide outcomes with a die and common sense. Pick one and stay with it for the first few sessions.",
        },
        {
          term: "An oracle",
          text: "Any method that answers yes-or-no questions with a probability you chose, for example rolling a six-sided die where a 4 or higher means yes. A published oracle adds structure, but a simple one is enough to begin.",
        },
        {
          term: "A way to generate surprises",
          text: "Random tables, prompt cards or generators for names, rumours, complications and places. This is what stops a scene from only containing what you already expected.",
        },
        {
          term: "A place to write things down",
          text: "A notebook, a document or a vault. Solo play produces facts quickly, and a fact you cannot find again is a fact you will eventually contradict.",
        },
      ],
    },
    {
      kind: "list",
      heading: "The basic solo loop",
      intro: "A single scene runs through the same six steps:",
      ordered: true,
      items: [
        {
          term: "Set the scene",
          text: "State where your character is, what they want right now, and what you expect to find. Write one or two sentences.",
        },
        {
          term: "Ask a question",
          text: "When you reach something you do not know, such as whether the door is locked or whether anyone is home, put it as a yes-or-no question.",
        },
        {
          term: "Roll for the answer",
          text: "Use your oracle. If the result seems to demand a twist, roll on a table for a complication or a new detail.",
        },
        {
          term: "Interpret",
          text: "Decide what the result means in this specific scene. This step is where your judgement does the work a GM would do.",
        },
        {
          term: "Record what is now true",
          text: "Note the new person, place, threat or promise. Keep it short, but write it down.",
        },
        {
          term: "Let consequences carry forward",
          text: "End the scene on a change, then open the next one from it. A scene that changes nothing is a scene you can skip.",
        },
      ],
    },
    {
      kind: "example",
      heading: "One scene, start to finish",
      paragraphs: [
        "A solo player runs a wandering archivist called Maren who has come to a flooded chapel looking for a missing ledger.",
      ],
      items: [
        {
          term: "Set the scene",
          text: "Maren wades into the chapel at dusk. She wants the ledger, and she expects the place to be abandoned.",
        },
        {
          term: "Ask and roll",
          text: 'The player asks, "Is anyone else here?" and rolls on a likely-yes oracle. The answer is yes, with a twist result on the same roll.',
        },
        {
          term: "Interpret",
          text: 'A twist could mean anything, so the player rolls on a short complication table and gets "an old debt". The visitor becomes a ferryman who once carried Maren\'s late mentor, and who now wants payment.',
        },
        {
          term: "Record and carry forward",
          text: "The player writes down the ferryman, the debt, and the fact that he knows where the ledger went. The next scene begins with Maren deciding whether to pay him.",
        },
        {
          term: "Why it works",
          text: "The player chose none of the surprising facts alone. The oracle supplied the yes and the twist, the table supplied the debt, and the player's interpretation tied them to Maren's history, so the scene reads as if a GM had prepared it.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before your first solo session",
      intro: "A short setup is enough, and it saves a lot of stalling later:",
      items: [
        "Write one sentence describing your character and one concrete goal for them.",
        "Choose a single ruleset, or decide to play without one, and keep it for at least three sessions.",
        "Pick an oracle and write down its answer odds so you do not redesign it mid-scene.",
        "Prepare a handful of random tables or a generator for names, rumours and complications.",
        "Decide where notes will live and write the first entry before you roll anything.",
        "Plan a short first session, such as a single location with one question driving it, so you finish with a complete scene.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the facts your oracle hands you",
    paragraphs: [
      "Solo play generates new facts faster than a normal campaign, because every question can add a person, a place or a debt. Codex Cryptica lets you store each of them as a connected entry the moment it appears, so a ferryman you invented in session one is still findable in session ten. The generators for names, rumours, factions and settlements also supply the random detail that a solo loop depends on.",
    ],
    linkText: "See Codex Cryptica for solo worldbuilding",
    href: "/for/solo-worldbuilding",
  },
  relatedTopics: [
    {
      title: "Solo RPG topic hub",
      description:
        "Start here for solo play: oracles, avoiding random-feeling sessions, campaign notes and the generators that feed the loop.",
      href: "/topics/solo-rpg",
    },
  ],
  relatedTools: [
    {
      title: "Rumour Generator",
      description:
        "Produce local rumours and leads when a scene needs something to find out.",
      href: "/generators/rumour",
    },
    {
      title: "Personality Generator",
      description:
        "Give an unexpected arrival a motive and a flaw in a few seconds.",
      href: "/generators/personality",
    },
    {
      title: "Settlement Generator",
      description:
        "Build the next town your character reaches, with a problem already in it.",
      href: "/generators/settlement",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Solo Worldbuilding",
      description:
        "Turn prompts and oracle answers into connected canon without contradicting yourself.",
      href: "/for/solo-worldbuilding",
    },
  ],
  relatedAnswers: [
    "what-rpg-system-is-good-for-solo-play",
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-keep-a-solo-rpg-from-feeling-random",
    "how-do-you-keep-notes-for-a-solo-rpg-campaign",
    "what-is-a-solo-rpg-oracle",
  ],
  discovery: {
    parentCluster: "solo-rpg",
    clusters: ["solo-rpg"],
    primaryIntent: "how to play a tabletop rpg by yourself",
    intentAliases: [
      "how to play a ttrpg solo",
      "how does solo roleplaying work without a gm",
      "what do you need to start playing a solo rpg",
      "playing an rpg alone for beginners",
      "solo rpg for beginners",
      "start solo role playing",
    ],
    uniqueValue:
      "Explains the solo play loop from a standing start: what replaces the game master, the minimum kit, and a six-step scene cycle with a worked example, independent of any one system.",
    userJob: "understand",
    relatedIntents: [
      "answer-solo-rpg-system-selection",
      "for-solo-worldbuilding",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-what-is-a-solo-rpg-oracle",
        reason:
          "This page teaches the whole solo loop and the minimum kit for a beginner; the oracle page defines one tool in that loop and how to phrase questions for it.",
      },
    ],
  },
  seo: {
    title: "How do you play a tabletop RPG by yourself? | Codex Cryptica",
    description:
      "Play a tabletop RPG alone with a six-step loop: set a scene, ask an oracle, interpret the answer, record what is true, and let consequences feed the next scene.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-play-a-tabletop-rpg-by-yourself.jpg",
    imageAlt:
      "A lone player at a worn oak table at night with a hand-drawn dungeon map, dice and an open journal lit by a single candle",
  },
};
