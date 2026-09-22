import type { AnswerConfigInput } from "../schema";

export const isMyRpgCampaignIdeaGood: AnswerConfigInput = {
  slug: "is-my-rpg-campaign-idea-good",
  category: "session-prep",
  publishedAt: "2026-09-20",
  question: "Is my RPG campaign idea good?",
  kind: "framework",
  shortAnswer:
    "An idea does not need to be original to be good, because tables run familiar premises well all the time. It needs to make the players curious, put something at risk, give several people competing goals, and leave the party with things to do. Test it with five questions: curiosity, pressure, competing goals, player actions and discovery.",
  sections: [
    {
      kind: "prose",
      heading: "Originality is the wrong test",
      paragraphs: [
        "Most people who ask this have an idea they like and a suspicion that someone has already done it. Probably someone has. Heists, cursed towns, missing heirs and sealed gods have been run thousands of times, and new groups still enjoy them because the version at their table has different people, different stakes and different players pulling on it.",
        "What separates a strong idea from a weak one is whether it can generate play. A premise can be striking and still give the players nothing to grab. It can also be ordinary and produce a great campaign because every scene forces a choice. Judge the idea by what it does at the table, and treat how new it feels as a minor factor.",
        "This is also a useful test for beginners. You do not need experience running games to answer the five questions below, and a GM on their first campaign can improve an idea with them just as well as a veteran can.",
      ],
    },
    {
      kind: "list",
      heading: "Five questions to test an idea",
      intro:
        "The five are curiosity, pressure, competing goals, player actions and discovery. Answer each in a sentence or two; a blank or vague answer shows where the idea needs work.",
      items: [
        {
          term: "What does it make players curious about?",
          text: "Name the question the premise puts in their heads. 'Where did all this come from?' is a good one. If the idea only produces the reaction 'huh, neat', it is a piece of scenery, and you will need to add a question before it can carry a session.",
        },
        {
          term: "What changes if nobody intervenes?",
          text: "Something should be moving without the party. A supply is running low, a rival is about to arrive, a ritual finishes at midsummer. If you cannot describe a change, the players have no reason to act now rather than next week.",
        },
        {
          term: "Who wants what?",
          text: "Find at least two people or groups whose goals cannot both be met. A single villain with a plan gives the party one thing to oppose. Two factions that disagree about the same problem give them a choice of side, and sides make for more interesting play than a single opponent.",
        },
        {
          term: "What can the players actually do?",
          text: "Write a short list of verbs: investigate, bargain, steal, escort, sabotage, expose, defend. If every entry on the list is 'talk to the NPC who knows', the idea is a lecture with a plot attached, and you need to add places, objects or people the party can affect.",
        },
        {
          term: "What discovery would change the situation?",
          text: "Decide on one thing the party could learn that shifts who is right, who is dangerous or what the problem is. Lore that never changes anything is background. A discovery turns a static premise into something that can move.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: testing the dragon-part town",
      paragraphs: [
        "The premise: a town is built almost entirely from dragon parts, but there are no dragons anywhere nearby and nobody knows where the material came from. Here it is run through the five questions.",
      ],
      items: [
        {
          term: "First pass, answered honestly",
          text: "Curiosity is strong, since players will want to know where the bone came from. The other four questions come back nearly empty. Nothing is changing, nobody wants anything, the players' only verb is 'ask around', and there is no discovery beyond the answer to the original mystery. This idea is a good premise and not yet an adventure situation.",
        },
        {
          term: "After one round of development",
          text: "The town's supply of dragonbone has just stopped. Two groups want to control what remains: a guild that sells it and a temple that says it should never have been cut. A quarry foreman has stopped sending his crew below because the deep cut is warm to the touch. The players can inspect the cut, guard the temple's stores, negotiate with the guild or trace a shipment. If nobody acts, the guild hires outsiders to dig deeper. One discovery could reframe everything: the bone is not from dragons that died here, but from something that is still under the town and shedding.",
        },
        {
          term: "Why it works",
          text: "The premise did not change and did not need to be more original. Each blank answer was replaced with something the players can act on, and the checks made it obvious which pieces were missing. The original mystery is still there, but now the answer matters to the people in the room.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "What to do when an answer is weak",
      paragraphs: [
        "Weak answers are normal at this stage, and they are the useful outcome of the test. Pick the emptiest question and answer only that one before touching the rest. If you have no pressure, add a deadline or a shortage. If you have no competing goals, split one character's aim into two people who both want it. If the players' options are thin, add a location or object they can reach.",
        "Some ideas resist development because they are really settings or themes. That is fine, but it changes the job. A setting idea needs a situation placed inside it before it can be run, and a theme needs a premise that expresses it. Neither is a reason to abandon the idea.",
        "Try not to fix every gap in advance. You are aiming for enough structure that the first session has a decision in it, and the rest can grow from what the players do with it.",
      ],
      cta: {
        text: "See the full steps for turning an idea into an adventure",
        href: "/answers/how-do-i-turn-an-rpg-idea-into-an-adventure",
      },
    },
    {
      kind: "checklist",
      heading: "Before you commit to the idea",
      intro: "Run this against your notes:",
      items: [
        "Can you state what the premise makes players want to know?",
        "Is something already changing when the party arrives?",
        "Are there at least two parties whose goals conflict?",
        "Could the players do three different things in the first scene?",
        "Do you know one discovery that would change who or what the problem is?",
        "Have you noted what happens if the party does nothing?",
        "If a friend told you this idea, would you want to ask a follow-up question?",
      ],
    },
  ],
  codexConnection: {
    heading: "Developing the idea without replacing it",
    paragraphs: [
      "Start the Idea Developer in Assess mode and paste the premise you already have. It shows what is working, which part of the situation is thin, and what would make it playable without replacing the idea with a different one.",
      "Read the questions it leaves open as decisions for you, not as missing homework for the tool to invent. Once you know which answer you want to develop, you can continue the conversation or take the resulting draft into a generator.",
    ],
    linkText: "Develop this idea with the Idea Developer",
    href: "/tools/idea-developer?from=answer&source=is-my-rpg-campaign-idea-good&mode=assess",
  },
  relatedTools: [
    {
      title: "Adventure generator",
      description:
        "Full adventure concepts with an opening situation, stakes and opposition for ideas that need a structure.",
      href: "/generators/adventure-generator",
    },
    {
      title: "Faction generator",
      description:
        "Groups with competing needs, for ideas that lack people who want different things.",
      href: "/generators/faction",
    },
    {
      title: "Rumour generator",
      description:
        "Conflicting explanations for one event, useful for building the discovery question.",
      href: "/generators/rumour",
    },
    {
      title: "Settlement generator",
      description:
        "A place with people and pressures attached, for ideas that start with a location.",
      href: "/generators/settlement",
    },
    {
      title: "NPC generator",
      description:
        "Characters with goals and secrets, for ideas where nobody yet wants anything.",
      href: "/generators/npc",
    },
  ],
  relatedForPages: [
    {
      title: "Sandbox RPG Campaigns",
      description:
        "Keep situations, factions and consequences connected as the players make their own choices.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "how-do-i-turn-an-rpg-idea-into-an-adventure",
    "how-do-you-create-quest-hooks-without-railroading",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-you-generate-useful-rpg-rumours",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-i-expand-a-simple-rpg-campaign-idea",
  ],
  discovery: {
    id: "answer-is-my-rpg-campaign-idea-good",
    parentCluster: "adventure-design",
    primaryIntent: "is my rpg campaign idea good",
    intentAliases: [
      "is my dnd campaign idea good",
      "how do i know if my rpg idea is good",
      "does my dnd idea need to be original",
      "has my rpg idea been done before",
      "how to test a campaign idea",
    ],
    userJob: "understand",
    uniqueValue:
      "Gives a five-question diagnostic for judging a campaign idea by what it does at the table instead of how original it is, and shows which missing piece to fix first.",
    relatedIntents: [
      "answer-turn-rpg-idea-into-adventure",
      "tool-idea-developer",
      "generator-adventure-generator",
      "generator-adventure-idea-generator",
      "answer-quest-hooks-without-railroading",
      "answer-run-factions-sandbox",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-turn-rpg-idea-into-adventure",
        reason:
          "This page diagnoses whether an idea is workable and which piece is missing; the other page is the step-by-step procedure for building the playable situation.",
      },
    ],
  },
  seo: {
    title: "Is my RPG campaign idea good? Five questions | Codex Cryptica",
    description:
      "Originality is not the test. Check an RPG or D&D campaign idea against five questions on curiosity, pressure, competing goals, player actions and discovery.",
    image:
      "https://assets.codexcryptica.com/og/is-my-rpg-campaign-idea-good.jpg",
    imageAlt:
      "A game master reading handwritten campaign notes beside a lantern, with a sketched bone-walled town map and faction tokens on the table",
  },
};
