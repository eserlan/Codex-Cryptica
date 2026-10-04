import { describe, expect, it, vi } from "vitest";
import { buildBundle } from "../src/bundle";
import {
  HELP_EMBEDDING_MODEL,
  embeddingFingerprint,
  embeddingText,
} from "../src/bundle/embeddings";
import {
  prepareEmbeddingComparison,
  parseEmbeddingCache,
  type EmbeddingCache,
} from "./eval/embedding-cache";
import { evaluateInScope, evaluateOutOfScope } from "./eval/evaluate";
import { summarizeComparison } from "./eval/embedding-comparison";
import type { InScopeQuestion, OutOfScopeQuestion } from "./eval/questions";
import { requestEmbeddings } from "../../../scripts/sync-help-embeddings";

const vector: number[] = Array.from({ length: 384 }, (_, index) =>
  index === 0 ? 1 : 0,
);
const makeBundle = () =>
  buildBundle({
    articles: [
      {
        id: "compass",
        title: "Compass",
        content: "## Orientation\nAn orientation guide.",
      },
    ],
    features: [],
    channel: "production",
    commit: "test",
    builtAt: "test",
  });
const cache = (entries: Record<string, number[]>): EmbeddingCache => ({
  version: 1 as const,
  model: HELP_EMBEDDING_MODEL,
  entries,
});

describe("embedding comparison inputs", () => {
  it("reuses matching shipped chunk vectors and embeds unique questions once", async () => {
    const bundle = makeBundle();
    const embed = vi.fn(async (texts: string[]) => texts.map(() => vector));
    const result = await prepareEmbeddingComparison(
      bundle,
      ["query", "query"],
      {
        seed: Object.fromEntries(
          bundle.chunks.map((chunk) => [
            chunk.id,
            { hash: embeddingFingerprint(chunk), vector },
          ]),
        ),
        embed,
      },
    );
    expect(embed).toHaveBeenCalledTimes(1);
    expect(embed).toHaveBeenCalledWith(["query"]);
    expect(result.bundle.chunks.map((chunk) => chunk.embedding)).toEqual(
      bundle.chunks.map(() => vector),
    );
    expect(bundle.chunks.every((chunk) => !chunk.embedding)).toBe(true);
  });

  it("repeats a complete cached comparison without a network provider", async () => {
    const bundle = makeBundle();
    const entries = Object.fromEntries(
      [...bundle.chunks.map(embeddingText), "query"].map((text) => [
        text,
        vector,
      ]),
    );
    const result = await prepareEmbeddingComparison(bundle, ["query"], {
      cache: cache(entries),
    });
    expect(result.requested).toBe(0);
    expect(result.queryVectors.get("query")).toEqual(vector);
  });

  it("rounds corpus vectors like the sync artifact but keeps query precision", async () => {
    const precise = [...vector];
    precise[0] = 0.123456;
    const result = await prepareEmbeddingComparison(makeBundle(), ["query"], {
      embed: async (texts) => texts.map(() => precise),
    });
    expect(result.bundle.chunks[0].embedding[0]).toBe(0.1235);
    expect(result.queryVectors.get("query")![0]).toBe(0.123456);
  });

  it("refuses incomplete offline coverage and stale shipped vectors", async () => {
    const bundle = makeBundle();
    await expect(
      prepareEmbeddingComparison(bundle, ["query"], {
        seed: Object.fromEntries(
          bundle.chunks.map((chunk) => [chunk.id, { hash: "stale", vector }]),
        ),
      }),
    ).rejects.toThrow("embeddings missing or invalid");
    expect(() =>
      parseEmbeddingCache({ ...cache({}), model: "another-model" }),
    ).toThrow("model mismatch");
  });

  it("does not mutate the cache after a later batch fails", async () => {
    const original = cache({});
    const embed = vi
      .fn(async (texts: string[]) => texts.map(() => vector))
      .mockImplementationOnce(async (texts) => texts.map(() => vector))
      .mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(
      prepareEmbeddingComparison(
        makeBundle(),
        Array.from({ length: 55 }, (_, i) => `query ${i}`),
        { cache: original, embed },
      ),
    ).rejects.toThrow("provider unavailable");
    expect(original.entries).toEqual({});
  });

  it("rejects a malformed embedding batch rather than evaluating partial coverage", async () => {
    await expect(
      prepareEmbeddingComparison(makeBundle(), ["query"], {
        embed: async () => [[1, Number.NaN]],
      }),
    ).rejects.toThrow("invalid embeddings");
  });
});

describe("paired retrieval measurement", () => {
  it("uses query vectors for recall and measures semantic false acceptance separately", async () => {
    const query = "flibbertigibbet quokka";
    const inside: InScopeQuestion[] = [
      {
        question: query,
        screen: "graph",
        expect: ["compass"],
        topic: "test",
        split: "holdout",
      },
    ];
    const outside: OutOfScopeQuestion[] = [
      { question: query, screen: "graph", split: "holdout", kind: "unrelated" },
    ];
    const bundle = makeBundle();
    const prepared = await prepareEmbeddingComparison(bundle, [query], {
      embed: async (texts) => texts.map(() => vector),
    });
    expect(evaluateInScope(bundle, inside).recallAt3).toBe(0);
    const measured = evaluateInScope(
      prepared.bundle,
      inside,
      prepared.queryVectors,
    );
    expect(measured.recallAt3).toBe(1);
    const out = evaluateOutOfScope(
      prepared.bundle,
      outside,
      prepared.queryVectors,
    );
    const summary = summarizeComparison(measured.results, out.results, outside);
    expect(summary.unrelated.noMatchRate).toBe(0);
    expect(summary.splits.holdout.recallAt3).toBe(1);
    expect(summary.separation.gap).toBe(0);
    expect(summary.nearMiss.noMatchRate).toBeNull();
  });
});

describe("Workers AI embedding requests", () => {
  const auth = { token: "test-secret", accountId: "test-account" };
  it("validates a successful response and uses the shipped model", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json({ success: true, result: { data: [vector] } }),
    );
    expect(
      await requestEmbeddings(
        ["query"],
        auth,
        fetcher as unknown as typeof fetch,
      ),
    ).toEqual([vector]);
    expect(fetcher.mock.calls[0][0]).toContain(HELP_EMBEDDING_MODEL);
  });
  it("does not reflect provider error bodies or credentials", async () => {
    const fetcher = vi.fn(
      async () => new Response("test-secret", { status: 401 }),
    );
    await expect(
      requestEmbeddings(["query"], auth, fetcher as unknown as typeof fetch),
    ).rejects.toThrow(/^Cloudflare Workers AI embedding failed \(401\)\.$/);
  });
});
