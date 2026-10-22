import type { AnswerConfigInput } from "../schema";

export const howDoYouRunAHeistInATabletopRpg: AnswerConfigInput = {
  slug: "how-do-you-run-a-heist-in-a-tabletop-rpg",
  category: "adventure-design",
  labels: ["cyberpunk", "heist"],
  publishedAt: "2026-09-04",
  question: "How do you run a heist in a tabletop RPG?",
  kind: "framework",
  shortAnswer:
    "Start with a score that gives the crew a target, casing intel, layered security, an escalating alarm track, complications, and a pressured getaway. Use those details to frame choices during play, and let players establish plausible preparations with flashbacks when obstacles arise instead of planning for every possibility in advance.",
  sections: [
    {
      kind: "prose",
      heading: "Start with a score, not a fixed plan",
      paragraphs: [
        "A heist score needs enough detail to make choices matter, but a fixed route can make one failed roll collapse the whole plan. Start with a target, useful casing intel, layered security, and a reason the crew cannot take its time. The Heist Generator can draft that situation, including multiple approaches to each security ring, complications, a five-state alarm track, getaway routes, and flashback opportunities.",
        "Flashbacks let players establish plausible preparations when an obstacle becomes relevant. In games with a flashback cost or procedure, use that rule; in other systems, agree how the table will handle a preparation that changes the situation.",
      ],
      cta: {
        text: "Generate a score to run with this guide",
        href: "/generators/heist",
      },
    },
    {
      kind: "list",
      heading: "Systems worth studying for heist mechanics",
      intro:
        "If you want the rules to carry more of the heist structure, these games offer useful mechanics to borrow or play as written:",
      items: [
        {
          term: "Blades in the Dark: flashbacks, stress, and clocks",
          text: "Flashbacks let players establish preparations when they become relevant, while stress gives those preparations a cost. Clocks make guards, alarms, and rival crews advance in visible steps. Together, the mechanics turn a failed roll into a new pressure rather than a request to restart the plan.",
        },
        {
          term: "Leverage: assets, complications, and reversals",
          text: "Leverage builds the caper around changing advantages. Players can establish useful assets through flashbacks, while complications keep a successful approach from becoming automatic. This suits groups who want the feel of a television con job, with regular reveals and reversals.",
        },
        {
          term: "The Sprawl: legwork, mission moves, and threat clocks",
          text: "The Sprawl separates investigation and preparation from the action phase, then uses mission and threat clocks to make earlier choices matter once the operation starts. It is a strong model for cyberpunk or criminal campaigns where the team needs to manage both the target and the organisations reacting to them.",
        },
        {
          term: "A bolt-on for traditional fantasy systems",
          text: "You do not need to change systems. Use the score's alarm track to show how security responds, and agree what a flashback costs when a player establishes a preparation. A failed check should change the situation in a way that fits the system; it need not advance the alarm unless the score's trigger or the fiction warrants it.",
        },
      ],
      outro:
        "The important design choice is deciding what the rules should protect: character competence, escalating pressure, or the surprise of a well-timed reversal.",
    },
    {
      kind: "list",
      heading: "Run the score in four beats",
      intro:
        "Use the generated score as a situation, then let the crew decide how to approach it:",
      items: [
        {
          term: "Casing the target",
          text: "Share the casing intel that gives the crew useful choices, such as an entry vector, a known obstacle, a security routine, or where the objective is kept. Generated scores include at least three actionable details; reveal them through a briefing or reconnaissance that fits your system.",
        },
        {
          term: "Infiltration and flashback opportunities",
          text: "Each security ring offers more than one approach. The score also lists possible flashbacks, such as a bribed guard or cached equipment. They are options for the players to establish, not preparations that have already happened or a fixed number of tokens; use your game's flashback rules or agree a cost that suits your system.",
        },
        {
          term: "The escalating alarm track",
          text: "Use the generated five-state track: 0: Quiet, 1: Suspicion, 2: Alert, 3: Lockdown, and 4: Lethal Response. Follow the events and consequences written for each score. A failed check can add pressure, but advance the track when the fiction or the score's trigger calls for it, not automatically after every failure.",
        },
        {
          term: "The compromised getaway",
          text: "When the score's stated point of no return arrives, use its getaway problem and alternate routes. The original route may already be compromised; let the crew choose how to respond and run a chase only if the situation and your rules call for one.",
        },
      ],
      outro:
        "The structure keeps the table moving: players react to what is actually in front of them instead of debating hypotheticals.",
    },
    {
      kind: "example",
      heading: "Worked example: The Breakwater Vault",
      paragraphs: [
        "The Breakwater Vault is a generated Space Western Theft score. Its details show how to turn a prepared situation into choices at the table.",
      ],
      items: [
        {
          term: "Casing and security",
          text: "The crew learns about the crane rail's sensor gap, the shift-change window, the pneumatic locks, and the magnetic cradle holding the prize. Three rings offer distinct options: time the outer sensor sweep, use cloned credentials at the access ring, or lift a key or cut through the inner vault hatch.",
        },
        {
          term: "Alarm and complications",
          text: "The score gives five numbered alarm states, three complications (one default and two alternatives), and the event that changes the situation. When the crew lifts the canisters, a pressure differential seals the clerical corridor and raises the alarm to 2 — Alert. The escape has begun, and the crew must choose among the listed routes with the main gantry walkway due to seal in five minutes.",
        },
        {
          term: "Flashbacks and escape",
          text: "Five flashback opportunities suggest preparations the players could establish, from a forged requisition to a cached tether; the GM does not treat them as events that already happened. The getaway offers three routes plus a pursuit, so the crew still chooses how to escape after the planned route fails.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "See a table-ready score in action",
      paragraphs: [
        "Read the full generated score before play: it includes the casing intel, all three security rings, each numbered alarm state, complications, flashbacks, and the getaway options used above.",
      ],
      cta: {
        text: "Read the Breakwater Vault heist example",
        href: "/examples/the-breakwater-vault-space-western-heist",
      },
    },
    {
      kind: "checklist",
      heading: "Check the score before play",
      intro:
        "The generator supplies the framework. Review the draft and decide how its pressure and options fit your rules:",
      items: [
        "Confirm the objective, prize, practical catch, and at least three useful casing details.",
        "Read the three security rings and their multiple approaches; decide what information the crew can learn before choosing.",
        "Keep the alarm labels in order: 0: Quiet, 1: Suspicion, 2: Alert, 3: Lockdown, 4: Lethal Response. Check each state's trigger and consequence.",
        "Choose the default complication or one of its alternatives, and note the generated point of no return and its trigger.",
        "Treat getaway routes as choices and flashbacks as opportunities the players may establish, not as a mandatory chase or a set token allowance.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Blades in the Dark",
      rationale:
        "Flashbacks let a player establish a preparation retroactively, and its clocks give the alarm track a ready-made mechanic rather than a house rule.",
      href: "https://bladesinthedark.com/",
    },
    {
      system: "Scum & Villainy",
      rationale:
        "The same flashback and clock engine as Blades in the Dark, reskinned for a starship crew running jobs across a sector.",
      href: "https://www.evilhat.com/home/scum-villainy/",
    },
    {
      system: "Leverage: The Roleplaying Game",
      rationale:
        "Built around a heist's planning montage: players narrate flashback preparations during the job itself, and complications create reversals rather than dead ends.",
      href: "https://www.evilhat.com/home/leverage/",
    },
  ],
  codexConnection: {
    heading: "Tracking heist contacts in Codex Cryptica",
    paragraphs: [
      "The generator drafts the score, its people, and its complications. Save the draft to your local vault, then record any recurring guards, fences, or rivals as campaign entities and link the relationships you want to track. Those established connections can give a later flashback a contact or debt the players already know about.",
    ],
    linkText: "Explore the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "Heist topic hub",
      description:
        "The complete RPG heist cluster: core running frameworks, target design checklists, worked examples, and generation tools.",
      href: "/topics/heists",
    },
    {
      title: "Heist generator",
      description:
        "Generate a score with casing intel, three security rings, a five-state alarm track, complications, flashback opportunities, and alternate getaway routes, then save it to your vault.",
      href: "/generators/heist",
    },
    {
      title: "Dungeon generator",
      description:
        "Generate multi-room vaults, fortified subterranean complexes, and security checkpoints.",
      href: "/generators/dungeon-generator",
    },
    {
      title: "Quest hook generator",
      description:
        "Create high-stakes patron contracts, heist objectives, and rival crew complications.",
      href: "/generators/quest",
    },
    {
      title: "NPC generator",
      description:
        "Quickly produce corrupt vault wardens, nervous lookouts, and rival fence contacts.",
      href: "/generators/npc",
    },
  ],
  relatedAnswers: [
    "what-makes-a-good-heist-target-in-a-tabletop-rpg",
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "what-makes-a-good-random-encounter",
    "how-do-you-keep-track-of-time-in-a-tabletop-campaign",
    "how-do-you-write-a-one-shot-adventure",
    "how-do-you-run-a-chase-in-a-tabletop-rpg",
    "how-do-you-run-character-roles-in-a-cyberpunk-rpg",
    "how-do-i-run-spies-and-infiltrators-in-an-rpg",
    "how-do-i-run-a-rogue-or-scout-without-splitting-the-party",
    "how-do-i-run-common-character-roles-in-a-fantasy-rpg",
    "how-do-i-run-a-stealth-mission-in-a-tabletop-rpg",
  ],
  discovery: {
    id: "answer-run-heist-in-tabletop-rpg",
    parentCluster: "adventure-mapping",
    clusters: ["heist", "adventure-mapping"],
    primaryIntent: "how to run a heist in a tabletop rpg",
    intentAliases: [
      "how to run an rpg heist",
      "dnd 5e heist rules",
      "running a heist tabletop session",
      "rpg heist prep guide",
      "heist structure for game masters",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Provides a four-beat heist running framework using optional flashback opportunities, layered security, a five-state alarm track, and a pressured getaway, with guidance for different rulesets.",
    relatedIntents: [
      "answer-rpg-puzzles",
      "answer-prep-weekly-session-quickly",
      "answer-heist-target-design",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-run-stealth-mission-in-tabletop-rpg",
        reason:
          "This answer frames the complete score from casing through escape; the stealth mission answer provides a zone-based procedure for resolving movement, group roles, and gradual detection during the mission itself.",
      },
      {
        with: "answer-run-rogue-scout-without-splitting-party",
        reason:
          "This answer covers the full heist score and its preparation; the rogue and scout guide handles the narrower reconnaissance scene and how its discoveries return decisions to the party.",
      },
    ],
  },
  seo: {
    title: "How to Run a Heist in a Tabletop RPG | Codex Cryptica",
    description:
      "Run RPG heists with useful casing intel, security rings, optional flashbacks, a five-state alarm track and a getaway that forces new choices.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-run-a-heist-in-a-tabletop-rpg.jpg",
    imageAlt:
      "Atmospheric tabletop RPG illustration of a cloaked thief standing before an illuminated vault door with lockpicks",
  },
};
