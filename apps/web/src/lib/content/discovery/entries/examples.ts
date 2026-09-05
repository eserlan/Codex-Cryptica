import type { DiscoveryEntryInput } from "../schema";

/**
 * `/examples/[slug]` — curated generator output (#2565).
 *
 * These are the first pages on the site to do the `see-an-example` job, which
 * the coverage report showed was unserved in all 27 clusters. That is exactly
 * why they can share a cluster with a generator and an answer without
 * cannibalising either: explain, create and show-me are three different jobs on
 * one subject, and this family owns the third.
 */
export const exampleEntries: DiscoveryEntryInput[] = [
  {
    id: "examples-index",
    pageKind: "index",
    canonicalPath: "/examples",
    primaryIntent: "codex cryptica generator examples",
    intentAliases: [
      "rpg generator output examples",
      "what does the generator produce",
    ],
    userJob: "navigate",
    uniqueValue:
      "Directory of published examples, so a reader evaluating output quality can see several artefacts side by side before opening a generator.",
    indexable: true,
    status: "live",
  },
  {
    id: "example-gulls-roost",
    pageKind: "example",
    canonicalPath: "/examples/gulls-roost-coastal-smuggling-town",
    primaryIntent: "fantasy settlement example",
    intentAliases: [
      "rpg town example",
      "example of a generated fantasy town",
      "sample fantasy settlement",
    ],
    audience: "Fantasy game masters",
    userJob: "see-an-example",
    uniqueValue:
      "A complete, unedited settlement in full — economy, daily life, five points of interest, five named residents and three hooks — readable without opening the app.",
    parentCluster: "settlement-creation",
    relatedIntents: [
      "generator-settlement",
      "answer-settlement-contents",
      "example-arc-hub",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "example-low-tide-rust",
    pageKind: "example",
    canonicalPath: "/examples/the-low-tide-rust-dock-syndicate",
    primaryIntent: "rpg faction example",
    intentAliases: [
      "example of a generated faction",
      "sample criminal syndicate rpg",
    ],
    userJob: "see-an-example",
    uniqueValue:
      "Shows context reuse concretely: a faction rolled inside an existing settlement, using that town's sea-cave, magistrate and live crisis rather than inventing parallel ones.",
    parentCluster: "faction-creation",
    relatedIntents: [
      "generator-faction",
      "answer-fantasy-faction",
      "example-gulls-roost",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "example-arc-hub",
    pageKind: "example",
    canonicalPath: "/examples/arc-hub-augmentation-slum",
    primaryIntent: "cyberpunk city district example",
    intentAliases: [
      "cyberpunk settlement example",
      "example of a generated cyberpunk district",
    ],
    audience: "Cyberpunk game masters",
    userJob: "see-an-example",
    uniqueValue:
      "Demonstrates a genuine genre shift rather than a skin-swap — the same settlement model producing a scavenger economy and an algorithmic authority instead of renamed taverns.",
    parentCluster: "settlement-creation",
    relatedIntents: ["generator-settlement", "example-gulls-roost"],
    indexable: true,
    status: "live",
  },
  {
    id: "example-cinder-wren",
    pageKind: "example",
    canonicalPath: "/examples/the-cinder-wren-space-western-ship",
    primaryIntent: "space western spaceship example",
    intentAliases: [
      "space western ship example",
      "example of a generated space western ship",
    ],
    audience: "Space Western game masters",
    userJob: "see-an-example",
    uniqueValue:
      "A complete ship-generator output that makes the vessel itself a frontier problem: a compromised captain, disputed salvage, practical crew, and a hidden AI core.",
    parentCluster: "ship-creation",
    relatedIntents: [
      "generator-ship-generator",
      "for-space-western",
      "hub-space-western",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "example-vaelgrasp",
    pageKind: "example",
    canonicalPath: "/examples/vaelgrasp-the-regents-ruin-artifact",
    primaryIntent: "magic item example",
    intentAliases: [
      "artifact example",
      "example of a generated magic item",
      "sample rpg artifact",
    ],
    userJob: "see-an-example",
    uniqueValue:
      "A dense, campaign-shaping artifact roll where the curse and the power are the same mechanism in reverse, with three factions wanting three different things from it.",
    parentCluster: "item-creation",
    relatedIntents: ["generator-artifact-generator"],
    indexable: true,
    status: "live",
  },
  {
    id: "example-void-siphon",
    pageKind: "example",
    canonicalPath: "/examples/void-siphon-cosmic-horror-creature",
    primaryIntent: "cosmic horror creature example",
    intentAliases: [
      "example of a generated monster",
      "sample cosmic horror creature",
      "example of a generated creature",
    ],
    audience: "Cosmic Horror game masters",
    userJob: "see-an-example",
    uniqueValue:
      "A monstrous-hazard creature roll shown with the generator's own player-facing/GM-only split intact, rather than flattened into one description.",
    parentCluster: "antagonist-creation",
    relatedIntents: [
      "generator-creature",
      "answer-random-encounter",
      "for-cosmic-horror",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "example-venting-helix",
    pageKind: "example",
    canonicalPath: "/examples/the-venting-helix-derelict-hazard",
    primaryIntent: "sci fi encounter example",
    intentAliases: [
      "rpg puzzle example",
      "derelict spaceship encounter example",
      "example of a generated hazard",
    ],
    userJob: "see-an-example",
    uniqueValue:
      "A worked hazard with four independent solutions and fail-forward escalation, showing what a non-stalling puzzle looks like in full rather than in principle.",
    parentCluster: "puzzle-design",
    relatedIntents: ["generator-puzzle", "answer-rpg-puzzles"],
    indexable: true,
    status: "live",
  },
  {
    id: "example-lady-vivienne-morvath",
    pageKind: "example",
    canonicalPath: "/examples/lady-vivienne-morvath-gothic-horror-villain",
    primaryIntent: "gothic horror villain example",
    intentAliases: [
      "rpg villain example",
      "example of a campaign antagonist",
      "gothic horror bbeg example",
      "sample rpg villain",
    ],
    audience: "Gothic Horror game masters",
    userJob: "see-an-example",
    uniqueValue:
      "A campaign-scale Gothic Horror villain with a six-stage escalating timeline, conflicted lieutenants, discoverable clues, and a tragic moral dilemma.",
    parentCluster: "antagonist-creation",
    relatedIntents: [
      "generator-bbeg-generator",
      "for-gothic-horror",
      "answer-conspiracy-campaign",
      "answer-npc-relationships",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "example-nkiru-okafor",
    pageKind: "example",
    canonicalPath: "/examples/nkiru-okafor-cyberpunk-npc-table-card",
    primaryIntent: "cyberpunk npc example",
    intentAliases: [
      "table card npc example",
      "quick npc generator example",
      "example of a condensed npc",
      "sample rpg npc",
    ],
    audience: "GMs prepping a session under time pressure",
    userJob: "see-an-example",
    uniqueValue:
      "A condensed Table Card NPC (immediate want, mannerism, contradiction, relationship hook, sensory tag) showing that five sharp cues can be enough to run a character, in contrast to the full-dossier villain example.",
    parentCluster: "npc-creation",
    relatedIntents: ["generator-npc", "for-cyberpunk-red"],
    indexable: true,
    status: "live",
  },
  {
    id: "example-letters-of-marque-expired",
    pageKind: "example",
    canonicalPath: "/examples/letters-of-marque-expired-pirate-adventure",
    primaryIntent: "pirate adventure example",
    intentAliases: [
      "rpg adventure example",
      "sample pirate rpg adventure",
      "example of a generated adventure",
    ],
    audience: "Pirate & High Seas game masters",
    userJob: "see-an-example",
    uniqueValue:
      "A full adventure arc with a real clock, physical clues, a non-combat social complication, and three genuinely different resolution paths rather than a single scene.",
    parentCluster: "adventure-design",
    relatedIntents: ["generator-adventure-generator"],
    indexable: true,
    status: "live",
  },
  {
    id: "example-silo-zero-seven",
    pageKind: "example",
    canonicalPath: "/examples/silo-zero-seven-fallout-repository",
    primaryIntent: "post apocalyptic dungeon example",
    intentAliases: [
      "example of a generated ruin",
      "sample post apocalyptic location",
      "example of a generated vault",
    ],
    audience: "Post-Apocalyptic game masters",
    userJob: "see-an-example",
    uniqueValue:
      "A four-sector explorable site with two truce-bound factions and a suppressed central secret neither faction knows exists, small enough for a GM to run cold.",
    parentCluster: "adventure-mapping",
    relatedIntents: ["generator-dungeon-generator", "answer-point-crawl"],
    indexable: true,
    status: "live",
  },
  {
    id: "example-withered-hand",
    pageKind: "example",
    canonicalPath: "/examples/the-withered-hand-grimdark-faction",
    primaryIntent: "grimdark faction example",
    intentAliases: [
      "dark fantasy faction example",
      "example of a generated grimdark faction",
      "sample corpse guild rpg",
    ],
    audience: "Dark Fantasy game masters",
    userJob: "see-an-example",
    uniqueValue:
      "The first published output of the new Dark Fantasy / Grimdark Faction generator — a corpse guild doing something a plague city genuinely needs in the worst possible way.",
    parentCluster: "faction-creation",
    relatedIntents: [
      "generator-dark-fantasy-faction",
      "answer-fantasy-faction",
      "example-low-tide-rust",
    ],
    indexable: true,
    status: "live",
  },
];
