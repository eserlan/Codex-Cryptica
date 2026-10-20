import type { AnswerConfigInput } from "../schema";

export const whatIsASoloRpgOracle: AnswerConfigInput = {
  slug: "what-is-a-solo-rpg-oracle",
  category: "getting-started",
  publishedAt: "2026-10-17",
  question: "What is a solo RPG oracle, and how do you ask it good questions?",
  kind: "definition",
  shortAnswer:
    "A solo RPG oracle is a random method, usually a die roll or a table, that answers questions the game master would normally answer: is the guard awake, who is behind the door, what goes wrong next. Good oracle questions are specific, can be answered yes or no, and are asked about something you genuinely do not know. You set the odds for the answer first, roll, and then interpret the result to fit the scene.",
  sections: [
    {
      kind: "prose",
      heading: "What an oracle does at the table",
      paragraphs: [
        "In a group game the GM holds the hidden information. Playing alone, nobody does, so an oracle stands in for that hidden knowledge. You ask a question, the dice answer it, and you treat the result as true. The point is that you did not decide it, so it can still surprise you.",
        "An oracle does not narrate. It returns a small signal, such as yes, no, yes with a complication, or a pair of words, and you supply the story. This is why oracle play depends on interpretation, and why two players given the same roll can reach different, equally valid scenes.",
      ],
    },
    {
      kind: "table",
      heading: "Common kinds of oracle",
      headers: ["Type", "What it returns", "Use it when"],
      rows: [
        [
          "Yes-or-no oracle",
          "Yes, no, or either with a twist",
          "You need a fact settled, such as whether a door is locked or a rival is nearby.",
        ],
        [
          "Meaning or prompt table",
          "Two words, an image or a short phrase",
          "A result needs a flavour, a motive or a surprise you could not have asked for directly.",
        ],
        [
          "Scene-interruption table",
          "A change to the scene you planned",
          "You expected one thing and want the game to be able to disagree with you.",
        ],
        [
          "Random generator",
          "A fully formed name, rumour, person or place",
          "You need new material rather than an answer, such as an unnamed innkeeper.",
        ],
      ],
    },
    {
      kind: "list",
      heading: "How to ask a good question",
      intro:
        "Most weak oracle results come from weak questions. These habits help:",
      items: [
        {
          term: "Ask about something you do not know",
          text: "If you already have a strong idea, you will ignore an answer that contradicts it. Ask only where you would honestly accept either result.",
        },
        {
          term: "Make it answerable with yes or no",
          text: '"Who is in the room?" is a prompt for a table. "Is anyone in the room?" is an oracle question. Ask the second, then use a table or generator for the detail.',
        },
        {
          term: "Be specific",
          text: '"Does this go badly?" is too broad to interpret. "Does the guard recognise Maren?" gives the answer something to attach to.',
        },
        {
          term: "Set the odds before you roll",
          text: "Decide how likely the answer is from what you know. One common approach uses a few steps from unlikely to likely, with a fixed chance for each. Setting them first stops you shifting the odds to chase an outcome.",
        },
        {
          term: "Ask one thing at a time",
          text: 'A question with an "and" in it produces an answer you cannot read. Split it into two questions and roll twice.',
        },
        {
          term: "Treat the answer as settled",
          text: "If you re-ask until you like the result, the oracle stops being a source of surprise. Write the answer down and play from it.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A weak question and a strong one",
      paragraphs: [
        "Maren, a wandering archivist, reaches a locked cellar door beneath a quiet inn.",
      ],
      items: [
        {
          term: "The weak question",
          text: '"What happens when I open the door?" This cannot be answered with yes or no, so the player rolls on a vague table, gets two unrelated words, and spends several minutes reconciling them.',
        },
        {
          term: "The stronger questions",
          text: '"Is the door locked?" is likely, so the player sets the odds high and rolls: yes. "Is the innkeeper aware Maren is here?" is uncertain, so the odds are even: yes, with a twist. A short complication table adds that the innkeeper is already carrying the key.',
        },
        {
          term: "Why it works",
          text: "Each question settled one small fact, and the single twist was kept for the moment that mattered. The scene gained a character with a motive instead of a pile of abstract prompts.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Using an oracle without losing control of the story",
      intro: "A few checks keep oracle play readable:",
      items: [
        "Write the question, the odds and the result in your notes before you interpret anything.",
        "Keep a yes-or-no oracle for facts and a separate table for flavour, and do not ask one to do the other's job.",
        "Reserve twists for results that would otherwise be boring, rather than treating every roll as a plot point.",
        "If an answer contradicts something already established, choose the interpretation that keeps both true.",
        "Stop asking questions once the scene has what it needs, and move on to a decision for your character.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Ironsworn",
      rationale:
        "Its Ask the Oracle move sets a likelihood for a yes-or-no question and resolves it with a single percentile roll, alongside tables for names, places and complications.",
      href: "https://tomkinpress.com/pages/ironsworn",
    },
    {
      system: "Mythic Game Master Emulator Second Edition",
      rationale:
        "A standalone oracle that answers fate questions on a chart and uses a chaos factor to make scene changes more or less likely as a story grows tense.",
      href: "https://www.wordmillgames.com/mythic-gme.html",
    },
  ],
  codexConnection: {
    heading: "Feed the oracle and keep what it says",
    paragraphs: [
      "An oracle answers quickly, so the risk is losing track of what it told you. Codex Cryptica lets you record each answer next to the person, place or faction it changes, and its generators supply the names, rumours and personalities that a yes-or-no oracle cannot. Your own interpretation stays in charge; the tools simply keep the results connected.",
    ],
    linkText: "See Codex Cryptica for solo worldbuilding",
    href: "/for/solo-worldbuilding",
  },
  relatedTopics: [
    {
      title: "Solo RPG topic hub",
      description:
        "Oracles, solo play loops, campaign notes and the generators that feed them.",
      href: "/topics/solo-rpg",
    },
  ],
  relatedTools: [
    {
      title: "Plot Twist Generator",
      description:
        'Roll a complication when an oracle returns "yes, but" and you need something specific.',
      href: "/generators/plot-twist-generator",
    },
    {
      title: "Rumour Generator",
      description:
        "Generate leads and gossip to answer a question a yes-or-no oracle cannot.",
      href: "/generators/rumour",
    },
    {
      title: "Personality Generator",
      description:
        "Turn an unexpected arrival into a person with a motive and a flaw.",
      href: "/generators/personality",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Solo Worldbuilding",
      description:
        "Record oracle results as connected canon rather than loose lines in a notebook.",
      href: "/for/solo-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-play-a-tabletop-rpg-by-yourself",
    "what-rpg-system-is-good-for-solo-play",
    "how-do-you-generate-useful-rpg-rumours",
    "how-do-you-keep-a-solo-rpg-from-feeling-random",
    "how-can-i-practise-being-a-dungeon-master-without-a-group",
  ],
  discovery: {
    parentCluster: "solo-rpg",
    clusters: ["solo-rpg"],
    primaryIntent: "what is a solo rpg oracle",
    intentAliases: [
      "how to ask good questions in a solo rpg oracle",
      "solo rpg oracle explained",
      "what is a yes no oracle",
      "how do oracles work in solo ttrpg",
      "how to use an oracle in solo play",
      "game master emulator explained",
    ],
    uniqueValue:
      "Defines the oracle by the job it replaces, compares the four kinds of oracle, and teaches question-asking with a weak-versus-strong worked example, independent of any one system.",
    userJob: "understand",
    relatedIntents: [
      "answer-solo-rpg-system-selection",
      "for-solo-worldbuilding",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-how-do-you-play-a-tabletop-rpg-by-yourself",
        reason:
          "This page defines the oracle and question-asking in depth; the beginner page covers the complete solo loop and what to prepare before a first session.",
      },
    ],
  },
  seo: {
    title: "What is a solo RPG oracle and how do you use one? | Codex Cryptica",
    description:
      "A solo RPG oracle answers the questions a game master would. Learn the kinds of oracle, how to set odds, and how to ask specific yes-or-no questions.",
    image: "https://assets.codexcryptica.com/og/what-is-a-solo-rpg-oracle.jpg",
    imageAlt:
      "A player's hands over a cluttered table with two dice mid-roll beside an open notebook of questions under a brass lamp",
  },
};
