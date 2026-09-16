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
];
