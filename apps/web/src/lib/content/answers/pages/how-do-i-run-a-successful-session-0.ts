import type { AnswerConfigInput } from "../schema";

export const howDoIRunASuccessfulSessionZero: AnswerConfigInput = {
  slug: "how-do-i-run-a-successful-session-0",
  category: "getting-started",
  publishedAt: "2026-08-31",
  question: "How do I run a successful Session 0?",
  kind: "framework",
  shortAnswer:
    "A good Session 0 aligns the group on what kind of game they're actually playing, sets boundaries and expectations before anyone's invested in a bad assumption, and gives the characters concrete reasons to be in a party together. It isn't paperwork — done well, it produces the campaign's first real material: the premise, the party's connections, and the first hook, rather than a form everyone fills in and forgets.",
  sections: [
    {
      kind: "prose",
      heading: "What Session 0 is actually for",
      paragraphs: [
        "Most Session 0 failures come from treating it as a formality to get through before the 'real' game starts. That framing guarantees it produces nothing — a checklist ticked, nothing decided. A Session 0 that works produces decisions the table will actually use: what this campaign is about, what everyone signed up for, and why these particular characters are standing in the same room.",
        "The three jobs it does, in order of how often they get skipped: align expectations (so nobody discovers three sessions in that they wanted a different game), set boundaries (so nobody discovers mid-scene that a topic wasn't okay), and connect the party (so 'we all meet in a tavern' isn't the best reason anyone has for adventuring together).",
      ],
    },
    {
      kind: "list",
      heading: "Eight things worth covering",
      intro:
        "Not a script to read verbatim — a coverage list, the same way session prep is measured by coverage rather than hours.",
      items: [
        {
          term: "Premise and tone",
          text: "What the campaign is actually about, and how dark, silly, political or pulpy it's meant to feel. Say it plainly rather than letting the first session reveal it.",
        },
        {
          term: "The kind of play the group wants",
          text: "Combat-heavy or exploration-heavy, tightly plotted or sandbox, one long arc or episodic — mismatched expectations here are the single most common source of a campaign quietly dying.",
        },
        {
          term: "Character concepts and party connections",
          text: "Build characters in the same room, or at least cross-reference them before session one. A party with real, specific reasons to travel together plays differently from four strangers.",
        },
        {
          term: "Table expectations and scheduling",
          text: "Frequency, session length, what happens when someone misses a session, how decisions get made when the group disagrees.",
        },
        {
          term: "House rules and rules assumptions",
          text: "Whichever system-specific calls the GM is already planning to make — optional rules in or out, how strict the resource tracking will be — said once, up front.",
        },
        {
          term: "Boundaries and agreed safety practices",
          text: "What's off the table, and how anyone flags a problem once play is underway. The mechanism matters less than that one exists and everyone knows it.",
        },
        {
          term: "Character knowledge and campaign truths",
          text: "What the characters already know about the world and each other, versus what's a secret from them (but not necessarily from the players).",
        },
        {
          term: "Starting situation and first hook",
          text: "Where session one actually begins, and what gets the party moving in the same direction on the first night.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Boundaries without turning it into policy",
      paragraphs: [
        "The goal is specific and non-negotiable: everyone at the table has clear boundaries and a way to say so, and that mechanism doesn't depend on anyone making a scene to use it. How you get there is genuinely a table-by-table choice, not a universal standard.",
        "Commonly used approaches include lines and veils (some topics are off-limits entirely, others can be referenced but not shown in detail), an X-card or similar signal anyone can raise without explanation, and simply an open, standing invitation to flag discomfort privately after a session. Pick one that fits how your table actually communicates rather than adopting whichever is most talked-about online — the point is that it gets used, not that it's the 'correct' one.",
      ],
    },
    {
      kind: "example",
      heading: "What a Session 0's output can look like",
      paragraphs: [
        "For a heist-flavoured city campaign, written down at the end of the session rather than left in people's heads.",
      ],
      items: [
        {
          term: "Premise/tone",
          text: "Low-magic city intrigue, morally grey, comedic banter allowed but consequences are real.",
        },
        {
          term: "Party connection",
          text: "All four characters owe a debt to the same fixer, who's calling it in.",
        },
        {
          term: "Boundaries",
          text: "No on-screen harm to children; anyone can say 'pause' with no explanation required.",
        },
        {
          term: "Campaign truth (players know)",
          text: "The city is run by three guilds in an uneasy truce.",
        },
        {
          term: "Campaign truth (GM-only)",
          text: "The truce is already broken; the party's first job is the spark.",
        },
        {
          term: "First hook",
          text: "The fixer summons the party to collect on the debt: one night, one job, no questions.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "A practical Session 0 agenda",
      intro: "Roughly in this order, for a two-to-three hour session.",
      items: [
        "State the premise and tone in a few plain sentences before anyone builds a character.",
        "Ask what kind of play everyone wants, and reconcile any mismatches now, not in session six.",
        "Build or cross-reference characters together, with at least one concrete connection per pair.",
        "Agree the boundary-flagging mechanism and confirm everyone actually knows how to use it.",
        "Walk through house rules and any assumptions specific to this table.",
        "Write down what the characters know, what's secret from them, and what's secret from the players too.",
        "Land on where session one starts and what gets the party moving together.",
      ],
    },
  ],
  codexConnection: {
    heading: "How Codex Cryptica handles this",
    paragraphs: [
      "Everything a good Session 0 produces is exactly the material a vault is built to hold: campaign truths as labelled notes, characters as entities from the start, the party's connections as links between them, and starting factions or locations as their own entities rather than a line in someone's Session 0 notes that nobody looks at again.",
      "The player-known/GM-only split maps onto labels rather than a separate document — a campaign truth can be marked hidden until it's meant to be revealed, so the secret and its eventual reveal live in the same place instead of two. None of this replaces the conversation itself; it just means the decisions from it don't disappear into a one-off document once the session ends.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "RPG knowledge graph",
      description:
        "Where party connections and campaign truths from Session 0 live as linked entities instead of a static document.",
      href: "/solutions/rpg-knowledge-graph",
    },
    {
      title: "Faction generator",
      description:
        "A fast way to give a starting faction real shape when Session 0 surfaces one but there's no time to build it from scratch.",
      href: "/generators/faction",
    },
  ],
  relatedAnswers: [
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-organise-npc-relationships",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-i-find-a-tabletop-rpg-group-to-play-with",
    "how-do-i-get-players-to-engage-with-my-campaign-world",
    "what-rpg-system-should-we-try-instead-of-dnd",
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    "how-do-you-handle-character-death-in-a-tabletop-rpg",
  ],
  discovery: {
    id: "answer-session-zero",
    parentCluster: "session-prep",
    primaryIntent: "how to run an rpg session 0",
    intentAliases: [
      "how do i run a successful session 0",
      "session zero checklist",
      "what to cover in session 0",
      "rpg session 0 questions",
      "dnd session zero guide",
      "gm session 0 checklist",
    ],
    uniqueValue:
      "An eight-point coverage framework plus a table-agnostic take on boundary-setting (goal, not one mandatory methodology), a worked Session 0 output, and how those decisions become reusable campaign entities instead of a one-off note.",
    relatedIntents: [
      "answer-campaign-notes",
      "answer-npc-relationships",
      "answer-session-prep",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-session-prep",
        reason:
          "Both share the session-prep cluster and the 'understand' job, but answer different questions: how much to prepare for an ongoing session versus how to structure the one conversation that happens before a campaign starts at all. Neither is a rephrasing of the other's intent.",
      },
    ],
  },

  seo: {
    title: "How do I run a successful Session 0? | Codex Cryptica",
    description:
      "A practical, system-neutral Session 0 framework: eight things to cover, a table-agnostic approach to boundaries, a worked example and a usable agenda.",
  },
};
