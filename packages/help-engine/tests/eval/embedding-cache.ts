import type { KnowledgeBundle } from "../../src/bundle";
import {
  HELP_EMBEDDING_MODEL,
  embeddingFingerprint,
  embeddingText,
  isValidEmbeddingVector,
  validateEmbeddingBatch,
} from "../../src/bundle/embeddings";

export interface EmbeddingCache {
  version: 1;
  model: typeof HELP_EMBEDDING_MODEL;
  entries: Record<string, number[]>;
}

export function parseEmbeddingCache(value: unknown): EmbeddingCache {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("model" in value) ||
    value.model !== HELP_EMBEDDING_MODEL ||
    !("entries" in value) ||
    !value.entries ||
    typeof value.entries !== "object" ||
    Array.isArray(value.entries)
  )
    throw new Error("Invalid evaluation embedding cache or model mismatch.");
  return value as EmbeddingCache;
}

/** Exact model input strings are the keys: edited questions cannot reuse old vectors. */
export async function prepareEmbeddingComparison(
  bundle: KnowledgeBundle,
  questions: readonly string[],
  options: {
    cache?: EmbeddingCache;
    seed?: Record<string, { hash: string; vector: number[] }>;
    embed?: (texts: string[]) => Promise<number[][]>;
    onBatch?: (completed: number, total: number) => void;
  } = {},
) {
  if (options.cache) parseEmbeddingCache(options.cache);
  const entries: Record<string, number[]> = Object.assign(
    Object.create(null),
    options.cache?.entries,
  );
  for (const chunk of bundle.chunks) {
    const seed = options.seed?.[chunk.id];
    if (
      seed?.hash === embeddingFingerprint(chunk) &&
      isValidEmbeddingVector(seed.vector)
    ) {
      entries[embeddingText(chunk)] = seed.vector;
    }
  }
  const texts = [
    ...new Set([...bundle.chunks.map(embeddingText), ...questions]),
  ];
  const missing = texts.filter(
    (text) => !isValidEmbeddingVector(entries[text]),
  );
  if (missing.length && !options.embed) {
    throw new Error(
      `${missing.length} embeddings missing or invalid; populate the cache before an offline comparison.`,
    );
  }
  for (let index = 0; index < missing.length; index += 50) {
    const batch = missing.slice(index, index + 50);
    const vectors = validateEmbeddingBatch(
      await options.embed!(batch),
      batch.length,
    );
    batch.forEach((text, offset) => {
      entries[text] = vectors[offset];
    });
    options.onBatch?.(
      Math.min(index + batch.length, missing.length),
      missing.length,
    );
  }
  // Neither the input bundle nor the caller's cache is mutated, including on failure.
  return {
    bundle: {
      ...bundle,
      chunks: bundle.chunks.map((chunk) => ({
        ...chunk,
        // Match the four-decimal chunk artifact produced by sync-help-embeddings.
        // Query vectors remain full precision, like the Worker's live embedding.
        embedding: entries[embeddingText(chunk)].map(
          (v) => Math.round(v * 10000) / 10000,
        ),
      })),
    },
    queryVectors: new Map(
      questions.map((question) => [question, entries[question]]),
    ),
    cache: {
      version: 1,
      model: HELP_EMBEDDING_MODEL,
      entries,
    } satisfies EmbeddingCache,
    requested: missing.length,
    reused: texts.length - missing.length,
  };
}
