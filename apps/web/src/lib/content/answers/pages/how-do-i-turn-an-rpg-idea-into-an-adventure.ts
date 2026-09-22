import type { AnswerConfigInput } from "../schema";

export const howDoITurnAnRpgIdeaIntoAnAdventure: AnswerConfigInput = {
  slug: "how-do-i-turn-an-rpg-idea-into-an-adventure",
  category: "session-prep",
  publishedAt: "2026-09-20",
  question: "How do I turn an RPG idea into an adventure?",
  kind: "framework",
  shortAnswer:
    "Add pressure, people, choices and consequences. Something changes that makes your premise unstable; people want incompatible things because of it; give the players several ways to intervene; then decide what happens if nobody does. Prepare those conditions and leave the order of events for the table to decide.",
  sections: [
    {
      kind: "prose",
      heading:
        "A premise tells you what is true; a situation asks for a decision",
      paragraphs: [
        "Most GMs who bring an idea to the table have prepared only half of it. They have a setting with a history, a strange location, an NPC with a secret or a mystery with an answer, and all of it is interesting. The players arrive, look around, ask good questions and then ask what they are supposed to do. Nothing in the material requires a decision, so the session drifts through pleasant conversation.",
        "The gap is between lore and a playable situation. Lore stays the same however the players behave. A situation is unstable: it is already moving, several people have a stake in it, and the party can push it in more than one direction. The steps below work whether the idea is a setting, an NPC, a location or a mystery, and whether you want a one-shot or the first arc of a campaign.",
      ],
    },
    {
      kind: "list",
      heading: "Five steps from premise to playable",
      intro:
        "The model is premise, pressure, people, choices, consequences. Work through them in order, and stop when you can answer each in a sentence or two.",
      items: [
        {
          term: "Premise",
          text: "Keep the one sentence that made you excited about the idea. It should describe a fact about the world, not a plot. If you can only describe it as a sequence of events, you have already started writing the story for the players.",
        },
        {
          term: "Pressure",
          text: "Ask what has just changed that makes the premise unstable. A supply stops, a rival arrives, a seal weakens, a stranger dies. The change gives the players a reason to be here now rather than a year ago.",
        },
        {
          term: "People",
          text: "Give someone a goal and explain why they cannot simply reach it, then give someone or something a reason to oppose them. Two or three parties who want different things from the same pressure will generate more play than one villain with a plan.",
        },
        {
          term: "Choices",
          text: "List what the party could do in the first scene: investigate, protect, steal, negotiate, expose, run. Aim for several different ways in that are not ranked by how likely the players are to pick them, and do not decide the order.",
        },
        {
          term: "Consequences",
          text: "Write down what changes if the party does nothing, what changes if they fail, and what changes if they back one side. Record these as changes to the world (a blockade, a price, a missing ally) rather than as scenes you plan to run.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: a town built from dragon remains",
      paragraphs: [
        "The premise: a town is built from the remains of dragons, although no dragon has lived nearby for centuries. It is a good image and, as written, nothing more than one.",
      ],
      items: [
        {
          term: "Prepared as lore",
          text: "The GM writes the founding history, the species of dragon, the guilds that work the bone and the festival that marks the first cut. At the table the party arrives, walks the market and asks about the festival. Every answer is interesting and none of them needs a decision, so after an hour the players start inventing their own reasons to leave town.",
        },
        {
          term: "Prepared as a situation",
          text: "Pressure: the bone the town lives on has stopped arriving, and this morning the last cart came in empty. People: the Bonewrights' guild wants the quarry reopened whatever it costs, the temple holds that digging further is desecration, and a quarry foreman refuses to send his crew back down. The explanations conflict: the guild blames a collapse, the temple says the remains are being reclaimed, and the crew says the deep cut is warm. Choices: the party can examine the cut, bargain with the guild for access, expose a ledger that shows the guild has been short of bone for some time, guard the temple's ossuary from an angry crowd, or take a sample and find someone who can read it. Consequences: if nobody acts, the guild hires an outside crew who go down anyway, and the temple's protest hardens into a blockade of the main road.",
        },
        {
          term: "Why it works",
          text: "The premise did not change. The session now opens with a decision, every faction has a reason to approach the party, and the town keeps moving when the players look elsewhere, so their choices carry weight instead of triggering a script.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Prepare the situation and leave the order open",
      paragraphs: [
        "This is where the model pays off against railroading. You are not preparing less, you are preparing conditions instead of a sequence. When you catch yourself writing that the party will find the cut, then meet the foreman, then confront the guild, rewrite each sentence as a condition: if the party reaches the cut, this is what they see; if the guild learns they have been there, this is what it does. The material is the same, and the party can meet it in any order.",
        "A very short game can carry a more fixed path, because there is no time for the world to move independently. Even then, keep at least two ways to reach each important piece of information so that one missed clue does not end the evening.",
      ],
      cta: {
        text: "Read how to structure a one-shot",
        href: "/answers/how-do-you-write-a-one-shot-adventure",
      },
    },
    {
      kind: "checklist",
      heading: "Before you take the idea to the table",
      intro: "Check these against your notes:",
      items: [
        "Can you state the premise in one sentence, and does it describe a fact rather than a plot?",
        "What changed recently that puts the premise under strain?",
        "Who wants something, and what stops them from getting it directly?",
        "Are there at least two parties who would answer the pressure differently?",
        "Could the party take several different actions in the first scene, each leading somewhere different?",
        "Do you know what happens if the party does nothing, and what changes if they fail?",
        "Does any step depend on the party making one specific choice? If so, add another route.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping the moving parts together across sessions",
    paragraphs: [
      "If you have a premise but have not yet made it playable, start the Idea Developer in Develop mode and paste that premise. It turns the model into a first draft of pressure, people, player choices and consequences while keeping the original situation recognisable.",
      "Use the result as a set of conditions rather than a fixed plot. Check the questions it asks, answer the ones that matter to your table, and then take the draft into a generator when one missing piece needs more detail.",
    ],
    linkText: "Develop this premise with the Idea Developer",
    href: "/tools/idea-developer?from=answer&source=how-do-i-turn-an-rpg-idea-into-an-adventure&mode=develop",
  },
  relatedTools: [
    {
      title: "Adventure generator",
      description:
        "Full adventure concepts with an opening situation, stakes, opposition and resolution paths.",
      href: "/generators/adventure-generator",
    },
    {
      title: "Faction generator",
      description:
        "Groups with competing needs, so one pressure can pull several parties in different directions.",
      href: "/generators/faction",
    },
    {
      title: "Rumour generator",
      description:
        "Conflicting explanations for the same event, ready to hand to the players.",
      href: "/generators/rumour",
    },
    {
      title: "Settlement generator",
      description:
        "A place with people and pressures already attached, for ideas that start with a location.",
      href: "/generators/settlement",
    },
  ],
  relatedForPages: [
    {
      title: "Sandbox RPG Campaigns",
      description:
        "Keep player-directed situations, factions and consequences connected as the campaign moves.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-quest-hooks-without-railroading",
    "how-do-you-write-a-one-shot-adventure",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-you-generate-useful-rpg-rumours",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "is-my-rpg-campaign-idea-good",
    "how-do-i-expand-a-simple-rpg-campaign-idea",
  ],
  discovery: {
    id: "answer-turn-rpg-idea-into-adventure",
    parentCluster: "adventure-design",
    primaryIntent: "how to turn an rpg idea into an adventure",
    intentAliases: [
      "how to turn a dnd idea into a campaign",
      "how to make a setting idea playable",
      "how to make an rpg plot from an idea",
      "turn a campaign idea into a playable adventure",
      "from rpg premise to adventure",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Starts from a finished idea rather than a blank page and shows how to add pressure, people, choices and consequences so a static premise becomes a playable situation without scripting the plot.",
    relatedIntents: [
      "tool-idea-developer",
      "generator-adventure-generator",
      "generator-adventure-idea-generator",
      "answer-quest-hooks-without-railroading",
      "answer-write-one-shot-adventure",
      "answer-run-factions-sandbox",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-is-my-rpg-campaign-idea-good",
        reason:
          "This page is the step-by-step procedure for building the playable situation; the other page diagnoses whether an idea is workable and which piece is missing.",
      },
    ],
  },
  seo: {
    title: "How do I turn an RPG idea into an adventure? | Codex Cryptica",
    description:
      "Turn a premise into a playable adventure: add pressure, people, choices and consequences, with a worked example and a prep checklist that protects player agency.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-turn-an-rpg-idea-into-an-adventure.jpg",
    imageAlt:
      "A game master's table with a hand-drawn town map, bone fragments and faction tokens laid out around a lantern",
  },
};
