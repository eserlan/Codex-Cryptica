import type { AnswerConfigInput } from "../schema";

export const howDoIBalanceRpgCombatEncountersWithoutATpk: AnswerConfigInput = {
  slug: "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
  category: "session-prep",
  publishedAt: "2026-08-31",
  question: "How do I balance RPG combat encounters without causing a TPK?",
  kind: "framework",
  shortAnswer:
    "Encounter balance isn't only a monster-versus-party maths problem — a fight rated 'appropriate' by the book can still read as unwinnable if the action economy is lopsided, the party is already worn down, or there's no way to retreat, negotiate or achieve the objective some other way. Use your system's encounter-building rules as the starting point, then layer judgement on top: compare effective actions on each side, telegraph anything unusually dangerous, give the fight a goal beyond zeroing every enemy's HP, and build in pressure you can turn up or down as play reveals how the party is actually doing.",
  sections: [
    {
      kind: "prose",
      heading: "The rating on the box isn't the whole answer",
      paragraphs: [
        "Every system with an encounter-building formula — challenge rating, XP budgets, threat levels — is answering a narrower question than 'will this fight go well': roughly, how much raw statistical firepower is on each side. That's a real and useful number. It's also blind to several things that decide whether a fight actually feels balanced at the table.",
        "Use the system-specific formula where one exists; don't throw it out. What follows is the judgement layer that sits on top of it, for the things no formula captures on its own.",
      ],
    },
    {
      kind: "list",
      heading: "What the formula usually misses",
      items: [
        {
          term: "Action economy",
          text: "Four enemies acting once each often hits harder than one enemy with four times the stats — more actions means more chances to land the bad roll, and less chance for the party to shut down a single threat and be done.",
        },
        {
          term: "Party resources and current condition",
          text: "The same encounter is a different encounter depending on whether it's the party's first fight of the day or their fourth, at full resources or running on fumes.",
        },
        {
          term: "Signalling danger",
          text: "An unusually dangerous threat should read as unusual before it acts, not only after someone drops. A visibly different monster, an NPC's warning, an obviously wrong scene — give the players something to notice.",
        },
        {
          term: "Objectives beyond zero HP",
          text: "A fight with a goal — hold the door for three rounds, protect the prisoner, reach the altar — gives the party ways to succeed or fail that don't run through grinding every enemy down, and gives you room to end it before it becomes a slog either direction.",
        },
        {
          term: "Terrain and positioning",
          text: "Cover, elevation, hazards and chokepoints that create choices are doing their job. Terrain whose only function is extra unavoidable damage is just a harder fight wearing scenery.",
        },
        {
          term: "Retreat, surrender or alternate success",
          text: "If running away, negotiating or achieving the goal some other way is fictionally plausible, make sure it's actually available — a fight the party can't leave is a fight you'd better be certain they can win.",
        },
        {
          term: "Adjustable pressure",
          text: "Reinforcements that are delayed or conditional, morale that can break, an environmental threat that escalates — these let a fight run harder or softer depending on how it's actually going, instead of being fixed the moment initiative is rolled.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Adjust the situation, not the numbers behind the screen",
      paragraphs: [
        "When a fight is clearly going worse than intended, the honest lever is something already established in the fiction: reinforcements that were conditional don't show up, the enemy's morale breaks and they flee, the environmental hazard the party spotted earlier becomes relevant. These were true possibilities before the fight went sideways — using them isn't rescuing the party, it's the encounter behaving the way it was built to.",
        "Secretly changing a monster's HP or fudging a roll mid-fight is a different thing, and it has a cost even when nobody notices: it teaches you nothing about whether the encounter was actually balanced, and if it's discovered, it teaches the table that the dice don't matter. Build the pressure valves in ahead of time so you never need the secret version.",
      ],
    },
    {
      kind: "example",
      heading: "One encounter, several ways to soften without feeling fake",
      paragraphs: [
        "A raiding party ambushes the group on a bridge — built dangerous on purpose, with pressure valves designed in from the start rather than invented mid-fight.",
      ],
      items: [
        {
          term: "Objective, not annihilation",
          text: "The raiders want to drive the party off the bridge and take their cargo, not fight to the death.",
        },
        {
          term: "Conditional reinforcements",
          text: "A second raider group is one turn away, but only comes if the raiders' horn signal goes unanswered — the party can prevent it by reaching the horn-blower first.",
        },
        {
          term: "Telegraphed hazard",
          text: "The bridge is visibly damaged; anyone can see it before the fight starts, not discover it by falling through.",
        },
        {
          term: "Breakable morale",
          text: "The raiders scatter once their leader drops or a third of them are down, whichever comes first.",
        },
        {
          term: "An exit",
          text: "Retreat down the riverbank is open the entire fight — costly, but never blocked off.",
        },
      ],
    },
  ],
  codexConnection: {
    heading: "How Codex Cryptica handles this",
    paragraphs: [
      "The Encounter Generator can produce a starting point fast, and creature, NPC and faction entries carry the motives and details ('wants to capture, not kill' is exactly the kind of thing worth writing down once) that make the judgement calls above easier to make consistently across sessions.",
      "None of this is CR or XP-based mechanical balancing — Codex doesn't score an encounter's difficulty for a given system. What it's built for is holding the encounter's participants, terrain and consequences as connected campaign entities, so the context above (what does this enemy actually want, what happened last time the party met them) is a lookup rather than something you have to remember.",
    ],
    linkText: "Try the encounter generator",
    href: "/generators/encounter",
  },
  relatedTools: [
    {
      title: "RPG encounter generator",
      description:
        "A fast starting point for an encounter's participants and shape, before layering the judgement calls above on top.",
      href: "/generators/encounter",
    },
    {
      title: "Creature generator",
      description:
        "Gives an unusual threat a concrete identity worth telegraphing, rather than an unnamed stat block.",
      href: "/generators/creature",
    },
  ],
  relatedAnswers: [
    "what-makes-a-good-random-encounter",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-handle-character-death-in-a-tabletop-rpg",
  ],
  discovery: {
    id: "answer-encounter-balance",
    parentCluster: "encounter-balance",
    primaryIntent: "how to balance rpg combat encounters safely",
    intentAliases: [
      "how do i balance rpg combat encounters without causing a tpk",
      "how to avoid a tpk",
      "how to balance combat encounters",
      "encounter difficulty gm advice",
      "make rpg combat challenging but fair",
      "tune encounters on the fly",
    ],
    uniqueValue:
      "Names what a CR/XP formula misses — action economy, party condition, signalling, objectives, terrain, retreat options and built-in pressure valves — and works one encounter through several ways to soften it without secretly rewriting numbers mid-fight.",
    relatedIntents: ["answer-random-encounter", "generator-encounter"],
  },

  seo: {
    title:
      "How do I balance RPG combat encounters without a TPK? | Codex Cryptica",
    description:
      "Encounter balance is more than a CR formula: action economy, party condition, telegraphing, objectives and built-in pressure valves. A worked example included.",
  },
};
