import type { AnswerConfigInput } from "../schema";

export const howDoIWriteAGoodCallOfCthulhuOneShot: AnswerConfigInput = {
  slug: "how-do-i-write-a-good-call-of-cthulhu-one-shot",
  category: "session-prep",
  publishedAt: "2026-09-25",
  question: "How do I write a good Call of Cthulhu one-shot?",
  kind: "framework",
  shortAnswer:
    "Design backward from a hidden truth, providing at least three redundant clue vectors for every critical deduction so missed rolls never stall the mystery. Structure the session across four escalating phases: an immediate catalyst, an active investigation with multiple leads, an escalating hazard clock that forces action, and a volatile climax that resolves based on player choices rather than complete occult knowledge.",
  sections: [
    {
      kind: "prose",
      heading: "Why Call of Cthulhu one-shots run long or stall",
      paragraphs: [
        "A single-session mystery faces two opposing risks. If clues are hidden behind single skill checks, a run of bad dice leaves the investigators stranded with nowhere to go. If the Keeper overcompensates with dense handouts and historical diaries, the table spends two hours reading exposition in an archive, leaving twenty minutes for a frantic, unsatisfying finale.",
        "A successful Call of Cthulhu one-shot is not a campaign compressed into four hours. It is an active crisis with an underlying truth that the Keeper understands completely, revealed through practical evidence that forces uncomfortable decisions before time runs out.",
      ],
    },
    {
      kind: "list",
      heading: "The five architectural rules of a single-session scenario",
      intro:
        "Build the scenario around five core principles to keep investigation moving and dread mounting:",
      items: [
        {
          term: "Establish the causal timeline first",
          text: "Decide exactly what happened before the investigators arrived, what the antagonist is doing right now, and what occurs at midnight if nobody intervenes. When the Keeper knows the sequence of events, improvising responses to unexpected investigator actions becomes straightforward.",
        },
        {
          term: "Start at the threshold of danger",
          text: "Skip the train journey, library card registration, and lengthy patron interviews. Begin with the investigators already gathered outside the flooded quarry, standing over the opened vault, or reading the telegram sent by a missing colleague.",
        },
        {
          term: "Deploy redundant clue vectors",
          text: "Never attach an essential discovery to a single Library Use, Spot Hidden, or Psychology roll. Every piece of critical information must be obtainable from at least three distinct sources: physical forensic evidence, witness testimony, written records, or environmental traces.",
        },
        {
          term: "Make every clue alter decisions",
          text: "Avoid clues that simply provide background mythology. A good clue reveals immediate danger, exposes an antagonist vulnerability, contradicts a safe assumption, or introduces a moral cost to continuing.",
        },
        {
          term: "Permit action with partial knowledge",
          text: "Investigators never need complete understanding of cosmic entities to attempt containment, rescue survivors, or flee. Let the climax trigger as soon as players possess enough information to make an informed, desperate gamble.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Pacing the escalation ladder across four hours",
      intro:
        "Structure table time by tying psychological tension directly to session milestones:",
      items: [
        {
          term: "Hour 1: The Mundane Anomaly (Minutes 0 to 60)",
          text: "Open with a grounded puzzle or crime that seems explainable: an eccentric antiquarian disappears, a cellar wall collapses, or livestock dies along a salt marsh. Establish personal stakes and provide two distinct leads immediately.",
        },
        {
          term: "Hour 2: The Unsettling Implication (Minutes 60 to 120)",
          text: "Investigators uncover evidence that defies rational explanation. Introduce the first Sanity checks through forensic discoveries or bizarre human behaviour. The threat remains obscured, but mundane theories collapse.",
        },
        {
          term: "Hour 3: Active Hostility and Escalation (Minutes 120 to 180)",
          text: "The threat reacts to the investigation. Cultists set fire to the hotel, strange weather cuts off the road, or a monstrosity stalks the perimeter. Clues now come through defensive action and surviving encounters.",
        },
        {
          term: "Hour 4: The Climax and Aftermath (Minutes 180 to 240)",
          text: "The confrontation or escape takes place in a volatile environment. Resolve the scenario through decisive player choices: disrupting a ritual, sealing an entrance, or burning the evidence and escaping into the dark.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked scenario: The Drowned Chapel of Blackwood Cove",
      paragraphs: [
        "Observe how redundant clue vectors, an active countdown clock, and flexible resolution conditions turn a classic coastal horror premise into a finished single-session scenario.",
      ],
      items: [
        {
          term: "The Premise and Hidden Truth",
          text: "A reclusive coastal parsonage has ceased communicating with the diocese. The parson, Father Joseph Vance, discovered an obsidian reliquary beneath the crypt. His attempts to decipher its inscriptions have awakened a subterranean tide that drowns parishioners in nightmares and draws sea water up through the floorboards at high tide (scheduled for 10:00 PM).",
        },
        {
          term: "The Opening Hook",
          text: "The investigators arrive at dusk during a coastal squall. Their car engine stalls in rising brackish water two miles from the village, forcing them onto foot with lanterns. The parsonage door hangs ajar.",
        },
        {
          term: "Redundant Clue Vectors to the Crypt",
          text: "Vector A (Physical): Wet seaweed and muddy boot prints lead from the vestry down the stone stairs into the crypt. Vector B (Social): The terrified village organist hiding in the bell tower describes Father Vance carrying pickaxes into the foundation. Vector C (Documentary): The parson's open diary on his desk contains frantically scribbled sketches of the reliquary and notes referencing the crypt cistern.",
        },
        {
          term: "The Escalation Clock",
          text: "Every 45 minutes of table time advances the water level. Stage 1: Cold seawater puddles in the hallway. Stage 2: Brackish water floods the cellar knee-deep; parish hymn singing echoes through the vents. Stage 3: The parson and transformed parishioners seal the church exits from outside. Stage 4: High tide submerges the lower levels as the entity stirs.",
        },
        {
          term: "Multiple Valid Endings",
          text: "Disruption: Investigators shatter the reliquary using sledgehammers from the tool shed, breaking the psychic thrall at the cost of heavy Sanity loss. Containment: They detonate mining explosives to collapse the sea tunnel, sealing the chamber. Escape: They drag surviving villagers onto a fishing dinghy as the church collapses into the surf, escaping with their lives but leaving the horror uncontained.",
        },
        {
          term: "Why it works",
          text: "No single failed roll prevents the party from reaching the crypt. The rising water acts as an external clock that pushes hesitant players forward. Finally, none of the three viable endings require defeating a cosmic deity in direct melee combat.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Keeper preparation checklist",
      intro:
        "Review your scenario notes before starting the session to ensure structural resilience:",
      items: [
        "Can you summarise the mystery's underlying truth in three sentences?",
        "Do investigators begin the session with an immediate lead rather than searching for a reason to care?",
        "Are there at least three distinct paths or clue types leading to every necessary location?",
        "Does every clue suggest an action, reveal a danger, or force a choice?",
        "Is there an external countdown clock that advances even if players deliberate?",
        "Can the climax be triggered even if the investigators miss half of the background lore?",
        "Are there multiple viable resolution conditions beyond killing the threat?",
        "Have you identified two scenes that can be excised immediately if table time runs short?",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Call of Cthulhu (7th Edition)",
      rationale:
        "Pushed rolls raise the stakes of failed investigative checks, while Idea rolls ensure critical deductions never stall the table.",
      href: "https://www.chaosium.com/call-of-cthulhu-rpg/",
    },
    {
      system: "Delta Green",
      rationale:
        "Bonds, WP expenditures, and Lethality mechanics focus investigative horror on rapid crisis containment before collateral damage spreads.",
      href: "https://www.delta-green.com/",
    },
    {
      system: "Trail of Cthulhu",
      rationale:
        "GUMSHOE rules guarantee core clues without rolling whenever a relevant investigative ability is applied, eliminating deduction bottlenecks.",
      href: "https://pelgranepress.com/trail-of-cthulhu/",
    },
  ],
  codexConnection: {
    heading: "Mapping cosmic horror mysteries in Codex Cryptica",
    paragraphs: [
      "Running an effective Call of Cthulhu scenario requires tracking connected witnesses, strange relics, and ticking environmental clocks. Codex Cryptica lets you sketch relationship graphs between suspects and locations, ensuring your clue network remains clear at a glance.",
      "Use the Rumour Generator to generate evocative period gossip, local newspaper fragments, and cryptic eyewitness accounts in seconds.",
    ],
    linkText: "Generate atmospheric clues with the Rumour Generator",
    href: "/generators/rumour",
  },
  relatedTools: [
    {
      title: "Rumour generator",
      description:
        "Generate eerie period rumours, whispered warnings, and suspicious local folklore.",
      href: "/generators/rumour",
    },
    {
      title: "NPC generator",
      description:
        "Create eccentric occult scholars, terrified witnesses, and secretive cult members.",
      href: "/generators/npc",
    },
    {
      title: "Adventure generator",
      description:
        "Roll up sinister catalysts, isolated locations, and sudden supernatural complications.",
      href: "/generators/adventure-generator",
    },
  ],
  relatedAnswers: [
    "how-do-you-write-a-one-shot-adventure",
    "how-do-you-run-a-mystery-without-railroading",
    "what-rpg-should-i-play-for-investigative-horror",
    "how-do-i-run-an-investigator-without-sidelining-the-party",
    "how-do-you-generate-useful-rpg-rumours",
  ],
  discovery: {
    id: "answer-write-call-of-cthulhu-one-shot",
    parentCluster: "adventure-mapping",
    clusters: ["adventure-mapping", "session-prep"],
    primaryIntent: "how to write a call of cthulhu one shot",
    intentAliases: [
      "call of cthulhu one shot tips",
      "how to write a coc scenario",
      "homebrew call of cthulhu scenario",
      "how to structure a call of cthulhu mystery",
      "call of cthulhu scenario pacing",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Provides a single-session cosmic horror mystery framework with redundant clue vectors, escalation clocks, and incomplete-understanding conclusions.",
    acknowledgedOverlap: [
      {
        with: "answer-write-one-shot-adventure",
        reason:
          "The cornerstone one-shot guide provides a system-neutral four-beat framework against the table clock, whereas this answer specifically addresses Call of Cthulhu's investigative clue networks, escalating dread, and Sanity-pressured single-session structures.",
      },
      {
        with: "answer-run-mystery-without-railroading",
        reason:
          "The general mystery guide covers the Three-Clue Rule and open-ended perpetrator timelines, whereas this answer focuses on single-session cosmic horror pacing, countdown clocks, and surviving with partial knowledge.",
      },
      {
        with: "answer-investigative-horror-system-selection",
        reason:
          "The system selection guide compares different investigative horror games, whereas this answer provides a dedicated scenario-writing framework specifically for Call of Cthulhu.",
      },
    ],
    relatedIntents: [
      "answer-write-one-shot-adventure",
      "answer-run-mystery-without-railroading",
      "answer-investigative-horror-system-selection",
    ],
  },
  seo: {
    title: "How to Write a Call of Cthulhu One-Shot | Codex Cryptica",
    description:
      "A complete framework for designing single-session Call of Cthulhu mysteries. Master redundant clue webs, escalation clocks, Sanity pacing, and flexible endings.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-write-a-good-call-of-cthulhu-one-shot.jpg",
    imageAlt:
      "Illustration of an investigator examining eldritch clues and a ticking pocket watch under lantern light in an atmospheric 1920s study",
  },
};
