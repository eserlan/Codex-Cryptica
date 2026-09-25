import type { AnswerConfigInput } from "../schema";

export const howDoIWriteAGoodCallOfCthulhuOneShot: AnswerConfigInput = {
  slug: "how-do-i-write-a-good-call-of-cthulhu-one-shot",
  category: "session-prep",
  publishedAt: "2026-09-25",
  question: "How do I write a good Call of Cthulhu one-shot?",
  kind: "framework",
  shortAnswer:
    "Design backward from a hidden truth, and give investigators more than one route to facts the scenario needs them to find. For especially critical deductions, three clue vectors are a useful benchmark. Let the threat escalate as the investigation continues, then resolve the crisis through player choices rather than complete occult knowledge.",
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
      heading: "Principles for a single-session scenario",
      intro:
        "Use these principles to keep investigation moving and dread mounting:",
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
          term: "Give investigators a reason to act together",
          text: "Spend character-creation effort on a shared reason to get involved, not broad backstory: a common employer or patron, a connection to the victim, professional colleagues, pregenerated investigators with explicit ties, or one shared secret or obligation. This keeps the opening from turning into a debate about why each investigator would stay.",
        },
        {
          term: "Deploy redundant clue vectors",
          text: "Do not make a necessary fact depend on one exact roll or location. Obvious clues can simply be found when investigators look in the right place; rolls can reveal extra detail, context, or an advantage. Give facts the scenario needs to progress more than one route in. Three distinct clue vectors is a useful benchmark for especially critical deductions, not a Call of Cthulhu rule.",
        },
        {
          term: "Make clues useful",
          text: "Most clues should change what investigators believe or what they can choose next. Keep pure lore brief unless it deepens dread, foreshadows a cost, or recontextualises the situation.",
        },
        {
          term: "Permit action with partial knowledge",
          text: "Investigators never need complete understanding of cosmic entities to attempt containment, rescue survivors, or flee. Let the climax trigger as soon as players possess enough information to make an informed, desperate gamble.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Pacing through four flexible checkpoints",
      intro:
        "For a four-hour example, use rough proportions rather than fixed Call of Cthulhu timings. The dedicated one-shot pacing guide covers exact table-time budgeting.",
      items: [
        {
          term: "Opening quarter: The mundane problem and immediate leads",
          text: "Open with a grounded puzzle or crime that seems explainable: an eccentric antiquarian disappears, a cellar wall collapses, or livestock dies along a salt marsh. Establish why these investigators are involved and give them immediate leads.",
        },
        {
          term: "Middle investigation: Contradiction and impossible implication",
          text: "Let investigators uncover evidence that defies rational explanation. The first unmistakably unnatural evidence may appear here; if it warrants a Sanity roll under the rules, this is a natural point for one. Mundane theories begin to collapse.",
        },
        {
          term: "Late escalation: The threat acts directly",
          text: "The threat reacts to the investigation. Cultists set fire to the hotel, strange weather cuts off the road, or a monstrosity stalks the perimeter. Investigators may now find clues through defensive action and surviving encounters.",
        },
        {
          term: "Protected final quarter: Decision and aftermath",
          text: "Protect time for a decision, confrontation, escape or containment, and aftermath. Resolve the scenario through player choices: disrupting a ritual, sealing an entrance, or burning the evidence and escaping into the dark.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked scenario: The Drowned Chapel of Blackwood Cove",
      paragraphs: [
        "This example uses several routes to the crypt, an advancing threat, and flexible resolution conditions to turn a coastal horror premise into a single-session scenario.",
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
          text: "Choose a trigger that suits the session: the water can rise as fictional time passes, after specific investigator actions or scene transitions, or at table-time checkpoints in a tightly timed one-shot. For example, it might advance through four stages: cold seawater puddles in the hallway; brackish water floods the cellar knee-deep as parish hymns echo through the vents; the parson and transformed parishioners seal the church exits; then high tide submerges the lower levels as the entity stirs. The situation advances even while investigators are deciding.",
        },
        {
          term: "Multiple Valid Endings",
          text: "Disruption: Investigators shatter the reliquary with sledgehammers from the tool shed, disrupting its hold over the parishioners. The Keeper may call for Sanity rolls if the event warrants them under the rules. Containment: They detonate mining explosives to collapse the sea tunnel, sealing the chamber. Escape: They drag surviving villagers onto a fishing dinghy as the church collapses into the surf, escaping with their lives but leaving the horror uncontained.",
        },
        {
          term: "Why it works",
          text: "No single failed roll prevents the investigators from reaching the crypt. The rising water keeps the situation moving, and none of the three viable endings requires defeating a cosmic deity in direct combat.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Keeper preparation checklist",
      intro: "Review your scenario notes before starting the session:",
      items: [
        "Can you summarise the mystery's underlying truth in three sentences?",
        "Do the investigators have a shared reason to be involved from the start?",
        "Do facts the scenario needs to progress have more than one route in?",
        "Do most clues change what investigators believe or can choose, with pure lore kept brief unless it deepens dread or recontextualises events?",
        "Does the situation advance while investigators deliberate, through fictional time, events, or table-time checkpoints?",
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
        "Pushed rolls let investigators risk worse consequences to try again, while Idea rolls can help restart an investigation that has genuinely stalled. Critical scenario progress should still not rely on a single successful roll.",
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
      "A framework for designing single-session Call of Cthulhu mysteries, with resilient clue routes, flexible escalation clocks, Sanity considerations, and multiple endings.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-write-a-good-call-of-cthulhu-one-shot.jpg",
    imageAlt:
      "Illustration of an investigator examining eldritch clues and a ticking pocket watch under lantern light in an atmospheric 1920s study",
  },
};
