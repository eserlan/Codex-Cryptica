import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  getWranglerAuth,
  requestEmbeddings,
} from "../../../../scripts/sync-help-embeddings";
import {
  HELP_EMBEDDING_MODEL,
  embeddingFingerprint,
  isValidEmbeddingVector,
} from "../../src/bundle/embeddings";
import { evaluateInScope, evaluateOutOfScope, HELP_DIR } from "./evaluate";
import type { KnowledgeBundle } from "../../src/bundle";
import type { InScopeQuestion, OutOfScopeQuestion } from "./questions";
import {
  parseEmbeddingCache,
  prepareEmbeddingComparison,
} from "./embedding-cache";

type InResult = ReturnType<typeof evaluateInScope>["results"][number];
type OutResult = ReturnType<typeof evaluateOutOfScope>["results"][number];
const rate = (count: number, total: number) => (total ? count / total : null);

export function summarizeComparison(
  inside: InResult[],
  outside: OutResult[],
  questions: OutOfScopeQuestion[],
) {
  const unrelated = outside.filter(
    (_, index) => questions[index].kind === "unrelated",
  );
  const nearMiss = outside.filter(
    (_, index) => questions[index].kind === "near-miss",
  );
  const weakestIn = inside.length
    ? Math.min(...inside.map((r) => r.topRelevance))
    : null;
  const strongestOut = unrelated.length
    ? Math.max(...unrelated.map((r) => r.topRelevance))
    : null;
  return {
    inScope: inside.length,
    correctAt3: inside.filter((r) => r.hit).length,
    recallAt3: rate(inside.filter((r) => r.hit).length, inside.length),
    answeredRate: rate(inside.filter((r) => !r.noMatch).length, inside.length),
    splits: Object.fromEntries(
      ["tune", "holdout"].map((split) => {
        const rows = inside.filter((r) => r.split === split);
        return [
          split,
          {
            count: rows.length,
            correctAt3: rows.filter((r) => r.hit).length,
            recallAt3: rate(rows.filter((r) => r.hit).length, rows.length),
          },
        ];
      }),
    ),
    unrelated: {
      count: unrelated.length,
      refused: unrelated.filter((r) => r.noMatch).length,
      noMatchRate: rate(
        unrelated.filter((r) => r.noMatch).length,
        unrelated.length,
      ),
    },
    nearMiss: {
      count: nearMiss.length,
      refused: nearMiss.filter((r) => r.noMatch).length,
      noMatchRate: rate(
        nearMiss.filter((r) => r.noMatch).length,
        nearMiss.length,
      ),
    },
    allOutOfScopeNoMatchRate: rate(
      outside.filter((r) => r.noMatch).length,
      outside.length,
    ),
    separation: {
      weakestIn,
      strongestUnrelated: strongestOut,
      gap:
        weakestIn !== null && strongestOut !== null
          ? weakestIn - strongestOut
          : null,
    },
  };
}

export async function runEmbeddingComparison(
  bundle: KnowledgeBundle,
  inside: InScopeQuestion[],
  outside: OutOfScopeQuestion[],
  options: {
    cachePath?: string;
    reportPath?: string;
    offline?: boolean;
    fresh?: boolean;
  } = {},
) {
  const root = resolve(HELP_DIR, "../../../../../../");
  const cachePath = resolve(
    options.cachePath ?? resolve(root, ".cache/help-eval-embeddings.json"),
  );
  const seedPath = resolve(
    root,
    "packages/help-engine/src/bundle/embeddings.generated.json",
  );
  const seed: Record<string, { hash: string; vector: number[] }> = existsSync(
    seedPath,
  )
    ? JSON.parse(readFileSync(seedPath, "utf8"))
    : {};
  const shippedCacheBundle = {
    ...bundle,
    chunks: bundle.chunks.map(({ embedding: _embedding, ...chunk }) => {
      const entry = seed[chunk.id];
      return entry?.hash === embeddingFingerprint(chunk) &&
        isValidEmbeddingVector(entry.vector)
        ? { ...chunk, embedding: entry.vector }
        : chunk;
    }),
  };
  const prepared = await prepareEmbeddingComparison(
    bundle,
    [...inside, ...outside].map((q) => q.question),
    {
      cache: existsSync(cachePath)
        ? parseEmbeddingCache(JSON.parse(readFileSync(cachePath, "utf8")))
        : undefined,
      seed,
      embed: options.offline
        ? undefined
        : async (texts) => {
            const auth = getWranglerAuth();
            if (!auth)
              throw new Error(
                "No Workers AI credentials. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID or log in with wrangler.",
              );
            return requestEmbeddings(texts, auth);
          },
      onBatch: (completed, total) =>
        console.error(`Embedded ${completed}/${total} missing inputs.`),
    },
  );
  if (!options.offline) {
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, JSON.stringify(prepared.cache));
  }
  const evaluate = (
    candidate: KnowledgeBundle,
    vectors?: ReadonlyMap<string, readonly number[]>,
  ) => {
    const inScope = evaluateInScope(candidate, inside, vectors).results;
    const outOfScope = evaluateOutOfScope(candidate, outside, vectors).results;
    return {
      summary: summarizeComparison(inScope, outOfScope, outside),
      inScope,
      outOfScope,
    };
  };
  const lexical = {
    ...bundle,
    chunks: bundle.chunks.map(({ embedding: _embedding, ...chunk }) => chunk),
  };
  const fingerprint = (value: unknown) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const report = {
    version: 1,
    model: HELP_EMBEDDING_MODEL,
    ranking:
      "lexical-plus-context vs production hybrid algorithm with complete vectors (max lexical/semantic plus context; unchanged floor)",
    dataset: options.fresh
      ? "fresh frozen holdout"
      : "expanded tune and legacy regression",
    corpus: {
      chunks: bundle.chunks.length,
      articles: bundle.helpIds.length,
      features: bundle.features.length,
      lexicalBytes: Buffer.byteLength(JSON.stringify(lexical)),
      hybridBytes: Buffer.byteLength(JSON.stringify(prepared.bundle)),
      shippedCachedVectorChunks: shippedCacheBundle.chunks.filter(
        (chunk) => "embedding" in chunk,
      ).length,
      shippedCachedBytes: Buffer.byteLength(JSON.stringify(shippedCacheBundle)),
      sha256: fingerprint(lexical),
    },
    questionsSha256: fingerprint({ inside, outside }),
    vectorsSha256: fingerprint({
      chunks: prepared.bundle.chunks.map((chunk) => [
        chunk.id,
        chunk.embedding,
      ]),
      questions: [...prepared.queryVectors],
    }),
    embeddings: {
      reused: prepared.reused,
      requested: prepared.requested,
      cachedInputs: Object.keys(prepared.cache.entries).length,
    },
    lexical: evaluate(lexical),
    hybrid: evaluate(prepared.bundle, prepared.queryVectors),
  };
  if (options.reportPath) {
    mkdirSync(dirname(resolve(options.reportPath)), { recursive: true });
    writeFileSync(options.reportPath, JSON.stringify(report, null, 2) + "\n");
  }
  console.log(
    JSON.stringify(
      {
        ...report,
        lexical: report.lexical.summary,
        hybrid: report.hybrid.summary,
      },
      null,
      2,
    ),
  );
  return report;
}
