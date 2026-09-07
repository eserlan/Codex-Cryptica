import type { AnswerConfigInput } from "../schema";

export const howDoYouManageACampaignTimelineInAnRpg: AnswerConfigInput = {
  slug: "how-do-you-manage-a-campaign-timeline-in-an-rpg",
  category: "campaign-notes",
  publishedAt: "2026-09-07",
  question: "How do you manage a campaign timeline in an RPG?",
  kind: "framework",
  shortAnswer:
    "Log every event with the most precise date you actually know, not the date you wish you knew: exact when a session pins it down, a season or a year when it does not, and a relative marker such as 'three days after the fire' when there is no calendar yet at all. Attach each entry to the entities it involves rather than burying it in a prose recap, and the timeline answers 'what happened, and when' without you rereading six sessions of notes.",
  sections: [
    {
      kind: "prose",
      heading: "A recap document is not a timeline",
      paragraphs: [
        "Session recaps record what the players did in order. A timeline records what happened in the world in order, and those two are not the same list. A recap tells you the party burned the customs house on a Tuesday session. A timeline tells you the customs house burned on the fourteenth of Harvestmoon, three days before the tax caravan was due, which is the fact you actually need six sessions later when someone asks why the roads are full of unpaid guards.",
        "The usual failure is trying to build the second list by searching the first. Chat logs and session notes are written for narrative flow, not for lookup, so a GM who only has recaps ends up scrolling for twenty minutes to answer 'how long ago did the baron die', then gives an answer that contradicts something said three sessions earlier.",
      ],
    },
    {
      kind: "list",
      heading: "Four kinds of date a campaign timeline actually needs",
      intro:
        "Most timelines break because they assume every event has a clean calendar date. Plan for all four:",
      items: [
        {
          term: "Exact dates",
          text: "Anything pinned to a session where the party had a working calendar: 'the ambush happened on the 3rd of Frostfall, Year 12'. These are rare early in a campaign and common later, once a calendar exists to pin things to.",
        },
        {
          term: "Relative dates",
          text: "Anchored to another event rather than a calendar: 'two weeks after the coronation' or 'the same night as the fire'. Record the anchor and the offset rather than guessing at an absolute date you do not have.",
        },
        {
          term: "Approximate dates",
          text: "A season, a year, or 'sometime during the siege' when that is genuinely all anyone knows in-world. Mark it as approximate rather than inventing a false precision that later contradicts a session where the exact date does turn up.",
        },
        {
          term: "Future and scheduled dates",
          text: "Events that have not happened yet but are already fixed: a wedding, an eclipse, a faction's next move. These belong on the same timeline as past events, not in a separate to-do list, because the party plans around them the same way they react to history.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the baron's death, tracked two ways",
      paragraphs: [
        "The baron is assassinated partway through a campaign. Compare tracking it in a recap document against tracking it as a dated, linked timeline entry.",
      ],
      items: [
        {
          term: "The recap-only version",
          text: "'Session 14: the party arrived in town to find the baron had been killed the night before.' Four sessions later, a player asks how long the regency council has been in charge. The GM has to reopen session 14's notes, count forward manually, and hope nothing since has quietly assumed a different gap.",
        },
        {
          term: "The timeline entry version",
          text: "An entry dated the 9th of Frostfall, linked to the baron, the regency council, and the assassin's faction, tagged as exact because a session pinned it to a specific night. When the council's mandate ('ninety days from the baron's death') comes up four sessions later, the GM reads the gap straight off the timeline instead of reconstructing it.",
        },
        {
          term: "Why it works",
          text: "The date and the entities it touches live in one place instead of scattered across a session's worth of prose. Anyone, including a GM returning after a two-month break, can answer 'when' and 'who was involved' without rereading the recap.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Link events to entities, not just to a date",
      paragraphs: [
        "A date on its own tells you when something happened. A date attached to the baron, the regency council, and the assassin's faction tells you when, to whom, and with what consequences, which is the version you actually need mid-session. If your timeline tool cannot link an entry to more than one entity, you will end up duplicating the same event under every name it touches, which is worse than not tracking it at all.",
        "Keep the timeline separate from downtime bookkeeping such as dungeon turns or travel watches. Those track pacing during a session; the timeline tracks what is now permanently true about the world. Mixing the two turns a lookup tool into a session log nobody wants to scroll through.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before you trust your campaign timeline",
      intro: "Confirm your timeline setup covers all of this:",
      items: [
        "Every entry records how precisely its date is known: exact, relative to another event, or approximate.",
        "Scheduled future events sit on the same timeline as past ones, not in a separate note.",
        "Each entry is linked to the entities involved, not just described in a caption.",
        "You can answer 'how long ago did X happen' without rereading old session recaps.",
        "The timeline is separate from your in-session pacing tools (dungeon turns, travel watches).",
      ],
    },
  ],
  codexConnection: {
    heading: "Timeline entries that stay linked to the world",
    paragraphs: [
      "Codex Cryptica's timeline marks each entry as exact or approximate rather than forcing every event onto a calendar it may not have yet, and each entry connects directly to the entities involved, so the baron's death shows up on his page, the regency council's page, and the assassin's faction's page without being written out three times. Scheduled future events sit on the same view as past ones, so an eclipse or a wedding is as visible as last session's ambush.",
      "Because entries are graph connections rather than isolated notes, asking how long ago something happened is a lookup, not a rereading exercise.",
    ],
    linkText: "See the campaign timeline in Codex Cryptica",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "Faction generator",
      description:
        "Generate factions whose scheduled moves are worth putting on your timeline in advance.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "How factions, locations and history stay connected across a long campaign.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-do-you-keep-track-of-time-in-a-tabletop-campaign",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-organise-npc-relationships",
    "how-do-you-track-faction-turns-between-rpg-sessions",
  ],
  discovery: {
    id: "answer-manage-campaign-timeline",
    parentCluster: "campaign-management",
    primaryIntent: "how to manage a campaign timeline in an rpg",
    intentAliases: [
      "rpg campaign timeline tracker",
      "how to track dated events in a campaign",
      "campaign chronology framework",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A four-kind-of-date framework (exact, relative, approximate, future) for recording campaign chronology as linked, lookup-ready timeline entries instead of prose recaps.",
    relatedIntents: [
      "answer-track-time-in-campaign",
      "answer-campaign-notes",
      "answer-unresolved-plot-hooks",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-track-time-in-campaign",
        reason:
          "That page covers in-fiction pacing during play: dungeon turns, travel watches, and downtime clocks. This page covers recording the world's permanent chronology afterwards: dated events, their precision, and which entities they touch.",
      },
    ],
  },
  seo: {
    title: "How do you manage a campaign timeline in an RPG? | Codex Cryptica",
    description:
      "A framework for tracking RPG campaign chronology: exact, relative, approximate and future dates, linked to the entities each event involves.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-manage-a-campaign-timeline-in-an-rpg.jpg",
    imageAlt:
      "A hand-drawn campaign timeline scroll on a candle-lit desk, marked with wax-sealed date entries beside an inkwell and brass compass",
  },
};
