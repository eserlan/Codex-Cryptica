import type { AnswerConfigInput } from "../schema";

export const howDoYouRunAChaseInATabletopRpg: AnswerConfigInput = {
  slug: "how-do-you-run-a-chase-in-a-tabletop-rpg",
  category: "session-prep",
  publishedAt: "2026-09-16",
  question: "How do you run a chase in a tabletop RPG?",
  kind: "how-to",
  shortAnswer:
    "Run a chase as a race to a conclusion, not as combat movement with dice: track relative progress in zones rather than feet, keep the gap visible to everyone, spend complications that force choices instead of identical checks, give every character a job, and end the chase the moment the outcome stops being in doubt. The frame below works with any system, and the system references name the two published procedures most worth borrowing from.",
  sections: [
    {
      kind: "prose",
      heading: "Chase the conclusion, not the map",
      paragraphs: [
        "Use chase rules when the question at stake is who gets there first, who escapes, or who gets caught. Use normal combat movement when positioning for attacks is the interesting decision round to round. The two modes answer different questions, and mixing them up is where most chases die: tracking exact feet per round turns a pursuit into slow combat, while resolving a pursuit with a single group check skips the part everyone came for.",
        "If the party would rather stand and fight than run, let them. A chase nobody chose is just combat with extra narration. State the stakes openly before the quarry bolts: what escape means, what capture means, and roughly how long the table has before one of them happens.",
      ],
    },
    {
      kind: "list",
      heading: "Five pieces every chase needs",
      intro:
        "Set these up before the first roll and the chase nearly runs itself.",
      items: [
        {
          term: "A visible gap",
          text: "Track relative progress, not positions on a grid: the quarry is two zones ahead, the guards closed to one. A row of tokens, a simple tracker, or even spare dice works. When everyone can see the gap shrink or stretch, every roll matters.",
        },
        {
          term: "A finish line for each side",
          text: "Decide in advance what escape and what capture look like in this specific chase: the boat leaves, the gates close, the gap hits zero. Without finish lines a chase drifts until the GM gets bored, which players can always feel.",
        },
        {
          term: "Complications that force choices",
          text: "Each zone gets one obstacle with at least two ways through, each costing something different: time, safety, noise, resources. A blocked bridge the party can swim (slow), climb (risky), or bribe across (costly) is a decision; a DC 15 Athletics check repeated six times is a chore.",
        },
        {
          term: "A job for every character",
          text: "Chases stall when only the fastest character participates. Split the work: one picks the route, one watches for shortcuts, one interferes with pursuers, one handles the obstacle each zone presents. Let slower characters contribute through perception, knowledge, or sabotage rather than speed.",
        },
        {
          term: "Escalation each round",
          text: "Change the situation every round or two: the terrain shifts, new arrivals join, the stakes rise. A chase through the same unchanging street is one decision repeated; a chase where the market gives way to a canal and then a rooftop is three decisions in sequence.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Foot, mounted and vehicle chases share the frame",
      paragraphs: [
        "Only the complications and the scale change. On foot, zones are tight and crowds, doors and fences do the work. Mounted, the mount becomes a shared resource that can tire or panic, which adds a second tracker worth watching. With vehicles or ships, widen the zones, give the crew stations or roles, and let speed itself become the complication when turning or terrain intrudes.",
        "Published systems mostly differ in how they formalise the same idea. The fifth edition Dungeon Master's Guide procedure limits repeated dashing with exhaustion and supplies urban and wilderness complication tables; Pathfinder Second Edition builds chases from obstacles and chase points with shortcut paths that suit different character strengths. Either works as a reference when adapting the frame above to a specific table.",
      ],
    },
    {
      kind: "example",
      heading: "A market chase, weak and strong",
      paragraphs: [
        "The party's informant bolts through a crowded market with the city watch behind them, and the table joins the pursuit.",
      ],
      items: [
        {
          term: "The weak version",
          text: "The GM calls for Athletics checks each round while describing stalls blurring past. The fastest characters pull ahead, the slowest fall behind with nothing to do, and after six near-identical rolls the GM decides the informant escapes because the scene has gone on long enough.",
        },
        {
          term: "The strong version",
          text: "The GM sets three zones (stalls, canal bridge, rooftops) with one complication each, shows the gap starting at two zones, and names the finish lines: the informant's boat vs the gap closing to zero. The rogue picks routes, the scholar spots a shortcut through a bakery, the fighter topples carts to slow the watch. The informant reaches the boat exactly as the gap hits one zone, and the table feels the near miss.",
        },
        {
          term: "Why it works",
          text: "The strong version replaces repeated identical checks with three genuine decisions, keeps every character involved through split jobs, and lets the visible gap rather than GM fiat decide when the chase ends.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Set up before the quarry bolts",
      intro:
        "Chases often start mid-action, so prepare these as defaults you can deploy:",
      items: [
        "Name the stakes for escape and capture in one sentence each.",
        "Draw a simple gap tracker both sides can see.",
        "Prepare three to five complications, each with two ways through at different costs.",
        "Note what the pursuers can do in one line: speed, numbers, and one dirty trick.",
        "Decide the finish lines: where and when each side wins.",
        "Plan the handoff: what scene starts immediately after, whichever side wins.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Dungeons & Dragons 5th Edition",
      rationale:
        "The Dungeon Master's Guide chase procedure limits repeated dashing with exhaustion and supplies urban and wilderness complication tables.",
      href: "https://www.dndbeyond.com/",
    },
    {
      system: "Pathfinder Second Edition",
      rationale:
        "The GM Core chase subsystem builds pursuits from obstacles and chase points, with shortcut paths that suit different character strengths.",
      href: "https://paizo.com/pathfinder",
    },
  ],
  codexConnection: {
    heading: "Borrow terrain and crowds from the generators",
    paragraphs: [
      "Complications are the prep-heavy part of a chase, and they are exactly what generators produce quickly: a settlement gives dense streets, markets and rooftops with obstacles built in, an encounter builds the pursuing force, and a tavern supplies a crowded room to crash through when the chase goes indoors.",
      "That material is system-neutral, so the same chase terrain serves a fifth edition table, a Pathfinder table, or anything lighter without conversion.",
    ],
    linkText: "Generate a settlement to chase through",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement Generator",
      description:
        "Dense streets, markets and rooftops: ready-made chase terrain with complications built in.",
      href: "/generators/settlement",
    },
    {
      title: "Encounter Generator",
      description:
        "Build the pursuing force so its capabilities fit on one line.",
      href: "/generators/encounter",
    },
    {
      title: "Tavern Generator",
      description:
        "A crowded room to crash through when the chase goes indoors.",
      href: "/generators/tavern",
    },
  ],
  relatedAnswers: [
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "can-you-play-a-tabletop-rpg-in-30-minute-sessions",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
  ],
  discovery: {
    id: "answer-run-chase-in-tabletop-rpg",
    parentCluster: "session-prep",
    clusters: ["session-prep"],
    primaryIntent:
      "run an exciting tabletop rpg chase with legible distance complications and a clear ending",
    intentAliases: [
      "how to run a chase in dnd",
      "dnd chase rules",
      "chase encounters",
      "chase complications",
      "urban chase 5e",
      "vehicle chase",
      "how to make a chase exciting",
      "how do you run a chase in a tabletop rpg",
    ],
    uniqueValue:
      "A system-neutral chase frame built on visible progress, choice-forcing complications and clean endings, with the two published procedures worth borrowing named.",
    userJob: "understand",
    relatedIntents: ["answer-run-heist-in-tabletop-rpg"],
    acknowledgedOverlap: [
      {
        with: "answer-session-engagement",
        reason:
          "That page covers overall session engagement for the whole table; this page covers chase-scene procedure specifically. Shared vocabulary is incidental.",
      },
    ],
  },
  seo: {
    title: "How do you run a chase in a tabletop RPG? | Codex Cryptica",
    description:
      "Run chases as races, not combat: visible progress zones, choice-forcing complications, jobs for every character, and clean endings, with examples.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-run-a-chase-in-a-tabletop-rpg.jpg",
    imageAlt:
      "A rogue vaulting over a market stall while the city watch closes in behind, dice on the table",
  },
};
