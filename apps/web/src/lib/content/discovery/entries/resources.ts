import type { DiscoveryEntryInput } from "../schema";

/**
 * `/resources/*`: curated outbound-link pages. Distinct from `/answers` (a
 * direct answer to a question) and `/for` (a setup guide) — a resources page
 * owns a "where do I find X" intent and points the reader at third-party
 * material rather than answering the question itself (#2960).
 */
export const resourceEntries: DiscoveryEntryInput[] = [
  {
    id: "resource-castle-floorplans",
    pageKind: "other",
    canonicalPath: "/resources/castle-floorplans",
    primaryIntent: "castle floorplans for rpgs",
    intentAliases: [
      "medieval castle maps",
      "realistic castle layouts",
      "castle floorplans for dnd",
      "how is a castle laid out",
    ],
    userJob: "understand",
    uniqueValue:
      "Curated, editorially annotated links to real castle and palace floor plans hosted elsewhere, with notes on scale and RPG use rather than reproduced imagery.",
    parentCluster: "worldbuilding",
    relatedIntents: [
      "answer-settlement-contents",
      "answer-heist-target-design",
    ],
    indexable: true,
    status: "live",
  },
];
