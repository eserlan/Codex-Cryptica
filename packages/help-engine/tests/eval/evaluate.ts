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
  type InScopeQuestion,
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
  screen: string;
  hit: boolean;
  noMatch: boolean;
  topRelevance: number;
  sources: string[];
}

export function evaluateInScope(
  bundle: KnowledgeBundle,
  questions: InScopeQuestion[] = IN_SCOPE,
): { results: InScopeResult[]; recallAt3: number; answeredRate: number } {
  const results = questions.map((q) => {
    const r = retrieve(q.question, bundle, SCREENS[q.screen]);
    const sources = r.chunks.map((c) => c.chunk.sourceId);
    return {
      question: q.question,
      screen: q.screen,
      hit: sources.some((s) => q.expect.includes(s)),
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

export function evaluateOutOfScope(bundle: KnowledgeBundle) {
  const results = OUT_OF_SCOPE.map((q) => {
    const r = retrieve(q.question, bundle, SCREENS[q.screen]);
    return {
      question: q.question,
      noMatch: r.noMatch,
      topRelevance: r.topRelevance,
    };
  });
  return {
    results,
    noMatchRate: results.filter((r) => r.noMatch).length / results.length,
  };
}
