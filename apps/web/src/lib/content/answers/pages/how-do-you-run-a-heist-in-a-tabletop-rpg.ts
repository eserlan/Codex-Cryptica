import type { AnswerConfigInput } from "../schema";

export const howDoYouRunAHeistInATabletopRpg: AnswerConfigInput = {
  slug: "how-do-you-run-a-heist-in-a-tabletop-rpg",
  category: "session-prep",
  labels: ["cyberpunk"],
  publishedAt: "2026-09-04",
  question: "How do you run a heist in a tabletop RPG?",
  kind: "framework",
  shortAnswer:
    "Structure the score into four phases: casing the target, engagement with flashback tokens, an active alarm track, and a chaotic getaway. That way players react in the moment instead of planning for every hypothetical complication up front. Give the party flashback points to retroactively reveal preparations when obstacles emerge during the infiltration, and pair it with a visible heat counter that climbs on failed checks, so infiltration becomes a tense back-and-forth rather than a stalled planning session.",
  sections: [
    {
      kind: "prose",
      heading: "The fatal planning paralysis trap",
      paragraphs: [
        "Traditional tabletop heists frequently stall because players spend two to three real-world hours arguing over theoretical contingencies. They debate guard shift rotations, buy fifty feet of silk rope, and plan escape routes for scenarios that will never happen. The moment the first stealth roll fails in room two, that exhaustive plan collapses, leaving players frustrated and the Game Master scrambling.",
        "Borrowing the flashback structure pioneered by narrative systems like Blades in the Dark solves this friction completely. By assuming the characters are competent scoundrels who planned off-screen, you can drop the party straight onto the rooftop or into the ventilation duct, shifting table energy from anxiety-driven contingency debates to immediate, reactive problem-solving.",
      ],
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
          text: "You do not need to change systems. Add one flashback resource per character, one clock for detection, and a consequence table for failed checks. Charge the resource when a preparation is especially unlikely, expensive, or powerful, so the mechanic creates decisions rather than free solutions.",
        },
      ],
      outro:
        "The important design choice is deciding what the rules should protect: character competence, escalating pressure, or the surprise of a well-timed reversal.",
    },
    {
      kind: "list",
      heading: "The four-phase heist structure",
      intro:
        "Organise your heist session around these four distinct operational beats:",
      items: [
        {
          term: "Casing the target",
          text: "Give players three concrete pieces of intelligence: an entry vector, a security obstacle, and the exact physical vault location. Allow two quick reconnaissance checks, then cut directly to the infiltration.",
        },
        {
          term: "Engagement with flashback tokens",
          text: "Grant each player one or two flashback tokens. When a locked reinforced door or unexpected patrol appears, a player spends a token to declare how their character prepared for this obstacle hours earlier.",
        },
        {
          term: "The escalating alarm track",
          text: "Track discovery with a four-stage or six-stage alarm track visible on the table. Failed skill checks or loud spells tick the counter forward, triggering reinforcements, lockdown gates, or ward dispels.",
        },
        {
          term: "The compromised getaway",
          text: "Once the prize is secured, shift the tempo into high gear. The original entry route should be sealed or crawling with guards, forcing an improvised chase scene through rooftops, sewers, or canal barges.",
        },
      ],
      outro:
        "This cadence keeps the pace brisk while rewarding tactical cleverness over tedious logistics.",
    },
    {
      kind: "example",
      heading: "Worked example: Infiltrating the High Vault of House Vane",
      paragraphs: [
        "Observe how replacing three hours of upfront planning with retroactive flashback mechanics transforms a typical vault infiltration scene.",
      ],
      items: [
        {
          term: "The rigid upfront planning approach",
          text: "The table spends ninety minutes debating whether to pose as wine merchants or scale the laundry chute. When they finally pick the laundry chute, the rogue rolls poorly on an agility check, falls into the courtyard, and the entire infiltration devolves into an unplanned frontal melee.",
        },
        {
          term: "The flashback and alarm track approach",
          text: "The Game Master opens the session with the team already perched above the courtyard skylight. When the party encounters an arcane glyph lock on the treasury door, the wizard spends a flashback token: Yesterday afternoon, I bribed the head archivist apprentice to trace the glyph sequence onto parchment. The wizard rolls to decipher the ward, but rolls a partial success. The GM ticks the alarm track from green to amber as bells toll in the guardhouse, immediately escalating table tension.",
        },
        {
          term: "Why it works",
          text: "The competence of the characters is preserved through the flashback, while the mechanical failure still produces real, escalating stakes without derailing the score into a total restart.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "The table-ready heist prep checklist",
      intro:
        "Before your players roll initiative on the score, confirm you have these structural elements written down:",
      items: [
        "A clear target prize with a tangible physical weight, size, or volatile magical aura.",
        "Three distinct security rings: perimeter patrol, access barrier, and inner vault lock.",
        "A visual alarm track with four defined thresholds: Suspicion, Alert, Lockdown, and Lethal Response.",
        "Two predetermined flashback tokens allocated to each player character.",
        "One unexpected wildcard complication that triggers automatically when the prize is lifted.",
      ],
    },
  ],
  codexConnection: {
    heading: "Mapping complex heist scores in Codex Cryptica",
    paragraphs: [
      "Codex Cryptica makes running intricate heists easier through spatial relationship mapping. You can plot your target compound on a canvas, linking floorplan nodes directly to security patrols, faction keys, and alarm triggers.",
      "Using the entity graph, you can track which corrupt guards owe debts to the party underworld contacts, allowing players to spend their flashback tokens on existing campaign relationships rather than inventing ad-hoc contacts on the spot.",
    ],
    linkText: "Explore the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
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
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "what-makes-a-good-random-encounter",
    "how-do-you-keep-track-of-time-in-a-tabletop-campaign",
    "how-do-you-write-a-one-shot-adventure",
  ],
  discovery: {
    id: "answer-run-heist-in-tabletop-rpg",
    parentCluster: "adventure-mapping",
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
      "Provides an actionable four-phase tabletop heist framework using retroactive flashback tokens and visible alarm tracks to eliminate planning paralysis.",
    relatedIntents: [
      "answer-rpg-puzzles",
      "answer-prep-weekly-session-quickly",
    ],
  },
  seo: {
    title: "How to Run a Heist in a Tabletop RPG | Codex Cryptica",
    description:
      "A complete Game Master framework for running tabletop RPG heists. Eliminate planning paralysis with flashback tokens, alarm tracks, and high-tempo getaways.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-run-a-heist-in-a-tabletop-rpg.jpg",
    imageAlt:
      "Atmospheric tabletop RPG illustration of a cloaked thief standing before an illuminated vault door with lockpicks",
  },
};
