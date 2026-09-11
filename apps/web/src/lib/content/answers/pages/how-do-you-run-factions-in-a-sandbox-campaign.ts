import type { AnswerConfigInput } from "../schema";

export const howDoYouRunFactionsInASandboxCampaign: AnswerConfigInput = {
  slug: "how-do-you-run-factions-in-a-sandbox-campaign",
  category: "session-prep",
  publishedAt: "2026-09-07",
  question: "How do you run factions in a sandbox campaign?",
  kind: "framework",
  shortAnswer:
    "Running factions in a sandbox means giving each one a goal, a resource it defends, a rival it is losing ground to, and a scheduled move it makes whether or not the party is watching, then surfacing that move through a visible consequence the players can react to. Treat every faction as a clock that keeps advancing between sessions rather than a paragraph of static lore, and the sandbox starts to feel like it moves on its own.",
  sections: [
    {
      kind: "prose",
      heading: "Static lore does not push back",
      paragraphs: [
        "A faction write-up that lists a founder, a symbol and a motto tells you nothing about what happens if the party ignores it for three sessions. The test of a faction meant to run in a sandbox is whether it changes the world on its own schedule, not whether it has enough backstory to justify existing.",
        "Most factions stall on the page because the GM treats them as an answer to 'who lives here' rather than as something that keeps moving after the scene ends. A faction that only reacts when the party walks into its scene is furniture. A faction that acts on a schedule, gains or loses ground, and leaves evidence behind is pressure the players have to respond to.",
      ],
    },
    {
      kind: "list",
      heading: "Four things every active faction needs",
      intro:
        "Skip the founding myth and the heraldry until the faction has these on file:",
      items: [
        {
          term: "A goal specific enough to finish",
          text: "Not 'gain power', but 'seize the grain contract before the first frost'. A goal you cannot tell has succeeded or failed is a mood, not a goal.",
        },
        {
          term: "A resource worth losing",
          text: "Territory, coin, an informant network, a monopoly on river tolls. Name the thing the party can actually take from the faction, or nothing is at stake when they interfere.",
        },
        {
          term: "A rival it is losing ground to",
          text: "A faction with no rival has no reason to move this week rather than next year. The rival supplies urgency: the clock is ticking because someone else is reaching for the same resource.",
        },
        {
          term: "A scheduled move",
          text: "Write down what the faction does at the next milestone (end of the week, the next full moon, the harvest) if nobody interferes. This is the line that turns a description into a countdown.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the same guild, two ways",
      paragraphs: [
        "A wharf guild controls loading rights on the only working dock in a river town. Compare how it plays out as static lore against how it plays out as an active faction.",
      ],
      items: [
        {
          term: "The static lore version",
          text: "The GM's notes describe the guild's founding charter, its guildmaster's family history, and its ceremonial barge. None of it changes unless the party visits the dock and asks. Six sessions pass with the guild untouched, because nothing forces it onto the table.",
        },
        {
          term: "The active pressure version",
          text: "The guild's goal is to force out an independent boatwright undercutting its rates; its resource is the loading queue it controls; its rival is the boatwright's growing customer list; its scheduled move is to petition the harbourmaster for exclusive rights at the autumn assize. If the party does nothing, the petition succeeds: prices at the dock rise, the boatwright is barred from the water, and a dispossessed crew starts looking for anyone willing to hire them.",
        },
        {
          term: "Why it works",
          text: "The consequence is visible without a cutscene: higher prices, a barred boatwright, unemployed sailors looking for work. Players who never spoke to the guild directly still feel the outcome, which gives them a reason to go back and intervene next time.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Make the move visible without announcing it",
      paragraphs: [
        "A scheduled move only works if the players can notice it happened. Resist the urge to deliver it as a briefing. Let it arrive as a price change, a new patrol route, a rumour at the tavern, a guard checking papers who was not checking them last week. The players should be able to piece together what a faction did from the evidence it left, the same way they would piece together a burglary from an open window.",
        "Keep the bookkeeping light. A faction turn does not need a spreadsheet: a single line per faction (goal, resource, rival, next move, and what happened last time) is enough to run several factions in parallel without it becoming accounting work between sessions.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before you bring a faction to the table",
      intro: "Confirm each active faction has an answer to all five:",
      items: [
        "A goal specific enough that you could tell someone whether it succeeded.",
        "A resource the party could plausibly take, block, or destroy.",
        "A named rival it is currently losing ground to.",
        "A scheduled move written down before the session, not improvised during it.",
        "A visible consequence planned for if that move goes unopposed.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping faction pressure straight across a sandbox",
    paragraphs: [
      "The moment a sandbox has three or four factions each running their own schedule, tracking goals, rivals and outstanding moves in prose notes stops working. Codex Cryptica's campaign graph holds each faction as an entity with real connections to the resources it controls, the rivals it opposes and the NPCs it employs, so a scheduled move shows up as a change to those connections rather than a line you have to remember to reread.",
      "The faction generator is a fast way to get the goal, resource and rival on the page when you are starting from nothing; the collision with your other factions and the consequence when the move lands are still yours to write.",
    ],
    linkText: "Try the faction generator",
    href: "/generators/faction",
  },
  relatedTools: [
    {
      title: "Faction generator",
      description:
        "Free, no login. Produces a goal, an obstacle and a method you can edit into shape.",
      href: "/generators/faction",
    },
    {
      title: "Council vote generator",
      description:
        "Turns a faction's next move into a scene: who votes which way, and what changes their mind.",
      href: "/generators/council-vote",
    },
    {
      title: "Quest hook generator",
      description:
        "Turns a faction's scheduled move into a hook the party can pick up before or after it lands.",
      href: "/tools/quest-hook-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Sandbox RPG Campaigns",
      description:
        "Manage player-directed sandbox campaigns with live relationship maps and faction tracking.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-you-organise-npc-relationships",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-track-faction-turns-between-rpg-sessions",
    "how-do-you-run-an-rpg-campaign-in-one-city",
    "how-do-you-handle-players-going-off-script-as-a-gm",
  ],
  discovery: {
    id: "answer-run-factions-sandbox",
    parentCluster: "faction-creation",
    primaryIntent: "how to run factions in a sandbox campaign",
    intentAliases: [
      "running factions in a tabletop campaign",
      "faction pressure sandbox rpg",
      "how to make factions active in a campaign",
    ],
    uniqueValue:
      "A four-part framework (goal, resource, rival, scheduled move) for treating factions as clocks that keep advancing between sessions, with a before/after worked example and a visible-consequence technique.",
    relatedIntents: [
      "answer-fantasy-faction",
      "answer-sandbox-campaign-prep",
      "generator-faction",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-fantasy-faction",
        reason:
          "That page covers designing a faction from scratch (goal, obstacle, recruits, limits, assets, next move). This page assumes a faction already exists and covers running it as ongoing pressure across a sandbox: scheduling its move, surfacing the consequence, and keeping several factions moving in parallel between sessions.",
      },
      {
        with: "answer-track-faction-turns-between-sessions",
        reason:
          "That page provides the concrete five-step downtime procedure (intent, action, outcome, consequence, history) for resolving off-screen faction clashes and updating the campaign timeline. This page covers running factions as continuous active pressure in a sandbox using the goal/resource/rival/scheduled-move concept.",
      },
    ],
  },
  seo: {
    title: "How do you run factions in a sandbox campaign? | Codex Cryptica",
    description:
      "A four-part framework for running factions as active pressure in a sandbox: goal, resource, rival, and scheduled move, with a worked before/after example.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-run-factions-in-a-sandbox-campaign.jpg",
    imageAlt:
      "Two rival faction banners crossed over a river town dock map with wooden tokens marking contested territory",
  },
};
