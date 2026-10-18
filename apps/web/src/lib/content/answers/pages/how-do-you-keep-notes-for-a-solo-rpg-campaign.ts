import type { AnswerConfigInput } from "../schema";

export const howDoYouKeepNotesForASoloRpgCampaign: AnswerConfigInput = {
  slug: "how-do-you-keep-notes-for-a-solo-rpg-campaign",
  category: "campaign-notes",
  publishedAt: "2026-10-17",
  question: "How do you keep notes for a solo RPG campaign?",
  kind: "how-to",
  shortAnswer:
    "Keep two kinds of notes for a solo campaign: a chronological session log of what happened, and a set of reference entries for the people, places, factions and open threads that the log produces. Record each new fact the moment an oracle or table creates it, note who it affects, and revisit the open-thread list at the start of every session. The log tells you the story, and the reference entries stop you contradicting it.",
  sections: [
    {
      kind: "prose",
      heading: "Why solo campaigns need more notes than group ones",
      paragraphs: [
        "In a group game, other people remember what happened. Playing alone, you are the only memory, and you are also generating facts faster than usual, because each oracle question can add a person, a place or a debt. A name you invented in session one and forgot by session four is a fact that will eventually be contradicted.",
        "Notes in solo play do a second job as well. They are the raw material for later interpretation. When a random result arrives, the entries you wrote earlier are what let you make it fit.",
      ],
    },
    {
      kind: "list",
      heading: "The two layers of solo notes",
      intro: "Most workable systems separate what happened from what is true:",
      items: [
        {
          term: "The session log",
          text: "A running record in order: where the character was, what they tried, which questions were asked and what the answers were. Short sentences are enough. It is the first place to look when you want to remember how a situation arose.",
        },
        {
          term: "Reference entries",
          text: 'One entry per person, place or faction, with the facts that have become true about them and links to related entries. These let you answer "what do I know about the ferryman?" without reading the whole log.',
        },
        {
          term: "An open-thread list",
          text: "A short list of unanswered questions, unresolved promises and unfinished business. It is what you scan at the start of a session to decide where to go.",
        },
        {
          term: "A world-changes list",
          text: "A few lines noting what has shifted because of your actions: a faction gaining ground, a road closing, a rumour spreading. It keeps consequences from vanishing between sessions.",
        },
      ],
    },
    {
      kind: "list",
      heading: "What to write down as you play",
      intro: "Capture facts at the point they appear, using this order:",
      ordered: true,
      items: [
        {
          term: "The result",
          text: "The oracle question, the odds and the answer, so you can reconstruct why something is true.",
        },
        {
          term: "The new fact",
          text: "The person, place, threat or promise that the result created, in a single sentence.",
        },
        {
          term: "Who or what it affects",
          text: "Link it to an existing entry if there is one, or create a new entry if there is not.",
        },
        {
          term: "The question it raises",
          text: "If the fact creates uncertainty, add it to the open-thread list.",
        },
      ],
    },
    {
      kind: "example",
      heading: "From a session log to a usable record",
      paragraphs: [
        "A solo player has run Maren, an archivist, through five sessions of a river-town search for a missing ledger.",
      ],
      items: [
        {
          term: "Log only",
          text: "The notebook contains five sessions of paragraph-length entries. In session six, a random result suggests a ferryman and the player cannot remember whether one has appeared. Finding out means rereading the whole notebook, and the player settles for a new ferryman, creating a duplicate.",
        },
        {
          term: "Log plus reference entries",
          text: "The player keeps the same log but also a short entry for each recurring person. The ferryman entry shows he lent Maren a boat in session two and that she still owes him. The random result is assigned to him in seconds, and his debt becomes the complication.",
        },
        {
          term: "Why it works",
          text: "The log recorded what happened, and the entry recorded what was true about the ferryman. Having both meant the player could reuse a character instead of inventing a second one, which kept the world connected.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "A light routine for every session",
      intro: "A small routine is easier to keep up than an elaborate one:",
      items: [
        "Read the open-thread list before you start and choose one thread to pursue.",
        "Write the log in short lines during play rather than reconstructing it afterwards.",
        "Create or update a reference entry whenever a person, place or faction appears twice.",
        "Add a line to the world-changes list whenever your actions shift something outside the scene.",
        "End the session by writing the next scene's starting situation, so you can resume without rereading.",
        "Tidy duplicate or conflicting entries now and then, and record which version you kept.",
      ],
    },
  ],
  codexConnection: {
    heading: "Reference entries that link themselves together",
    paragraphs: [
      "A notebook handles the log well and the reference entries badly, because a person or place is mentioned across many pages. Codex Cryptica stores each as an entry with links to the others, so the ferryman, the boat and the debt can be seen together, and the graph shows which threads are still open. A session journal captures the log alongside them.",
    ],
    linkText: "See Codex Cryptica for solo worldbuilding",
    href: "/for/solo-worldbuilding",
  },
  relatedTopics: [
    {
      title: "Solo RPG topic hub",
      description:
        "The solo play loop, oracles, avoiding random-feeling sessions and the generators behind them.",
      href: "/topics/solo-rpg",
    },
  ],
  relatedTools: [
    {
      title: "Faction Roster Generator",
      description:
        "Create a set of factions with goals, so the world-changes list has something to track.",
      href: "/generators/faction-roster",
    },
    {
      title: "Personality Generator",
      description:
        "Give each recurring person in your reference entries a motive and a flaw.",
      href: "/generators/personality",
    },
    {
      title: "Settlement Generator",
      description: "Start a place entry with a problem already attached.",
      href: "/generators/settlement",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Solo Worldbuilding",
      description:
        "Keep every result linked to the place, person or faction it changes.",
      href: "/for/solo-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-keep-track-of-npcs-in-a-long-campaign",
    "how-do-you-play-a-tabletop-rpg-by-yourself",
  ],
  discovery: {
    parentCluster: "solo-rpg",
    clusters: ["solo-rpg"],
    primaryIntent: "how to keep notes for a solo rpg campaign",
    intentAliases: [
      "solo rpg campaign log",
      "how to track a solo ttrpg campaign",
      "solo rpg journal notes",
      "track factions and world changes in a solo campaign",
      "how to keep solo rpg notes organised",
      "solo roleplaying campaign notes",
    ],
    uniqueValue:
      "Describes a two-layer note system built for solo play, where the player is the only memory and facts are generated by oracles, with a worked log-only versus log-plus-entries example.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-solo-rpg-system-selection",
      "for-solo-worldbuilding",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-how-do-you-keep-a-solo-rpg-from-feeling-random",
        reason:
          "This page describes the record-keeping system for a solo campaign; the other page covers how to interpret oracle and table results while playing.",
      },
    ],
  },
  seo: {
    title: "How do you keep notes for a solo RPG campaign? | Codex Cryptica",
    description:
      "Keep a session log, reference entries, an open-thread list and a world-changes list so a solo RPG campaign stays consistent and its oracle results stay connected.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-keep-notes-for-a-solo-rpg-campaign.jpg",
    imageAlt:
      "A tidy desk with leather campaign journals, pinned index cards and a half-unrolled sketched map in golden light",
  },
};
