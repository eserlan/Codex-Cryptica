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

export const SEMANTIC_BASE = 0.45;
export const SEMANTIC_SPAN = 0.25;

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i];
    const bi = b[i];
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function normalizeSemanticSimilarity(raw: number): number {
  return Math.max(0, Math.min(1, (raw - SEMANTIC_BASE) / SEMANTIC_SPAN));
}

export interface ScoredChunk {
  chunk: HelpChunk;
  /** Ranking score: match strength plus context boosts. Not capped, so context can break ties. */
  score: number;
  /** Word overlap only, 0..1. */
  lexical: number;
  /** Normalized semantic similarity, 0..1 (when embeddings are available). */
  semantic?: number;
  /**
   * What the relevance floor is judged on: match strength, plus a small bonus
   * when the chunk belongs to a feature on the current screen.
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

// fallow-ignore-next-line complexity
function scoreSingleChunk(
  chunk: HelpChunk,
  lex: number,
  ctx: HelpContext,
  byId: Map<string, FeatureEntry>,
  screenFeatureIds: Set<string>,
  queryVector?: readonly number[],
): ScoredChunk | null {
  let semantic: number | undefined;
  if (queryVector && chunk.embedding) {
    const rawSim = cosineSimilarity(queryVector, chunk.embedding);
    semantic = normalizeSemanticSimilarity(rawSim);
  }

  const matchStrength = semantic !== undefined ? Math.max(lex, semantic) : lex;
  if (matchStrength <= 0) return null;

  const feature = chunk.featureId ? byId.get(chunk.featureId) : undefined;
  const onScreen = feature !== undefined && screenFeatureIds.has(feature.id);
  return {
    chunk,
    lexical: lex,
    semantic,
    score:
      matchStrength + (feature && onScreen ? contextBoost(feature, ctx) : 0),
    relevance: matchStrength + (onScreen ? RELEVANCE_SCREEN_BONUS : 0),
  };
}

export function rankChunks(
  question: string,
  chunks: readonly HelpChunk[],
  features: readonly FeatureEntry[],
  ctx: HelpContext,
  queryVector?: readonly number[],
): ScoredChunk[] {
  const terms = tokenize(question);
  const screenFeatures = features.filter((f) => featureMatchesScreen(f, ctx));
  const screenFeatureIds = new Set(screenFeatures.map((f) => f.id));
  const byId = new Map(features.map((f) => [f.id, f]));

  // "What can I do here?" has no content terms. Answer from the screen's own
  // registry entries rather than giving up, but only those.
  if (terms.length === 0 && !queryVector) {
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
  for (let i = 0; i < chunks.length; i++) {
    const result = scoreSingleChunk(
      chunks[i],
      lexical[i],
      ctx,
      byId,
      screenFeatureIds,
      queryVector,
    );
    if (result) scored.push(result);
  }

  return scored.sort(
    (a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id),
  );
}
