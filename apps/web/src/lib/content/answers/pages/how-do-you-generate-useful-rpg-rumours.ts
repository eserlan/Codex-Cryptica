import type { AnswerConfigInput } from "../schema";

export const howDoYouGenerateUsefulRpgRumours: AnswerConfigInput = {
  slug: "how-do-you-generate-useful-rpg-rumours",
  category: "session-prep",
  publishedAt: "2026-09-09",
  question: "How do you generate useful RPG rumours?",
  kind: "framework",
  shortAnswer:
    "Generate useful RPG rumours as a six-entry table: four are essentially true, one exaggerates a real situation, and one is a dangerous misconception. Give every entry a named source, a specific site, NPC, faction, or item to pursue, and a consequence if the party follows, repeats, or ignores it. Keep each rumour lighter than a quest hook so players choose what matters.",
  sections: [
    {
      kind: "prose",
      heading: "Make rumours invitations to investigate",
      paragraphs: [
        "A useful rumour gives the players a decision, not a sentence of atmosphere. 'People disappear on the north road' asks them to invent the next question. 'Mara Venn at the tollhouse has been buying every iron bell in town before sunset' gives them a person, a place, an object, and a reason to ask what changed.",
        "Start with something already happening in the campaign: a faction changing tactics, a settlement running short of food, a shrine closing, a stranger asking questions, or a useful item moving through the market. Then decide who noticed part of it and why that person is telling anyone else. The rumour becomes the public edge of a situation the party can approach from several directions.",
      ],
    },
    {
      kind: "list",
      heading: "Use a fixed six-rumour mix",
      intro:
        "The distribution gives uncertainty a shape. The party can trust that the table contains useful information without knowing which line is safe to believe.",
      items: [
        {
          term: "Four essentially true rumours",
          text: "The central claim is reliable, though the source may lack a detail or misunderstand the motive. These entries reward players who follow a lead without making verification pointless.",
        },
        {
          term: "One exaggerated rumour",
          text: "The source has a real fact, but fear, pride, distance, or deliberate spin has distorted it. Investigating should reveal an unexpected complication rather than a complete dead end.",
        },
        {
          term: "One dangerous misconception",
          text: "The claim sounds plausible and is materially wrong. Acting on it at face value should create a social, tactical, or political cost, while careful questions expose a safer route.",
        },
        {
          term: "Six actionable leads",
          text: "Every entry names a person, site, faction, or item the party can visit, question, inspect, follow, steal, protect, or avoid. No entry should depend on a vague 'dark force' with no location or witness.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Anchor every line to the living campaign",
      intro:
        "Write these four notes beside each rumour before you put it in front of the players:",
      items: [
        {
          term: "Source",
          text: "Name the speaker or place where the party hears it. A frightened ferryman, a rival merchant, a shrine attendant, and a bored guard will phrase the same event differently.",
        },
        {
          term: "Claim",
          text: "Write the line the players actually hear. Keep it short enough to repeat and concrete enough to test. Include a name, landmark, object, time, or public event.",
        },
        {
          term: "Truth note",
          text: "Record what is true, what has been distorted, and what the source has omitted. Keep this in GM notes rather than revealing it in the spoken version.",
        },
        {
          term: "Pressure",
          text: "Decide what changes when the party follows, spreads, challenges, or ignores the rumour. Connect that change to a character, settlement, faction, or clock already in play.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: Six words from Lowmere",
      paragraphs: [
        "Lowmere's ferry has started arriving after midnight with its lanterns covered. The following table gives the party six different ways into that local problem without turning any one rumour into an instruction to accept a quest.",
      ],
      items: [
        {
          term: "1. The covered lanterns",
          text: "The ferryman's daughter says the boats hide their lights so the marsh wardens cannot see who crosses. Lead: ferry-master Odo Pell and the west landing. Source: a child who helps coil the ropes. This is essentially true; Odo is avoiding a corrupt patrol that charges illegal night tolls.",
        },
        {
          term: "2. The drowned bell",
          text: "A shrine keeper claims a bell rings beneath the reed beds whenever a traveller is about to die. Lead: the half-sunken bell tower at Saint Orra's cut. Source: a priest who heard one note during a storm. This is essentially true; a submerged warning bell is being pulled by the current, and someone is using its sound to cover movements on the bank.",
        },
        {
          term: "3. The empty barge",
          text: "Market fishers say the black barge at Moorlock Quay carries bodies under its tarpaulin. Lead: the barge and its owner, Sella Voss. Source: two fishers who saw no crew aboard. This is the exaggeration; the barge carries sealed medicine, but Sella is hiding one living stowaway from the magistrate.",
        },
        {
          term: "4. The missing ferryman",
          text: "A guard insists that Odo Pell drowned last winter and that the person running his ferry is a marsh ghost. Lead: Odo's house beside the rope store. Source: a gate guard who has never crossed the river. This is a dangerous misconception; Odo is alive, and confronting him as an undead threat turns a frightened witness into an enemy.",
        },
        {
          term: "5. The reed-cutters' mark",
          text: "A travelling knife-grinder says every third reed bundle bears a red thread for the Lantern League. Lead: the reed market behind the old granary. Source: a trader who wants buyers to use his private landing. This is essentially true; the mark identifies safe paths through a faction's controlled marsh.",
        },
        {
          term: "6. The sealed chest",
          text: "A dockworker says Sella Voss keeps a silver chest that hums when the moon is low. Lead: the locked cabin on the black barge. Source: a deckhand paid to unload it. This is essentially true; the chest contains the magistrate's stolen evidence, and opening it changes who controls the investigation.",
        },
        {
          term: "Why it works",
          text: "All six entries name a lead and a source, but they do different jobs. Four reveal real parts of Lowmere, one adds a complication to a true core, and one warns the GM that a confident player response could make the situation worse. The table creates choices around the ferry, shrine, faction, and magistrate rather than six disconnected quest notices.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep the rumour lighter than a quest hook",
      paragraphs: [
        "A rumour is something people are saying. A quest hook is a situation the party can be asked to resolve, usually with a clearer objective, reward, or deadline. If each rumour already contains an objective, opposition, reward, and encounter sequence, the table becomes six quests and loses the freedom that made overhearing it interesting.",
        "Use rumours to connect the setting's parts. A character can repeat a faction's version of a dispute, a settlement can become the place where that dispute is visible, and an item can carry evidence from one location to another. The party decides which thread deserves more preparation. When a rumour survives a session, update its source and consequence instead of leaving it as a frozen entry on a table.",
      ],
    },
    {
      kind: "prose",
      heading: "See the complete table in context",
      paragraphs: [
        "A finished output makes the distinction easier to judge: player-facing gossip stays brief, GM truth stays separate, and every line still points into a connected situation.",
      ],
      cta: {
        text: "Read the Lowmere rumour table",
        href: "/examples/lowmere-six-words-rumour-table",
      },
    },
    {
      kind: "checklist",
      heading: "RPG rumour prep checklist",
      intro:
        "Run these checks before you read a rumour aloud or add it to a campaign note:",
      items: [
        "Do four of the six entries contain a reliable core, with one exaggeration and one dangerous misconception marked in GM notes?",
        "Does every rumour name a specific person, site, faction, or item the party can pursue?",
        "Can the source explain why they believe the claim or benefit from repeating it?",
        "What changes if the party follows the lead, repeats the story, challenges the source, or does nothing?",
        "Is the entry still a rumour rather than a complete quest with an assigned objective and reward?",
        "Which character, settlement, faction, or item will this line connect to the rest of the campaign?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep generated rumours connected to the campaign",
    paragraphs: [
      "The Rumour Generator produces six local leads with the four true, one exaggerated, and one dangerous model, then keeps the truth notes separate from the player-facing lines. Add the table as one lightweight note and connect its named people, settlements, factions, and items in the graph when a lead becomes part of play. There is no need to invent a separate religion generator for faith-related rumours; the existing faction, pantheon, and secret-society workflows cover the parts that need their own records.",
    ],
    linkText: "Try the Rumour Generator",
    href: "/generators/rumour",
  },
  relatedTools: [
    {
      title: "Rumour Generator",
      description:
        "Generate six local rumours with concrete leads, named sources, and separate GM truth notes.",
      href: "/generators/rumour",
    },
    {
      title: "Settlement Generator",
      description:
        "Build the places, people, pressures, and factions that give local rumours somewhere to lead.",
      href: "/generators/settlement",
    },
    {
      title: "Faction Generator",
      description:
        "Give a rumour a moving source with an agenda, resources, rivals, and a next action.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for sandbox campaigns",
      description:
        "Keep open leads, settlements, factions, and consequences connected between sessions.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "how-to-create-rumours-for-a-fantasy-town",
    "how-do-you-create-quest-hooks-without-railroading",
    "what-should-an-rpg-settlement-contain",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    "how-to-write-an-in-world-newspaper-for-an-rpg",
  ],
  labels: ["fantasy", "rumour"],
  discovery: {
    id: "answer-useful-rpg-rumours",
    parentCluster: "quest-design",
    clusters: ["rumour", "quest-design"],
    primaryIntent: "how to generate useful rpg rumours",
    intentAliases: [
      "how do i generate useful rpg rumours",
      "how to generate useful rpg rumors",
      "how to write tabletop rpg rumours",
      "campaign rumours and adventure hooks",
    ],
    uniqueValue:
      "A fixed six-rumour framework that separates four reliable leads, one exaggerated report, and one dangerous misconception, while keeping each line lighter than a quest hook and tied to a named campaign element.",
    relatedIntents: [
      "generator-rumour",
      "answer-create-fantasy-town-rumours",
      "answer-quest-hooks-without-railroading",
      "example-lowmere-rumour-table",
    ],
    acknowledgedOverlap: [
      {
        with: "generator-rumour",
        reason:
          "This page explains how to judge and use a rumour table, while the generator creates six entries for immediate table preparation.",
      },
      {
        with: "answer-create-fantasy-town-rumours",
        reason:
          "The fantasy-town answer focuses on building an information network inside one settlement, while this page defines the broader six-entry RPG rumour pattern across genres and campaigns.",
      },
      {
        with: "answer-quest-hooks-without-railroading",
        reason:
          "The quest-hook answer explains how to offer a playable situation without forcing a plot, while this page keeps overheard information lighter and preserves uncertainty about what is true.",
      },
    ],
  },
  seo: {
    title: "How Do You Generate Useful RPG Rumours? | Codex Cryptica",
    description:
      "Build useful RPG rumours with four reliable leads, one exaggeration, one dangerous misconception, named sources, and concrete places, people, factions, or items to pursue.",
    image:
      "https://assets.codexcryptica.com/og/how-to-create-rumours-for-a-fantasy-town.jpg",
    imageAlt:
      "Game master preparing a six-entry rumour table beside a candlelit tavern map",
  },
};
