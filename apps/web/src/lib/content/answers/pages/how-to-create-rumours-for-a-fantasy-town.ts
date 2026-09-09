import type { AnswerConfigInput } from "../schema";

export const howToCreateRumoursForAFantasyTown: AnswerConfigInput = {
  slug: "how-to-create-rumours-for-a-fantasy-town",
  category: "worldbuilding",
  publishedAt: "2026-09-08",
  question: "How do you create rumours for a fantasy town?",
  kind: "framework",
  shortAnswer:
    "Create fantasy-town rumours by tying each one to a named source, a local tension, and a consequence the party can discover or change. Write a small mix of true, distorted, and false reports, but make every one point towards a person, place, object, or event the players can pursue. The useful question is not whether a rumour is accurate, but why this speaker believes it and what changes if the party repeats, tests, or ignores it.",
  sections: [
    {
      kind: "prose",
      heading: "Give every rumour a job",
      paragraphs: [
        "A rumour should move the table somewhere. 'The old mill is haunted' has a mood, but it gives the party little to do. 'Miller Venn has stopped opening the west sluice because something in the water calls his dead son's name' gives them a place, a person, a problem, and a reason the story is spreading now.",
        "Begin with a tension already present in town: an unpaid tax, a missing child, a disputed inheritance, a failing harvest, a feud between guilds, or a new patrol at the gate. Then decide who has noticed a fragment of it. The witness, exaggeration, lie, and misunderstanding all become rumours with different uses. Players can investigate the same situation from several directions without being handed the answer by one perfectly informed stranger.",
      ],
    },
    {
      kind: "list",
      heading: "Build each rumour from five parts",
      intro:
        "Write one sentence for each part. If a rumour lacks a source or consequence, it will probably vanish after the first tavern scene.",
      items: [
        {
          term: "The pressure",
          text: "Choose the problem causing people to talk. A shipment is late, a family has gained money too quickly, the watch has begun searching carts, or a local shrine has closed its doors.",
        },
        {
          term: "The source",
          text: "Name the person or group passing it on and what they stand to gain. A brewer wants customers to avoid a rival inn, a child repeats a warning overheard at home, and a guard wants the town to fear the woods rather than the watch.",
        },
        {
          term: "The claim",
          text: "Make the report concrete enough to test. Include a place, name, item, or time. 'A red lantern burns in the abandoned tollhouse after midnight' is more useful than 'strange things happen outside town'.",
        },
        {
          term: "The truth level",
          text: "Mark it true, distorted, or false in your notes. A distorted rumour should contain a useful fact bent by fear, loyalty, incomplete knowledge, or deliberate omission. A false rumour still needs a reason somebody is saying it.",
        },
        {
          term: "The consequence",
          text: "Decide what happens if the party follows, spreads, disproves, or ignores it. The source might lose standing, a faction might accelerate its plan, or the real danger might reach the market before the next session.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: The bell under Brambleford",
      paragraphs: [
        "Brambleford's bridge toll has doubled after a string of disappearances near the river. These three rumours point at the same local problem, but each comes with a different source and risk.",
      ],
      items: [
        {
          term: "True rumour",
          text: "Old Pella, who sells eels by the bridge, says the toll collector visits the abandoned river shrine every third night with a covered lantern. She saw him go in after hearing a bell beneath the water. This is true: he is paying a river spirit for safe crossings while hiding the deal from the town council.",
        },
        {
          term: "Distorted rumour",
          text: "A ferryman claims the collector is feeding travellers to a monster. He saw a wagon vanish in fog and knows the collector was nearby, but the wagon was diverted to a hidden landing so smugglers could avoid the toll. The bell is real, the collector is involved, and the alleged sacrifice is not.",
        },
        {
          term: "False rumour",
          text: "The bridge guard tells visitors that witches from the north bank cursed the river. He wants strangers to stop asking why his patrols wave selected carts through without payment. The story is false, but repeating it makes the north-bank herb gatherers angry and gives the guard cover for another night of smuggling.",
        },
        {
          term: "Why it works",
          text: "Every version points towards the shrine, bridge, collector, or guards. The party can learn something from any source, but acting on a claim changes who trusts them and how quickly the smugglers respond. The falsehood creates a social cost rather than a dead end.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Let rumours change after the party hears them",
      paragraphs: [
        "Do not treat a rumour table as a stack of static quest notices. Once the party asks questions, a source can become nervous, a faction can plant a stronger lie, or a previously private fact can become public. Keep a short note beside each rumour showing who has heard it and what the next visible sign will be.",
        "Rumours also reveal character. The innkeeper tells a careful version because she needs the watch to keep drinking at her bar. The gravedigger tells the ugliest version because he has seen enough bodies to assume the worst. Their wording lets the town speak before the party knows its politics in full.",
      ],
    },
    {
      kind: "checklist",
      heading: "Fantasy-town rumour checklist",
      intro:
        "Before the party reaches the market or tavern, check that your rumours can survive contact with player questions.",
      items: [
        "Does every rumour name a source the party can question, reward, threaten, or protect?",
        "Does every claim point towards a place, person, object, or event the party can investigate?",
        "Do you have a mix of true, distorted, and false reports rather than six versions of the same truth?",
        "Can you explain why each source believes or repeats the rumour?",
        "What changes in town if the party follows the lead, spreads it, or leaves it alone?",
        "Which rumour will become louder, disappear, or prove costly by the next session?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep rumours attached to the people who spread them",
    paragraphs: [
      "Use the Rumour Generator to draft claims and leads, then use the Settlement, Tavern, and News Sheet generators to give them town context and public versions. Link each rumour to its source, subject, and likely consequence in your campaign notes. When the party exposes a lie or backs a faction, those connections show which source changes their story next.",
    ],
    linkText: "Try the Rumour Generator",
    href: "/generators/rumour",
  },
  relatedTools: [
    {
      title: "Rumour Generator",
      description:
        "Draft actionable local rumours with hooks that you can connect to a town's people, places, and current trouble.",
      href: "/generators/rumour",
    },
    {
      title: "Settlement generator",
      description:
        "Create a town with a local economy, tensions, authority figures, and places where news travels.",
      href: "/generators/settlement",
    },
    {
      title: "Tavern generator",
      description:
        "Build the inn, staff, patrons, and pressure points where a rumour can change hands.",
      href: "/generators/tavern",
    },
    {
      title: "News sheet generator",
      description:
        "Write a public version of local events that can omit facts, favour a faction, or start a fresh rumour.",
      href: "/generators/news-sheet-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Keep settlements, factions, NPCs, and unresolved local trouble connected across a campaign.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "what-should-an-rpg-settlement-contain",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-to-write-an-in-world-newspaper-for-an-rpg",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-do-you-generate-useful-rpg-rumours",
  ],
  labels: ["fantasy"],
  discovery: {
    id: "answer-create-fantasy-town-rumours",
    parentCluster: "settlement-creation",
    clusters: ["rumour", "settlement-creation"],
    primaryIntent: "how to create rumours for a fantasy town",
    intentAliases: [
      "fantasy town rumour table",
      "how to write rpg town rumours",
      "fantasy rumour ideas for a town",
    ],
    uniqueValue:
      "A source-and-consequence rumour method that makes true, distorted, and false reports actionable, so each one leads to an investigation and changes the town when the party acts on it.",
    relatedIntents: [
      "answer-settlement-contents",
      "answer-sandbox-campaign-prep",
      "generator-rumour",
      "generator-settlement",
      "generator-tavern",
      "generator-news-sheet-generator",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-settlement-contents",
        reason:
          "The settlement answer prepares the town's locations, economy, people, and local problem, while this page builds the information network that reveals and changes those elements.",
      },
      {
        with: "answer-sandbox-campaign-prep",
        reason:
          "The sandbox answer uses a compact set of rumours as part of regional campaign preparation, while this page explains how to write and update each rumour inside one fantasy town.",
      },
      {
        with: "answer-cyberpunk-city-district",
        reason:
          "The cyberpunk district answer designs the physical and political structure of one district, while this page designs the rumour sources and consequences that make information travel through a fantasy town.",
      },
    ],
  },
  seo: {
    title: "How to Create Rumours for a Fantasy Town | Codex Cryptica",
    description:
      "Write useful fantasy-town rumours with sources, true and false claims, local tension, consequences, and leads players can investigate.",
    image:
      "https://assets.codexcryptica.com/og/how-to-create-rumours-for-a-fantasy-town.jpg",
    imageAlt:
      "Town residents exchange news in a candlelit fantasy tavern while rain falls outside",
  },
};
