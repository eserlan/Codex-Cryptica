import type { DiscoveryEntryInput } from "../schema";
import { answers } from "../../answers/pages";

/**
 * `/answers/[slug]` — reference answers to real questions (#2564).
 *
 * Automatically derived from the registered answers in `apps/web/src/lib/content/answers/pages/`.
 * Supports single-file authoring: an answer page defines its `discovery` metadata, and it is
 * automatically included in the Discovery Intent Registry without editing this file.
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
  ...Object.values(answers).map((answer): DiscoveryEntryInput => {
    const disc = answer.discovery;
    return {
      id: disc?.id ?? `answer-${answer.slug}`,
      pageKind: "answer",
      canonicalPath: `/answers/${answer.slug}`,
      primaryIntent:
        disc?.primaryIntent ?? answer.question.toLowerCase().replace(/\?$/, ""),
      intentAliases: disc?.intentAliases ?? [],
      userJob: disc?.userJob ?? "understand",
      uniqueValue: disc?.uniqueValue ?? answer.shortAnswer,
      parentCluster: disc?.parentCluster ?? answer.category,
      ...(disc?.relatedIntents?.length
        ? { relatedIntents: disc.relatedIntents }
        : {}),
      ...(disc?.acknowledgedOverlap?.length
        ? { acknowledgedOverlap: disc.acknowledgedOverlap }
        : {}),
      indexable: true,
      status: "live",
    };
  }),
];
