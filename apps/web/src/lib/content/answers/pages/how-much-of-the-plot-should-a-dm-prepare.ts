import type { AnswerConfigInput } from "../schema";

export const howMuchOfThePlotShouldADmPrepare: AnswerConfigInput = {
  slug: "how-much-of-the-plot-should-a-dm-prepare",
  category: "session-prep",
  publishedAt: "2026-09-26",
  question: "How much of the plot should a DM prepare?",
  kind: "framework",
  shortAnswer:
    "Prepare what the world is doing, not what the players will do. Fix the events and pressures that would happen without the party (an army crosses a border, a ritual finishes, a ruler dies), write down the developments that trigger only if something specific happens, and leave every player decision, solution and outcome unwritten. You can plan a long way ahead this way, because you are planning a situation that keeps moving rather than a story the players are expected to walk through.",
  sections: [
    {
      kind: "prose",
      heading: "Plot in a tabletop game is what the players do about the world",
      paragraphs: [
        "A novelist controls every character, so plot means a planned chain of scenes. A GM controls the world and the people in it, but not the player characters, so a chain of scenes prepared in advance only works if the players choose exactly what the GM expected. When they do not, the GM either abandons the notes or steers the table back onto them, and steering is where railroading starts.",
        "That does not make advance planning a mistake. Many campaigns feel alive because the GM knew a great deal in advance: which faction was about to move, when the harvest would fail, who was plotting against whom. The useful line runs between the world's momentum, which you can prepare, and the party's path through it, which you cannot.",
      ],
    },
    {
      kind: "list",
      heading: "Three kinds of prep: firm, conditional and open",
      intro:
        "Sort everything you are tempted to plan into one of these, and only write down the first two:",
      items: [
        {
          term: "Prepare firmly",
          text: "Events and forces that do not depend on the party: a coronation on a known date, an eclipse, an invasion, a famine, a rival's scheduled departure. Give each a rough date or a clear stage of progress. They are the fixed points the players push against.",
        },
        {
          term: "Prepare conditionally",
          text: "Developments that follow from a trigger. If the cult finishes its ritual unopposed, the river floods. If the ambassador dies, the alliance collapses. Write the trigger and the consequence, not the scene where it happens, because you do not know which scene it will be.",
        },
        {
          term: "Leave open",
          text: "What the players choose to engage with, how they solve each problem, which NPCs survive, and how the campaign ends. If you find yourself writing 'then the party...', delete the sentence and write what the world does at that moment instead.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Events versus outcomes",
      paragraphs: [
        "The same invasion can be prepared in two very different ways:",
      ],
      items: [
        {
          term: "Good campaign prep",
          text: "On the 12th of Frostfall, the invading army crosses the border. The northern road closes, grain prices in the capital double within a fortnight, and the border lords must choose whether to kneel or resist.",
        },
        {
          term: "Over-plotted prep",
          text: "The party fights the vanguard at Fort Harrow, loses, retreats to the capital, meets General Sarn, and is sent on a quest to recover the Sunspear.",
        },
        {
          term: "Why it works",
          text: "The first version changes the strategic situation and hands the table a problem. The second writes the players' side of the story before they have sat down, and it collapses the moment they skip the fort.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: a campaign timeline with momentum",
      paragraphs: [
        "Five entries are enough to give a campaign direction. Only the first is a fixed date, and none of them says what the players do.",
      ],
      items: [
        {
          term: "Fixed: the coronation of the new Regent",
          text: "It happens on the last night of the harvest festival whether or not the party attends. Every noble house will be in the city, which makes it the natural place for things to go wrong.",
        },
        {
          term: "Likely: the Merchant League moves on the docks",
          text: "If the tariff dispute is still unresolved after the coronation, the League closes the harbour. If someone has settled it, the League waits and the pressure shifts to smuggling.",
        },
        {
          term: "Conditional: the cult completes its ritual",
          text: "If nobody has disrupted the cult by midwinter, the lower wards begin to flood at night. If the party has raided the crypt, the ritual is delayed and the cult turns on whoever raided it.",
        },
        {
          term: "Conditional: the alliance collapses",
          text: "If Envoy Talis dies, the northern lords withdraw their troops from the city. If she lives, they stay, and one of them starts asking for a favour in return.",
        },
        {
          term: "Open: what the players go after",
          text: "The party might chase the cult, work the docks, guard the envoy or leave for another country. Each choice meets a world that has already been moving, and none of them is the one you must prepare for.",
        },
        {
          term: "Why it works",
          text: "The setting has momentum: dates approach, pressures build, and ignored problems get worse. Because the entries are events and triggers rather than scenes, the party can meet any of them from any direction without the plot needing to bend.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "How far ahead to plan",
      paragraphs: [
        "Plan as far ahead as you can name something that would change the world without the party. For most tables that is a rough shape for the campaign's next arc, a sharper picture of the next few sessions, and full detail only for the session in front of you. There is no correct number of sessions; the useful test is whether each planned item is an event or trigger you could reuse if the players went somewhere else.",
        "Detail should get thinner the further away it is. A vague pressure two arcs out costs almost nothing to revise, while a fully written scene that the players never reach is prep you cannot get back. If you catch yourself writing dialogue for a scene several sessions ahead, you are probably planning a story instead of a situation.",
      ],
    },
    {
      kind: "prose",
      heading: "Revising the plan after player choices",
      paragraphs: [
        "Player choices should change your timeline, and that is the system working. After each session, check the fixed events first: did anything the party did move a date, remove a cause or make an event unnecessary? Then check each trigger, and mark the ones that fired, the ones that can no longer fire and the ones that need a new consequence.",
        "Keep the events that still make sense and change their consequences rather than deleting them. If the party killed the envoy the coronation still happens, but now it happens without her and with the northern lords in a different mood.",
      ],
    },
    {
      kind: "checklist",
      heading: "Campaign prep checklist",
      intro: "Before you finish planning the next stretch of the campaign:",
      items: [
        "Every planned item is either an event with a date or stage, or a trigger with a consequence.",
        "No item depends on the party choosing a particular action, location or ally.",
        "At least one fixed event will be visible to the players before it happens, so they have a chance to respond.",
        "Each conditional entry says what happens if the trigger never fires as well as if it does.",
        "Anything planned more than a few sessions ahead is a pressure or a date, not a scene.",
        "You know which entries to revisit after the next session, and roughly what would change them.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping events, triggers and consequences in one place",
    paragraphs: [
      "A campaign timeline of fixed events and conditional triggers is easier to maintain when each entry is linked to the factions, people and places it affects. In Codex Cryptica you can attach events to those entities on your campaign graph, so when a session changes something you can see which planned developments it touches.",
    ],
    linkText: "Explore the Sandbox RPG Campaign Manager",
    href: "/for/sandbox-campaigns",
  },
  relatedTools: [
    {
      title: "Adventure Generator",
      description:
        "Draft an adventure situation with pressures and stakes to build a timeline around.",
      href: "/generators/adventure-generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create factions with goals and scheduled moves that drive fixed and conditional events.",
      href: "/generators/faction",
    },
    {
      title: "Rumour Generator",
      description:
        "Turn upcoming events into rumours the players can hear before they happen.",
      href: "/generators/rumour",
    },
  ],
  relatedForPages: [
    {
      title: "Sandbox RPG Campaigns",
      description:
        "Manage player-directed campaigns with live relationship maps and faction tracking.",
      href: "/for/sandbox-campaigns",
    },
    {
      title: "Fantasy Worldbuilding",
      description:
        "Build fantasy settings with linked places, factions and lore.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-i-start-gming-for-the-first-time",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-i-turn-an-rpg-idea-into-an-adventure",
    "how-do-i-prepare-an-rpg-session-step-by-step",
    "how-do-you-track-faction-turns-between-rpg-sessions",
    "how-do-you-manage-a-campaign-timeline-in-an-rpg",
    "how-do-you-create-quest-hooks-without-railroading",
  ],
  discovery: {
    id: "answer-how-much-plot-should-a-dm-prepare",
    parentCluster: "adventure-design",
    primaryIntent: "how much of the plot should a dm prepare",
    intentAliases: [
      "how much should a dm plan ahead",
      "how much of a campaign should i plan in advance",
      "how far ahead should a dm plan",
      "should a dm plan the whole campaign",
      "how to plan a campaign without railroading",
    ],
    uniqueValue:
      "Separates campaign-scale planning into fixed world events, conditional triggers and open player outcomes, with a worked timeline and guidance on how far ahead to plan, so a GM can plan a long way without scripting the players.",
    relatedIntents: [
      "answer-session-prep",
      "answer-turn-rpg-idea-into-adventure",
      "answer-manage-campaign-timeline",
    ],
  },
  seo: {
    title: "How much of the plot should a DM prepare? | Codex Cryptica",
    description:
      "Prepare what the world is doing, not what the players will do. Fixed events, conditional triggers, a worked timeline and how far ahead a DM should plan.",
    image:
      "https://assets.codexcryptica.com/og/how-much-of-the-plot-should-a-dm-prepare.jpg",
    imageAlt:
      "A Game Master's table with a calendar of dated events, wax-sealed letters and faction tokens laid out beside a hand-drawn campaign map",
  },
};
