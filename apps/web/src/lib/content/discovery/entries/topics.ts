import type { DiscoveryEntryInput } from "../schema";

/**
 * Topic hubs (`/topics/[slug]`).
 *
 * Dedicated entry points for coherent content clusters (#3118).
 * Bridges related Answers, Examples, and Generators into an interconnected
 * topic graph for human discovery, classic search engines, and AI retrieval.
 */
export const topicEntries: DiscoveryEntryInput[] = [
  {
    id: "topic-heists",
    pageKind: "hub",
    canonicalPath: "/topics/heists",
    primaryIntent: "tabletop rpg heist hub and resources",
    intentAliases: [
      "rpg heist topic hub",
      "tabletop heist resources",
      "designing and running rpg heists",
      "ttrpg heist hub",
      "rpg heist guides and generators",
    ],
    userJob: "navigate",
    uniqueValue:
      "Curates the complete RPG heist cluster in one crawlable hub, connecting the four-phase running framework, target design checklist, genre-specific worked examples, and generation tools.",
    parentCluster: "heist",
    clusters: ["heist", "adventure-mapping"],
    relatedIntents: [
      "generator-heist",
      "answer-run-heist-in-tabletop-rpg",
      "answer-heist-target-design",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "topic-puzzles",
    pageKind: "hub",
    canonicalPath: "/topics/puzzles",
    primaryIntent: "tabletop rpg puzzle hub and resources",
    intentAliases: [
      "rpg puzzle topic hub",
      "tabletop puzzle resources",
      "designing and running rpg puzzles",
      "ttrpg puzzle hub",
      "rpg puzzle guides and generators",
    ],
    userJob: "navigate",
    uniqueValue:
      "Curates the RPG puzzle cluster in one crawlable hub, connecting the stall-proof design guide, the hint ladder, genre-specific worked examples with alternate solutions, and the puzzle generator.",
    parentCluster: "puzzle-design",
    clusters: ["puzzle"],
    relatedIntents: [
      "generator-puzzle",
      "answer-rpg-puzzles",
      "answer-rpg-puzzle-hints",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "topic-pirates-high-seas",
    pageKind: "hub",
    canonicalPath: "/topics/pirates",
    primaryIntent: "pirate and high seas campaign guide hub",
    intentAliases: [
      "pirate campaign guides and resources",
      "high seas rpg campaign guides",
      "pirate campaign answers",
    ],
    audience: "Game masters planning pirate or high-seas campaigns",
    userJob: "navigate",
    uniqueValue:
      "Connects practical answers for choosing a system, exploration, sea travel, ship combat, islands and ports, and rival factions with the existing starter-ship guide, campaign page, pirate generators, and a worked adventure example. This is a guide navigator, distinct from the campaign-management focus of /for/pirates-high-seas and the content-creation focus of /generators/pirate.",
    parentCluster: "pirates-high-seas",
    clusters: ["pirate", "pirates-high-seas"],
    relatedIntents: [
      "for-pirates-high-seas",
      "hub-pirate",
      "answer-starter-ship-pirate",
    ],
    indexable: true,
    status: "live",
  },
];
