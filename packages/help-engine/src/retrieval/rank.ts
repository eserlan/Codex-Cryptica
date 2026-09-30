import type { HelpChunk } from "../bundle/types";
import type { HelpContext } from "../context";
import type { FeatureEntry } from "../registry/schema";
import { tokenize } from "./text";

/** Below this normalised relevance the model is not called at all. */
export const MIN_RELEVANCE = 0.3;

/** Score given to context-matching registry chunks for "what can I do here?" questions. */
export const CONTEXT_ONLY_SCORE = 0.35;

/**
 * How much belonging to a feature on the current screen counts toward the
 * relevance floor. Questions carry narrative words ("the faction I just
 * created") that no help article contains, so word overlap alone undersells a
 * chunk that is plainly about what the user is looking at. Kept small, and
 * only ever added to a chunk that already shares a word with the question.
 */
export const RELEVANCE_SCREEN_BONUS = 0.15;

export const BOOSTS = {
  feature: 0.2,
  route: 0.15,
  kind: 0.1,
  tab: 0.05,
} as const;

export interface ScoredChunk {
  chunk: HelpChunk;
  /** Ranking score: word overlap plus context boosts. Not capped, so context can break ties. */
  score: number;
  /** Word overlap only, 0..1. */
  lexical: number;
  /**
   * What the relevance floor is judged on: word overlap, plus a small bonus
   * when the chunk belongs to a feature on the current screen. It is never the
   * full ranking boost, so screen context cannot make a weak match look
   * strong. Context-only answers use CONTEXT_ONLY_SCORE.
   */
  relevance: number;
}

function featureMatchesScreen(
  feature: FeatureEntry,
  ctx: HelpContext,
): boolean {
  return feature.areas.includes(ctx.area);
}

const K1 = 1.2;
const B = 0.75;

/** Title and heading words count more than body words. */
function chunkTerms(c: HelpChunk): string[] {
  const head = tokenize(`${c.title} ${c.heading}`);
  return [...head, ...head, ...tokenize(c.text)];
}

/**
 * BM25 over the question's terms, scaled to 0..1 by the best score any chunk
 * could reach for this question. Term frequency rewards a chunk that is
 * really about a word, and length normalisation stops a long generic article
 * from winning just because it mentions everything once.
 */
function lexicalScores(
  queryTerms: string[],
  chunks: readonly HelpChunk[],
): number[] {
  const docs = chunks.map(chunkTerms);
  const avgLen =
    docs.reduce((sum, d) => sum + d.length, 0) / (docs.length || 1) || 1;
  const df = new Map<string, number>();
  for (const doc of docs)
    for (const t of new Set(doc)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = chunks.length || 1;
  const idf = (t: string) =>
    Math.log(1 + (n - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
  const unique = [...new Set(queryTerms)];
  const ceiling = unique.reduce((sum, t) => sum + idf(t) * (K1 + 1), 0) || 1;
  return docs.map((doc) =>
    Math.min(1, bm25(doc, unique, idf, avgLen) / ceiling),
  );
}

function bm25(
  doc: string[],
  terms: string[],
  idf: (term: string) => number,
  avgLen: number,
): number {
  const counts = new Map<string, number>();
  for (const t of doc) counts.set(t, (counts.get(t) ?? 0) + 1);
  const lengthNorm = K1 * (1 - B + (B * doc.length) / avgLen);
  let score = 0;
  for (const t of terms) {
    const tf = counts.get(t) ?? 0;
    if (tf > 0) score += (idf(t) * (tf * (K1 + 1))) / (tf + lengthNorm);
  }
  return score;
}

/** How strongly the current screen favours a feature that is already on it. */
function contextBoost(feature: FeatureEntry, ctx: HelpContext): number {
  let boost: number = BOOSTS.feature;
  if (feature.routes.includes(ctx.routeTemplate)) boost += BOOSTS.route;
  const kindFits =
    ctx.entityKind !== null &&
    (feature.kinds === "any" || feature.kinds.includes(ctx.entityKind));
  if (kindFits) boost += BOOSTS.kind;
  if (ctx.tab && feature.tabs.includes(ctx.tab)) boost += BOOSTS.tab;
  return boost;
}

export function rankChunks(
  question: string,
  chunks: readonly HelpChunk[],
  features: readonly FeatureEntry[],
  ctx: HelpContext,
): ScoredChunk[] {
  const terms = tokenize(question);
  const screenFeatures = features.filter((f) => featureMatchesScreen(f, ctx));
  const screenFeatureIds = new Set(screenFeatures.map((f) => f.id));
  const byId = new Map(features.map((f) => [f.id, f]));

  // "What can I do here?" has no content terms. Answer from the screen's own
  // registry entries rather than giving up, but only those.
  if (terms.length === 0) {
    return chunks
      .filter(
        (c) =>
          c.kind === "registry" &&
          c.featureId &&
          screenFeatureIds.has(c.featureId),
      )
      .map((chunk) => ({
        chunk,
        score: CONTEXT_ONLY_SCORE,
        lexical: 0,
        relevance: CONTEXT_ONLY_SCORE,
      }))
      .sort((a, b) => a.chunk.id.localeCompare(b.chunk.id));
  }

  const lexical = lexicalScores(terms, chunks);
  const scored: ScoredChunk[] = [];
  chunks.forEach((chunk, i) => {
    const lex = lexical[i];
    if (lex <= 0) return; // context never rescues a chunk with no word overlap
    const feature = chunk.featureId ? byId.get(chunk.featureId) : undefined;
    const onScreen = feature !== undefined && screenFeatureIds.has(feature.id);
    scored.push({
      chunk,
      lexical: lex,
      score: lex + (feature && onScreen ? contextBoost(feature, ctx) : 0),
      relevance: lex + (onScreen ? RELEVANCE_SCREEN_BONUS : 0),
    });
  });

  return scored.sort(
    (a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id),
  );
}
