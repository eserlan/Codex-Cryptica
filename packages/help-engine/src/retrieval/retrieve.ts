import type { KnowledgeBundle } from "../bundle/types";
import type { HelpContext } from "../context";
import type { FeatureEntry } from "../registry/schema";
import { MIN_RELEVANCE, rankChunks, type ScoredChunk } from "./rank";

export interface RetrieveOptions {
  limit?: number;
  minRelevance?: number;
}

export interface RetrievalResult {
  chunks: ScoredChunk[];
  /** Best word-overlap relevance found (0..1), judged against the floor. */
  topRelevance: number;
  /** True when nothing cleared the relevance floor; the model must not be called. */
  noMatch: boolean;
  /** Registry features that apply to the current screen. */
  screenFeatures: FeatureEntry[];
  /** The closest topics, for the no-match message. */
  suggestions: { helpId: string; title: string }[];
}

export const DEFAULT_LIMIT = 3;

/**
 * No more than this many chunks from one feature (or, for an article no
 * feature claims, one article). With only a few chunks shown, one feature's
 * entry and article could fill them all and a question that spans two features
 * ("is X the same as Y?") would only ever hear about one.
 */
export const MAX_CHUNKS_PER_FEATURE = 2;

/** A shown chunk needs at least this fraction of the relevance floor. */
export const INCLUSION_RATIO = 0.5;

/**
 * Picks the chunks to show, in rank order. The per-feature cap only ever swaps
 * in a chunk that clears the full relevance floor: a weak chunk must never
 * take the place of a relevant one just to look varied. Slots the cap leaves
 * empty go back to the best remaining chunks.
 */
function diversify(
  ranked: ScoredChunk[],
  limit: number,
  floor: number,
): ScoredChunk[] {
  const perGroup = new Map<string, number>();
  const picked = new Set<ScoredChunk>();
  for (const r of ranked) {
    if (picked.size === limit) break;
    if (r.relevance < floor) continue;
    const group = r.chunk.featureId ?? r.chunk.sourceId;
    const used = perGroup.get(group) ?? 0;
    if (used >= MAX_CHUNKS_PER_FEATURE) continue;
    perGroup.set(group, used + 1);
    picked.add(r);
  }
  for (const r of ranked) {
    if (picked.size === limit) break;
    picked.add(r);
  }
  return ranked.filter((r) => picked.has(r));
}

function closestTopics(
  ranked: ScoredChunk[],
  bundle: KnowledgeBundle,
  screenFeatures: FeatureEntry[],
  n = 3,
): { helpId: string; title: string }[] {
  const titles = new Map<string, string>();
  for (const chunk of bundle.chunks) {
    if (chunk.helpId && !titles.has(chunk.helpId))
      titles.set(chunk.helpId, chunk.title);
  }
  const out: { helpId: string; title: string }[] = [];
  const add = (helpId: string) => {
    const title = titles.get(helpId);
    if (title && !out.some((o) => o.helpId === helpId) && out.length < n) {
      out.push({ helpId, title });
    }
  };
  for (const r of ranked) if (r.chunk.helpId) add(r.chunk.helpId);
  for (const feature of screenFeatures) feature.helpIds.forEach(add);
  return out;
}

/** Registry-first, context-aware retrieval over the knowledge bundle. */
export function retrieve(
  question: string,
  bundle: KnowledgeBundle,
  ctx: HelpContext,
  options: RetrieveOptions = {},
): RetrievalResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const floor = options.minRelevance ?? MIN_RELEVANCE;
  const ranked = rankChunks(question, bundle.chunks, bundle.features, ctx);
  const screenFeatures = bundle.features.filter((f) =>
    f.areas.includes(ctx.area),
  );
  const topRelevance = ranked.reduce((max, r) => Math.max(max, r.relevance), 0);
  const noMatch = topRelevance < floor;
  return {
    // The floor decides whether the question is answerable at all. Which
    // chunks to show is decided by the ranking score, so the on-screen
    // evidence wins even when a generic article elsewhere overlaps more words.
    // A lower bar still keeps out chunks that share almost nothing.
    chunks: noMatch
      ? []
      : diversify(
          ranked.filter((r) => r.relevance >= floor * INCLUSION_RATIO),
          limit,
          floor,
        ),
    topRelevance,
    noMatch,
    screenFeatures,
    suggestions: closestTopics(ranked, bundle, screenFeatures),
  };
}
