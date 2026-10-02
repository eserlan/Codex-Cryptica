import type { KnowledgeBundle } from "../bundle/types";
import type { HelpContext } from "../context";
import type { HelpTurn } from "../prompt/build";
import type { FeatureEntry } from "../registry/schema";
import { contextualizeQuery } from "./contextualize";
import { MIN_RELEVANCE, rankChunks, type ScoredChunk } from "./rank";

export interface RetrieveOptions {
  limit?: number;
  minRelevance?: number;
  queryVector?: readonly number[];
  history?: readonly HelpTurn[];
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

export const DEFAULT_LIMIT = 4;

/**
 * No more than this many chunks from one feature (or, for an article no
 * feature claims, one article). With only a few chunks shown, one feature's
 * entry and article could fill them all and a question that spans two features
 * ("is X the same as Y?") would only ever hear about one.
 */
export const MAX_CHUNKS_PER_FEATURE = 2;

/** A shown chunk needs at least this fraction of the relevance floor. */
export const INCLUSION_RATIO = 0.5;

type PickState = {
  perGroup: Map<string, number>;
  picked: Set<ScoredChunk>;
  sources: Set<string>;
};

const groupFor = (item: ScoredChunk) =>
  item.chunk.featureId ?? item.chunk.sourceId;

function pickDistinctSources(
  ranked: ScoredChunk[],
  limit: number,
  floor: number,
  state: PickState,
): void {
  for (const item of ranked) {
    if (state.picked.size === limit) break;
    if (item.relevance < floor) continue;

    const group = groupFor(item);
    const used = state.perGroup.get(group) ?? 0;
    if (
      used >= MAX_CHUNKS_PER_FEATURE ||
      state.sources.has(item.chunk.sourceId)
    )
      continue;

    state.sources.add(item.chunk.sourceId);
    state.perGroup.set(group, used + 1);
    state.picked.add(item);
  }
}

function pickAdditionalFeatureChunks(
  ranked: ScoredChunk[],
  limit: number,
  floor: number,
  state: PickState,
): void {
  for (const item of ranked) {
    if (state.picked.size === limit) break;
    if (state.picked.has(item) || item.relevance < floor) continue;

    const group = groupFor(item);
    const used = state.perGroup.get(group) ?? 0;
    if (used >= MAX_CHUNKS_PER_FEATURE) continue;

    state.perGroup.set(group, used + 1);
    state.picked.add(item);
  }
}

function fillRemainingChunks(
  ranked: ScoredChunk[],
  limit: number,
  picked: Set<ScoredChunk>,
): void {
  for (const item of ranked) {
    if (picked.size === limit) break;
    picked.add(item);
  }
}

/**
 * Picks distinct relevant sources first, then additional sections in rank order. The per-feature cap only ever swaps
 * in a chunk that clears the full relevance floor: a weak chunk must never
 * take the place of a relevant one just to look varied. Slots the cap leaves
 * empty go back to the best remaining chunks.
 */
function diversify(
  ranked: ScoredChunk[],
  limit: number,
  floor: number,
): ScoredChunk[] {
  const state: PickState = {
    perGroup: new Map(),
    picked: new Set(),
    sources: new Set(),
  };
  // Once distinct sources have been considered, retain useful additional
  // sections rather than padding with a weak or unrelated source.
  pickDistinctSources(ranked, limit, floor, state);
  pickAdditionalFeatureChunks(ranked, limit, floor, state);
  fillRemainingChunks(ranked, limit, state.picked);
  return [...state.picked];
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
      titles.set(chunk.helpId, chunk.citationTitle ?? chunk.title);
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
  const effectiveQuestion = options.history?.length
    ? contextualizeQuery(question, options.history)
    : question;
  const ranked = rankChunks(
    effectiveQuestion,
    bundle.chunks,
    bundle.features,
    ctx,
    options.queryVector,
  );
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
