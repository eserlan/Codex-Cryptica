import type { AnswerConfigInput } from "../schema";

export const howDoYouKeepASoloRpgFromFeelingRandom: AnswerConfigInput = {
  slug: "how-do-you-keep-a-solo-rpg-from-feeling-random",
  category: "running-the-game",
  publishedAt: "2026-10-17",
  question: "How do you keep a solo RPG from feeling random?",
  kind: "framework",
  shortAnswer:
    "Solo play feels random when oracle and table results arrive with nothing to attach to. Anchor every roll to something already true: a goal your character wants, an open thread, or a fact you have recorded. Interpret each result using that material first, keep a short list of unresolved threads to draw on, and let earlier outcomes return as consequences. The dice supply the surprise, and your existing notes supply the meaning.",
  sections: [
    {
      kind: "prose",
      heading: "Why solo sessions drift into noise",
      paragraphs: [
        "A random result is only interesting relative to something. A mysterious stranger means little if nothing in the story has made strangers matter, and a sudden ambush is only dramatic if the character had something to protect. When a roll has nothing to push against, it reads as a non sequitur, and a run of them makes the session feel like a list of unrelated events.",
        "The usual cause is not bad dice. It is that the player has stopped bringing the story to the roll. Each new result gets interpreted from scratch, with no reference to the character's goal or to anything established earlier. The fix is a habit of interpretation, and it costs very little at the table.",
      ],
    },
    {
      kind: "list",
      heading: "Ways to anchor a result",
      intro: "Before you interpret a roll, run through these in order:",
      items: [
        {
          term: "Start from what the character wants",
          text: "A goal gives every scene a direction. If a result can help or hinder it, use it that way before reaching for something new.",
        },
        {
          term: "Reuse before you invent",
          text: "Check your notes for a person, place or promise that fits the result. A returning character is stronger than a fresh one, and it keeps the world small enough to remember.",
        },
        {
          term: "Keep a short thread list",
          text: "Write down the three to five questions the story has opened and not answered. When a table gives you an odd result, try attaching it to one of them.",
        },
        {
          term: "Prefer 'yes, but' to 'no'",
          text: "When an oracle blocks your plan, look for an interpretation that lets you continue at a cost. That keeps the story moving and gives the result a price.",
        },
        {
          term: "Make consequences return",
          text: "If your character stole something, lied or spared an enemy, bring that back in a later scene. Callbacks are what turn separate events into a plot.",
        },
        {
          term: "Narrow the tables",
          text: "Use tables written for the place or situation you are in, rather than a universal one. A harbour table that only contains harbour events produces fewer non sequiturs.",
        },
      ],
    },
    {
      kind: "example",
      heading: "The same roll, anchored and unanchored",
      paragraphs: [
        "A solo player is running Maren, an archivist searching a river town for a missing ledger. Two sessions earlier she borrowed a boat from a ferryman and promised to return it.",
      ],
      items: [
        {
          term: "Unanchored",
          text: "A scene-interruption roll says a stranger arrives with urgent news. The player invents a courier from another city. The courier gives a message the story has no use for, and the thread dies a scene later.",
        },
        {
          term: "Anchored",
          text: "The same roll arrives. The player checks the thread list, sees the borrowed boat, and decides the stranger is the ferryman's sister, come to say the boat was found wrecked and Maren is blamed. The ledger search now has a deadline and a rival.",
        },
        {
          term: "Why it works",
          text: "The dice produced the arrival, but the player's notes chose who arrived and what it meant. Nothing was forced, and the new complication is connected to a promise the player had made.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When you do not know what happens next",
      paragraphs: [
        "A stall in solo play usually means the character has no immediate want. Ask what they would do next if nothing unexpected happened, and do that. If you are still stuck, ask the oracle a question about the situation instead of the future, such as whether someone is watching, rather than what comes next.",
        "If a scene has stopped producing interest, end it. A solo session does not owe you a full scene for every roll, and the next scene can open on the consequence of the last one.",
      ],
    },
    {
      kind: "checklist",
      heading: "A quick check when a session feels random",
      intro: "If a session is not holding together, look for these gaps:",
      items: [
        "Write one sentence about what your character wants today, and check that the current scene serves it.",
        "List the open threads and attach at least one new result to one of them.",
        "Look for a person or place already in your notes that can take the role of a new arrival.",
        "Add a cost or complication to any result that simply solves a problem.",
        "Bring back one earlier choice and show what it set in motion.",
        "End the scene if it has stopped changing anything.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the threads in view",
    paragraphs: [
      "Anchoring depends on being able to find what you have already established. Codex Cryptica keeps people, places and factions as linked entries, so the thread you need is one search away when a random result arrives. Its generators for factions, rumours and plot twists can supply material, and your notes decide where it belongs.",
    ],
    linkText: "See Codex Cryptica for solo worldbuilding",
    href: "/for/solo-worldbuilding",
  },
  relatedTopics: [
    {
      title: "Solo RPG topic hub",
      description:
        "The solo play loop, oracles, campaign notes and the generators that support them.",
      href: "/topics/solo-rpg",
    },
  ],
  relatedTools: [
    {
      title: "Plot Twist Generator",
      description:
        "Get a complication to attach to an open thread when a result needs a cost.",
      href: "/generators/plot-twist-generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create rivals with goals of their own, so consequences have someone to carry them.",
      href: "/generators/faction",
    },
    {
      title: "Rumour Generator",
      description:
        "Produce leads that tie a new result back to the people and places you already have.",
      href: "/generators/rumour",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Solo Worldbuilding",
      description:
        "Keep unanswered questions and consequences linked to the places they affect.",
      href: "/for/solo-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-play-a-tabletop-rpg-by-yourself",
    "what-is-a-solo-rpg-oracle",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
  ],
  discovery: {
    parentCluster: "solo-rpg",
    clusters: ["solo-rpg"],
    primaryIntent: "how to keep a solo rpg from feeling random",
    intentAliases: [
      "how to make solo rpg feel less random",
      "how do you create unexpected twists in a solo rpg",
      "how to decide what happens next in solo rpg",
      "avoid getting stuck in a solo rpg session",
      "make solo ttrpg random results make sense",
      "turn random generator results into a story",
    ],
    uniqueValue:
      "Treats randomness as an interpretation problem rather than a dice problem, with an ordered set of anchors and a worked anchored-versus-unanchored example, plus what to do when you are stuck.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-solo-rpg-system-selection",
      "for-solo-worldbuilding",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-how-do-you-keep-notes-for-a-solo-rpg-campaign",
        reason:
          "This page is about interpreting results so they feel meaningful during play; the notes page is about recording facts between and during sessions so they stay consistent.",
      },
    ],
  },
  seo: {
    title: "How do you keep a solo RPG from feeling random? | Codex Cryptica",
    description:
      "Make oracle and table results feel meaningful in solo play by anchoring them to character goals, open threads and recorded facts, and by letting consequences return.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-keep-a-solo-rpg-from-feeling-random.jpg",
    imageAlt:
      "A player studying a large hand-drawn regional map pinned with threads linking small notes, dice in hand, in late evening light",
  },
};
