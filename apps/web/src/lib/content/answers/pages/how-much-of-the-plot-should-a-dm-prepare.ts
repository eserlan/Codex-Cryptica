import type { AnswerConfigInput } from "../schema";

export const howMuchOfThePlotShouldADmPrepare: AnswerConfigInput = {
  slug: "how-much-of-the-plot-should-a-dm-prepare",
  category: "session-prep",
  publishedAt: "2026-09-26",
  question: "How much of the plot should a DM prepare?",
  kind: "framework",
  shortAnswer:
    "Prepare what the world is doing, not what the players will do. Write down what would happen if the players did nothing, then let their actions change it. Note external events, actors' current plans and conditional triggers; keep player-dependent outcomes as questions, not answers. You can plan a long way ahead this way, because you are planning a situation that keeps moving rather than a story the players are expected to walk through.",
  sections: [
    {
      kind: "prose",
      heading: "Plot in a tabletop game is what the players do about the world",
      paragraphs: [
        "A novelist controls every character, so plot means a planned chain of scenes. A GM controls the world and the people in it, but not the player characters, so a chain of scenes prepared in advance only works if the players choose exactly what the GM expected. When they do not, the GM either abandons the notes or steers the table back onto them, and steering is where railroading starts.",
        "That does not make advance planning a mistake. Many campaigns feel alive because the GM knew a great deal in advance: which faction was about to move, when the harvest would fail, who was plotting against whom. Wars can begin, rulers can die, alliances can shift and disasters can unfold while factions act independently. This supports player agency as long as the players can affect the causes or consequences, or choose how to respond. The useful line runs between the world's momentum, which you can prepare, and the party's path through it, which you cannot.",
      ],
    },
    {
      kind: "list",
      heading: "Three kinds of prep: firm, conditional and open",
      intro:
        "Write events and triggers as plans. Keep player-dependent outcomes as questions rather than answers:",
      items: [
        {
          term: "Prepare firmly",
          text: "Firm prep covers external events and scheduled intentions. External events the PCs cannot reasonably prevent include an eclipse, winter or a tidal event. Scheduled intentions are what actors currently plan to do: an army crosses the border on the 12th, a coronation takes place at the festival, a rival sails at dawn or a council votes next week. Even a legal deadline holds only while the law stands. Treat each scheduled event as the default if nobody interferes, not an immutable outcome; note what could delay, redirect or prevent it, and what follows afterwards.",
        },
        {
          term: "Prepare conditionally",
          text: "Developments that follow from a trigger. If the cult finishes its ritual unopposed, the river floods. If the ambassador dies, the alliance collapses. Write the trigger and the consequence, not the scene where it happens, because you do not know which scene it will be.",
        },
        {
          term: "Leave open",
          text: "What the players choose to engage with, how they solve each problem, which NPCs survive, and how the campaign ends. These can be useful questions to keep in your notes; leave their answers unwritten. If you find yourself writing 'then the party...', delete the sentence and write what the world does at that moment instead.",
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
          text: "If nothing changes before then, the invading army crosses the border on the 12th of Frostfall. The northern road closes, grain prices in the capital double within a fortnight, and the border lords must choose whether to kneel or resist. If the players assassinate the general, destroy the bridge, negotiate a treaty or warn the border lords, the event and its consequences change accordingly.",
        },
        {
          term: "Over-plotted prep",
          text: "The party fights the vanguard at Fort Harrow, loses, retreats to the capital, meets General Sarn, and is sent on a quest to recover the Sunspear.",
        },
        {
          term: "Why it works",
          text: "The first version sets out what happens if nobody interferes, changes the strategic situation and hands the table a problem. The second writes the players' side of the story before they have sat down, and it collapses the moment they skip the fort.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: a campaign timeline with momentum",
      paragraphs: [
        "Five entries are enough to give a campaign direction. For each future event, write what happens if nobody interferes, then note what could change it. None says what the players do.",
      ],
      items: [
        {
          term: "Scheduled: the coronation of the new Regent",
          text: "The Regent plans to be crowned on the last night of the harvest festival. If nobody changes those plans, every noble house will be in the city, making it the natural place for things to go wrong. The party could still delay or prevent the coronation.",
        },
        {
          term: "Conditional: the Merchant League moves on the docks",
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
          text: "The setting has momentum: dates approach, pressures build, and ignored problems get worse. Because these are default events and triggers rather than scenes, the party can meet any of them from any direction, change what happens and affect how the world responds. The more consequential an event is, the more chances the players should have to hear rumours, see preparations or discover warning signs before it arrives.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "How far ahead to plan",
      paragraphs: [
        "Plan as far ahead as you can name something that would change the world without the party. Far ahead, note intentions and pressures; nearer, sharpen the likely consequences and active actors; for the next session, prepare runnable detail. For most tables that is a rough shape for the campaign's next arc, a sharper picture of the next few sessions, and full detail only for the session in front of you. There is no correct number of sessions; the useful test is whether each planned item is an event or trigger you could reuse if the players went somewhere else.",
        "Detail should get thinner the further away it is. A vague pressure two arcs out costs almost nothing to revise, while a fully written scene that the players never reach is prep you cannot get back. If you catch yourself writing dialogue for a scene several sessions ahead, you are probably planning a story instead of a situation.",
      ],
    },
    {
      kind: "prose",
      heading: "Revising the plan after player choices",
      paragraphs: [
        "Player choices should change your timeline, and that is the system working. After each session, check the external events and scheduled intentions first: did anything the party did move a date, remove a cause or make an event unnecessary? Then check each trigger, and mark the ones that fired, the ones that can no longer fire and the ones that need a new consequence.",
        "Keep the events that still make sense and change their consequences rather than deleting them. If the party killed the envoy, the coronation can still happen on schedule, but now it takes place without her and with the northern lords in a different mood.",
      ],
    },
    {
      kind: "checklist",
      heading: "Campaign prep checklist",
      intro: "Before you finish planning the next stretch of the campaign:",
      items: [
        "Every planned item is either an event with a date or stage, or a trigger with a consequence.",
        "No item depends on the party choosing a particular action, location or ally.",
        "The more consequential an event is, the more chance the players have to hear rumours, see preparations or discover warning signs before it happens.",
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
    "how-do-i-plan-story-arcs-for-an-rpg-campaign",
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
      "Prepare what the world is doing, not what the players will do. External events, scheduled intentions, conditional triggers, a worked timeline and how far ahead a DM should plan.",
    image:
      "https://assets.codexcryptica.com/og/how-much-of-the-plot-should-a-dm-prepare.jpg",
    imageAlt:
      "A Game Master's table with a calendar of dated events, wax-sealed letters and faction tokens laid out beside a hand-drawn campaign map",
  },
};
