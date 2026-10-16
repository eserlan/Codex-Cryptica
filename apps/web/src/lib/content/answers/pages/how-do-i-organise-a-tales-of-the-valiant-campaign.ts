import type { AnswerConfigInput } from "../schema";

export const howDoIOrganiseATalesOfTheValiantCampaign: AnswerConfigInput = {
  slug: "how-do-i-organise-a-tales-of-the-valiant-campaign",
  category: "campaign-notes",
  publishedAt: "2026-10-16",
  question: "How do I organise a Tales of the Valiant campaign?",
  kind: "framework",
  shortAnswer:
    "Organise a Tales of the Valiant campaign by centring notes on what distinguishes Black Flag Roleplaying: separate each hero's Lineage from their cultural Heritage in your cast web, track party Luck according to your campaign's resting variant, manage Doom budgets for major adversary encounters, and maintain direct connections between martial talents, patrons, and regional factions.",
  sections: [
    {
      kind: "prose",
      heading: "Separate Lineage from Heritage in your cast records",
      paragraphs: [
        "In standard 5e campaigns, character background and species traits often collapse into a single racial identity. Tales of the Valiant separates physiological traits (Lineage) from cultural upbringing and environment (Heritage). Your campaign notes become far more flexible when you record these elements as distinct relational hooks.",
        "A Syderean hero raised among subterranean Fire Dwarves carries loyalties, debts, and idioms from their dwarven enclave, even while possessing celestial heritage. Recording lineage patrons separately from cultural factions lets you introduce complications that target specific obligations without confusing biological ancestry with community ties.",
      ],
    },
    {
      kind: "list",
      heading: "Three mechanical systems that shape your campaign prep",
      intro:
        "Black Flag rules introduce distinct table dynamics that require dedicated tracking between sessions.",
      items: [
        {
          term: "Active Luck pools across sessions",
          text: "Characters earn Luck when they fail attack rolls or saving throws, spending points on subsequent d20 tests. A campaign's resting variant determines whether unspent Luck is preserved or reset towards the pool maximum after a Long Rest. Codex Cryptica does not change Luck automatically, so update each counter manually according to the chosen rules.",
        },
        {
          term: "Adversary Doom points and encounter budgets",
          text: "Legendary monsters and major villains in the Black Flag Reference Document utilise Doom points to power special reactions and offensive surges. Track Doom pools strictly on boss tokens rather than treating them as an arbitrary global pool, ensuring players can anticipate and counter villainous resource expenditure.",
        },
        {
          term: "Talent trees and martial options",
          text: "Unlike rigid feat lists, ToV categorises talents into Martial, Magic, and Technical disciplines with prerequisite paths. Note which training academies, martial tutors, or arcane circles in your world can guide characters into advanced talent tiers.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Structuring an adversary encounter: Flat 5e vs Black Flag ToV",
      paragraphs: [
        "A party of four Level 4 adventurers investigates an ancient subterranean vault occupied by a cult leader.",
      ],
      items: [
        {
          term: "Flat 5e prep style",
          text: "The GM notes a generic spellcaster boss with minions, tracking hit points and spell slots on scratch paper. When players roll poorly, frustration builds with no mechanical valve, and legendary actions feel disconnected from player resources.",
        },
        {
          term: "Tales of the Valiant prep style",
          text: "The GM notes the cult leader with a verified Doom pool of 3 points and specifies two Doom actions: an immediate repositioning step and an explosive necrotic burst. Party members hold starting Luck points (average 2 to 3), gaining additional points on failed attack rolls to turn near-misses into dramatic strikes. Both resources are transparently managed.",
        },
        {
          term: "Why it works",
          text: "The encounter functions as a dynamic contest between hero Luck generation and villain Doom expenditure. Players feel rewarded for daring actions even when initial dice fail, while the GM uses finite, rules-backed Doom resources rather than arbitrary fiat.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Pre-session checklist for Tales of the Valiant GMs",
      items: [
        "Verify each player character sheet has starting Luck calculated and recorded.",
        "Split character backstories into separate Lineage contacts and Heritage communities.",
        "After a Long Rest, apply the campaign's resting variant to each Luck pool and update the counter manually.",
        "Assign explicit Doom budgets to solo boss creatures rather than generic minions.",
        "Review relevant BFRD monster stat blocks, confirming spell circles and save proficiencies.",
        "Link magic item rewards to specific crafting lineages or forgotten Black Flag factions.",
      ],
    },
  ],
  codexConnection: {
    heading: "Native Tales of the Valiant campaign support in Codex Cryptica",
    paragraphs: [
      "Codex Cryptica includes built-in Tales of the Valiant character, NPC, and monster stat sheet templates, with one-click Luck controls, Doom counters on combat tokens, and qualitative encounter challenge guidance tailored to your party level and size. Choose Tales of the Valiant manually in a generator's Game System option when available; vault-wide profile selection is not currently available.",
      "Everything runs locally in your browser through private OPFS storage, allowing you to prep and run sessions entirely offline with full CC BY 4.0 Black Flag compliance.",
    ],
    linkText: "Explore the Tales of the Valiant guide",
    href: "/for/tales-of-the-valiant",
  },
  relatedTools: [
    {
      title: "Tales of the Valiant campaign manager",
      description:
        "Manage lineages, heritages, Luck meters, Doom points, and BFRD stat blocks in a private, offline workspace.",
      href: "/for/tales-of-the-valiant",
    },
    {
      title: "Encounter generator",
      description:
        "Draft combat encounters with party-scaled qualitative challenge ratings and BFRD creature roles.",
      href: "/generators/encounter",
    },
  ],
  relatedAnswers: [
    "how-do-i-organise-a-dnd-campaign",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-keep-track-of-npcs-in-a-long-campaign",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
  ],
  discovery: {
    id: "answer-organise-tales-of-the-valiant-campaign",
    parentCluster: "campaign-notes",
    clusters: ["campaign-notes", "system-guides"],
    primaryIntent: "how to organise a tales of the valiant campaign",
    intentAliases: [
      "how do i organise a tales of the valiant campaign",
      "organising a tov campaign",
      "running tales of the valiant tips",
      "tales of the valiant campaign prep",
      "black flag roleplaying campaign notes",
    ],
    uniqueValue:
      "A campaign prep framework built for Black Flag Roleplaying: splitting Lineage from Heritage, tracking Luck according to resting variants, managing boss Doom points, and structuring BFRD encounters.",
    relatedIntents: [
      "for-tales-of-the-valiant",
      "answer-dnd-campaign-organisation",
    ],
  },
  seo: {
    title: "How to organise a Tales of the Valiant campaign | Codex Cryptica",
    description:
      "A practical guide to organising a Tales of the Valiant campaign: managing Lineage and Heritage, tracking Luck pools, running Doom mechanics, and structuring BFRD notes.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-organise-a-tales-of-the-valiant-campaign.jpg",
    imageAlt:
      "Game master notes and Black Flag character sheets arranged beside dice and campaign maps",
  },
};
