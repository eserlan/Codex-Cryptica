import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBundle, parseHelpArticle } from "../../src/bundle";
import type { KnowledgeBundle } from "../../src/bundle";
import { FEATURE_REGISTRY } from "../../src/registry";
import { retrieve } from "../../src/retrieval";
import {
  IN_SCOPE,
  OUT_OF_SCOPE,
  SCREENS,
  type EvalSplit,
  type InScopeQuestion,
  type OutOfScopeKind,
  type OutOfScopeQuestion,
} from "./questions";

const here = dirname(fileURLToPath(import.meta.url));
export const HELP_DIR = resolve(
  here,
  "../../../../apps/web/src/lib/content/help",
);

/** The same bundle the Worker ships, built from the real in-app help articles. */
export function buildRealBundle(): KnowledgeBundle {
  if (!existsSync(HELP_DIR))
    throw new Error(`help directory not found: ${HELP_DIR}`);
  const articles = readdirSync(HELP_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseHelpArticle(readFileSync(join(HELP_DIR, f), "utf8")))
    .filter((a): a is NonNullable<typeof a> => a !== null);
  return buildBundle({
    features: FEATURE_REGISTRY,
    articles,
    commit: "eval",
    builtAt: "eval",
    channel: "production",
  });
}

export interface InScopeResult {
  question: string;
  split: EvalSplit;
  topic: string;
  screen: string;
  hit: boolean;
  noMatch: boolean;
  topRelevance: number;
  sources: string[];
}

/** Both sides of a comparison must occur within the first three positions. */
export function matchesExpectedSources(
  sources: readonly string[],
  question: Pick<InScopeQuestion, "expect" | "alsoExpect">,
): boolean {
  const topThree = sources.slice(0, 3);
  return (
    topThree.some((source) => question.expect.includes(source)) &&
    (!question.alsoExpect ||
      topThree.some((source) => question.alsoExpect!.includes(source)))
  );
}

export function evaluateInScope(
  bundle: KnowledgeBundle,
  questions: InScopeQuestion[] = IN_SCOPE,
  queryVectors?: ReadonlyMap<string, readonly number[]>,
): { results: InScopeResult[]; recallAt3: number; answeredRate: number } {
  const results = questions.map((q) => {
    const r = retrieve(q.question, bundle, SCREENS[q.screen], {
      queryVector: queryVectors?.get(q.question),
    });
    const sources = r.chunks.map((c) => c.chunk.sourceId);
    return {
      question: q.question,
      split: q.split,
      topic: q.topic,
      screen: q.screen,
      hit: matchesExpectedSources(sources, q),
      noMatch: r.noMatch,
      topRelevance: r.topRelevance,
      sources,
    };
  });
  return {
    results,
    recallAt3: results.filter((r) => r.hit).length / results.length,
    answeredRate: results.filter((r) => !r.noMatch).length / results.length,
  };
}

export const ofKind = (
  questions: OutOfScopeQuestion[],
  kind: OutOfScopeKind,
): OutOfScopeQuestion[] => questions.filter((q) => q.kind === kind);

/** The questions of one half of the set, or all of them. */
export const inSplit = <T extends { split: EvalSplit }>(
  questions: T[],
  split?: EvalSplit,
): T[] => (split ? questions.filter((q) => q.split === split) : questions);

export function evaluateOutOfScope(
  bundle: KnowledgeBundle,
  questions: OutOfScopeQuestion[] = ofKind(OUT_OF_SCOPE, "unrelated"),
  queryVectors?: ReadonlyMap<string, readonly number[]>,
) {
  const results = questions.map((q) => {
    const r = retrieve(q.question, bundle, SCREENS[q.screen], {
      queryVector: queryVectors?.get(q.question),
    });
    return {
      question: q.question,
      split: q.split,
      noMatch: r.noMatch,
      topRelevance: r.topRelevance,
    };
  });
  return {
    results,
    noMatchRate: results.filter((r) => r.noMatch).length / results.length,
  };
}
