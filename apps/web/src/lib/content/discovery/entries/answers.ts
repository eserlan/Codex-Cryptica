import type { DiscoveryEntryInput } from "../schema";

/**
 * `/answers/[slug]` — reference answers to real questions (#2564).
 *
 * Every one does the `understand` job, which is what lets them sit alongside a
 * generator on the same subject: one explains the concept, the other produces
 * an artefact. Where an answer shares a cluster with a `/for` guide the two are
 * separated by job — technique versus tooling — and that separation is the
 * thing to check before adding another answer near an existing guide.
 */
export const answerEntries: DiscoveryEntryInput[] = [
  {
    id: "answers-index",
    pageKind: "index",
    canonicalPath: "/answers",
    primaryIntent: "rpg and worldbuilding questions answered",
    userJob: "navigate",
    uniqueValue:
      "Index of the answer library, showing each question's direct answer so a reader can pick the right one without opening several.",
    indexable: true,
    status: "live",
  },
  {
    id: "answer-point-crawl",
    pageKind: "answer",
    canonicalPath: "/answers/what-is-a-point-crawl",
    primaryIntent: "what is a point crawl",
    intentAliases: ["point crawl meaning", "point crawl vs hex crawl"],
    userJob: "understand",
    uniqueValue:
      "Defines the structure, names its parts, works a fen example with real travel costs, and says when not to use one.",
    parentCluster: "adventure-mapping",
    indexable: true,
    status: "live",
  },
  {
    id: "answer-campaign-notes",
    pageKind: "answer",
    canonicalPath: "/answers/how-do-you-organise-rpg-campaign-notes",
    primaryIntent: "how do you organise rpg campaign notes",
    intentAliases: [
      "how to organize dnd campaign notes",
      "best way to structure gm notes",
    ],
    userJob: "understand",
    uniqueValue:
      "A three-layer structure — entities, session logs, disposable prep — plus the post-session pass that keeps it true. Technique, not product.",
    parentCluster: "campaign-notes",
    relatedIntents: ["solution-campaign-manager"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "solution-campaign-manager",
        reason:
          "The answer teaches a note structure that works in any tool; the solution page documents what Codex does. Different jobs — understand versus evaluate — on one subject.",
      },
    ],
  },
  {
    id: "answer-fantasy-faction",
    pageKind: "answer",
    canonicalPath: "/answers/how-do-you-create-a-fantasy-faction",
    primaryIntent: "how do you create a fantasy faction",
    intentAliases: ["how to make an rpg faction", "faction design framework"],
    userJob: "understand",
    uniqueValue:
      "Six ordered questions that make a faction predict its own next move, with a worked guild example and a usability test.",
    parentCluster: "faction-creation",
    relatedIntents: ["generator-faction"],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-npc-relationships",
    pageKind: "answer",
    canonicalPath: "/answers/how-do-you-organise-npc-relationships",
    primaryIntent: "how do you organise npc relationships",
    intentAliases: ["track npc relationships rpg", "npc relationship map"],
    userJob: "understand",
    uniqueValue:
      "Argues for directed, named links over ally/enemy lists, says what each link must record, and gives a five-link worked scenario.",
    parentCluster: "relationship-modelling",
    relatedIntents: ["solution-rpg-knowledge-graph"],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-random-encounter",
    pageKind: "answer",
    canonicalPath: "/answers/what-makes-a-good-random-encounter",
    primaryIntent: "what makes a good random encounter",
    intentAliases: [
      "how to write random encounter tables",
      "random encounter design",
    ],
    userJob: "understand",
    uniqueValue:
      "Four criteria for an encounter entry, a before-and-after rewrite of the same monster, and guidance on when not to roll at all.",
    parentCluster: "encounter-design",
    relatedIntents: ["generator-encounter"],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-pantheon",
    pageKind: "answer",
    canonicalPath: "/answers/how-do-you-create-a-pantheon",
    primaryIntent: "how do you create a pantheon",
    intentAliases: ["how to design rpg gods", "fantasy pantheon design"],
    userJob: "understand",
    uniqueValue:
      "Builds entanglements between gods before domains, with five structural moves and a three-god example that yields a legal system.",
    parentCluster: "gods-and-faith",
    relatedIntents: [
      "generator-pantheon-generator",
      "answer-fictional-religion",
    ],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "answer-fictional-religion",
        reason:
          "Pantheon covers the roster of gods and how they are entangled; religion covers the institution, its rites and its funding. Both pages state the split explicitly and a setting can need either alone.",
      },
    ],
  },
  {
    id: "answer-rpg-puzzles",
    pageKind: "answer",
    canonicalPath:
      "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    primaryIntent: "how do you design rpg puzzles that do not stall the game",
    intentAliases: ["rpg puzzle design", "stop puzzles stalling the table"],
    userJob: "understand",
    uniqueValue:
      "Names the single cause of stalling, gives four properties that prevent it, redesigns a vault door, and lists safety valves to prepare.",
    parentCluster: "puzzle-design",
    relatedIntents: ["generator-puzzle"],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-settlement-contents",
    pageKind: "answer",
    canonicalPath: "/answers/what-should-an-rpg-settlement-contain",
    primaryIntent: "what should an rpg settlement contain",
    intentAliases: ["how to design a fantasy town", "rpg town prep checklist"],
    userJob: "understand",
    uniqueValue:
      "Prep sized to what gets used — a reason to exist, four enterable places, three wants, one unsolved problem — plus what to leave out.",
    parentCluster: "settlement-creation",
    relatedIntents: ["generator-settlement"],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-fictional-religion",
    pageKind: "answer",
    canonicalPath: "/answers/how-do-you-create-a-believable-fictional-religion",
    primaryIntent: "how do you create a believable fictional religion",
    intentAliases: [
      "how to write a fictional religion",
      "designing religions for worldbuilding",
    ],
    userJob: "understand",
    uniqueValue:
      "Practice before doctrine — one rite, one prohibition, who funds it, what adherents dispute — and why total coherence reads as fake.",
    parentCluster: "gods-and-faith",
    relatedIntents: ["answer-pantheon"],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-session-prep",
    pageKind: "answer",
    canonicalPath: "/answers/how-much-prep-do-you-need-for-an-rpg-session",
    primaryIntent: "how much prep do you need for an rpg session",
    intentAliases: [
      "how much prep do i need for an rpg session",
      "how much should a gm prep",
      "how much prep for a dnd session",
      "how long should session prep take",
      "how to prep an rpg session",
      "low prep gming",
    ],
    userJob: "understand",
    uniqueValue:
      "Replaces the search for a universal prep-time ratio with a seven-item coverage checklist, a compact worked example, and the essential/reusable/optional-worldbuilding distinction that explains why more hours prepped isn't the same as better prepared.",
    parentCluster: "session-prep",
    relatedIntents: [
      "answer-campaign-notes",
      "answer-random-encounter",
      "answer-npc-relationships",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-session-zero",
    pageKind: "answer",
    canonicalPath: "/answers/how-do-i-run-a-successful-session-0",
    primaryIntent: "how to run an rpg session 0",
    intentAliases: [
      "how do i run a successful session 0",
      "session zero checklist",
      "what to cover in session 0",
      "rpg session 0 questions",
      "dnd session zero guide",
      "gm session 0 checklist",
    ],
    userJob: "understand",
    uniqueValue:
      "An eight-point coverage framework plus a table-agnostic take on boundary-setting (goal, not one mandatory methodology), a worked Session 0 output, and how those decisions become reusable campaign entities instead of a one-off note.",
    parentCluster: "session-prep",
    relatedIntents: [
      "answer-campaign-notes",
      "answer-npc-relationships",
      "answer-session-prep",
    ],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "answer-session-prep",
        reason:
          "Both share the session-prep cluster and the 'understand' job, but answer different questions: how much to prepare for an ongoing session versus how to structure the one conversation that happens before a campaign starts at all. Neither is a rephrasing of the other's intent.",
      },
    ],
  },
  {
    id: "answer-beginner-start",
    pageKind: "answer",
    canonicalPath:
      "/answers/where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
    primaryIntent: "how to start playing tabletop rpgs as a complete beginner",
    intentAliases: [
      "how to start playing tabletop rpgs",
      "beginner guide to rpgs",
      "what do i need to play dnd",
      "should i start as a player or gm",
      "tabletop rpgs for beginners",
    ],
    userJob: "understand",
    uniqueValue:
      "States the genuinely small minimum needed to start (no rulebook read-through, no gear list), covers both the player and GM entry points as equally valid, and is explicit that campaign-management software isn't needed for a first session.",
    parentCluster: "beginner-entry",
    relatedIntents: ["answer-system-selection", "answer-session-zero"],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-system-selection",
    pageKind: "answer",
    canonicalPath: "/answers/what-rpg-system-should-we-try-instead-of-dnd",
    primaryIntent:
      "choose a tabletop rpg system based on desired play style or genre when looking beyond dnd",
    intentAliases: [
      "alternatives to dnd",
      "what rpg should i play instead of dnd",
      "tabletop rpg recommendations",
      "games like dnd but different",
      "what rpg system should we try instead of dnd",
    ],
    userJob: "understand",
    uniqueValue:
      "A play-style decision framework and systems grouped by user need rather than a popularity-ranked list, deliberately naming no single 'best' D&D alternative.",
    parentCluster: "system-selection",
    relatedIntents: [
      "for-dungeons-and-dragons",
      "for-pathfinder-2e",
      "for-call-of-cthulhu",
      "for-cyberpunk-red",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-campaign-manager-criteria",
    pageKind: "answer",
    canonicalPath: "/answers/what-should-i-look-for-in-an-rpg-campaign-manager",
    primaryIntent:
      "understand the criteria for evaluating rpg campaign management software",
    intentAliases: [
      "what should i look for in an rpg campaign manager",
      "what makes a good rpg campaign manager",
      "campaign manager features for gms",
      "what should a ttrpg campaign manager do",
      "how to choose rpg campaign software",
      "rpg campaign manager checklist",
    ],
    userJob: "understand",
    uniqueValue:
      "A tool-agnostic evaluation framework (organisation, relationships, maps, portability, local/cloud trade-offs, customisation, collaboration) prioritised by workflow, before naming any specific product.",
    parentCluster: "campaign-management",
    relatedIntents: ["solution-campaign-manager", "answer-campaign-notes"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "solution-campaign-manager",
        reason:
          "The answer teaches tool-agnostic evaluation criteria for any campaign manager; the solution page evaluates Codex specifically against them. Different jobs — understand versus evaluate — on the same subject, and the answer explicitly names workflows Codex fits less well.",
      },
    ],
  },
  {
    id: "answer-player-engagement",
    pageKind: "answer",
    canonicalPath:
      "/answers/how-do-i-get-players-to-engage-with-my-campaign-world",
    primaryIntent: "how to increase player engagement with an rpg campaign",
    intentAliases: [
      "how do i get players to engage with my campaign world",
      "how to get players to roleplay",
      "how to make players care about the world",
      "how to get players invested in the campaign",
      "passive rpg players",
      "players ignore my lore",
    ],
    userJob: "understand",
    uniqueValue:
      "Reframes engagement as a mechanism problem, not a content problem — lore becomes interesting once it's a choice, a stake or a callback — and separates roleplaying from in-character performance so quieter players aren't judged as disengaged.",
    parentCluster: "player-engagement",
    relatedIntents: [
      "answer-npc-relationships",
      "answer-campaign-notes",
      "answer-fantasy-faction",
      "answer-session-zero",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-encounter-balance",
    pageKind: "answer",
    canonicalPath:
      "/answers/how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    primaryIntent: "how to balance rpg combat encounters safely",
    intentAliases: [
      "how do i balance rpg combat encounters without causing a tpk",
      "how to avoid a tpk",
      "how to balance combat encounters",
      "encounter difficulty gm advice",
      "make rpg combat challenging but fair",
      "tune encounters on the fly",
    ],
    userJob: "understand",
    uniqueValue:
      "Names what a CR/XP formula misses — action economy, party condition, signalling, objectives, terrain, retreat options and built-in pressure valves — and works one encounter through several ways to soften it without secretly rewriting numbers mid-fight.",
    parentCluster: "encounter-balance",
    relatedIntents: ["answer-random-encounter", "generator-encounter"],
    indexable: true,
    status: "live",
  },
  {
    id: "answer-conspiracy-campaign",
    pageKind: "answer",
    canonicalPath: "/answers/how-do-you-run-a-conspiracy-campaign",
    primaryIntent: "how do you run a conspiracy campaign",
    intentAliases: ["running a mystery campaign", "conspiracy campaign prep"],
    userJob: "understand",
    uniqueValue:
      "Write the truth first, then design the leak: three prep documents, the three-clue redundancy rule, and one fact reached three ways.",
    parentCluster: "conspiracy-campaigns",
    relatedIntents: ["for-conspiracy"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "for-conspiracy",
        reason:
          "The answer teaches how to run the campaign; the /for page shows how Codex holds the evidence map. Technique versus tooling, and each is useful without the other.",
      },
    ],
  },
];
