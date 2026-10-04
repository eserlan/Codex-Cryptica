import { sanitizeHelpContext } from "../src/context";
import { retrieve } from "../src/retrieval";
import { finalizeAnswer } from "../src/response/finalize";
import { KNOWN_HELP_IDS } from "./fixtures/help-article-ids";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MAX_CHUNK_TOKENS,
  buildBundle,
  chunkMarkdown,
  estimateTokens,
  parseHelpArticle,
} from "../src/bundle";
import {
  embeddingFingerprint,
  HELP_EMBEDDING_DIMENSIONS,
  isValidEmbeddingVector,
  validateEmbeddingBatch,
} from "../src/bundle/embeddings";
import {
  FEATURE_REGISTRY,
  GENERATORS,
  type FeatureEntry,
} from "../src/registry";

const article = (id: string, content = "## A\nText about A.") => ({
  id,
  title: id,
  content,
});

const articles = KNOWN_HELP_IDS.map((id) =>
  article(
    id,
    `# ${id}\n\nIntro.\n\n## Section One\nOne body.\n\n## Section Two\nTwo body.`,
  ),
);

const input = {
  features: FEATURE_REGISTRY,
  articles,
  commit: "abc123",
  builtAt: "2026-09-30T00:00:00.000Z",
  channel: "production" as const,
};

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const productionHelpDirectory = join(
  repositoryRoot,
  "apps/web/src/lib/content/help",
);
const productionArticles = readdirSync(productionHelpDirectory)
  .filter((file) => file.endsWith(".md"))
  .sort()
  .map((file) =>
    parseHelpArticle(readFileSync(join(productionHelpDirectory, file), "utf8")),
  )
  .filter((article) => article !== null);
const productionEmbeddings = JSON.parse(
  readFileSync(
    join(
      repositoryRoot,
      "packages/help-engine/src/bundle/embeddings.generated.json",
    ),
    "utf8",
  ),
);

describe("chunkMarkdown", () => {
  const opts = (markdown: string) => ({
    sourceId: "doc",
    title: "Doc",
    markdown,
    kind: "help" as const,
    featureId: null,
    helpId: "doc",
  });

  it("splits on ## headings and keeps the heading on each chunk", () => {
    const chunks = chunkMarkdown(
      opts("# Title\n\n## One\nAlpha.\n\n## Two\nBeta."),
    );
    expect(chunks.map((c) => c.heading)).toEqual(["One", "Two"]);
    expect(chunks.map((c) => c.id)).toEqual(["doc#0", "doc#1"]);
  });

  it("keeps every chunk within the token budget", () => {
    const long = Array.from(
      { length: 60 },
      (_, i) => `Sentence number ${i} is here.`,
    ).join(" ");
    const chunks = chunkMarkdown(opts(`## Big\n${long}\n\n${long}`));
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(estimateTokens(chunk.text)).toBeLessThanOrEqual(MAX_CHUNK_TOKENS);
    }
  });

  it("produces stable IDs and hashes for identical content, and a new hash when text changes", () => {
    const a = chunkMarkdown(opts("## One\nAlpha."));
    const b = chunkMarkdown(opts("## One\nAlpha."));
    const c = chunkMarkdown(opts("## One\nAlpha changed."));
    expect(a).toEqual(b);
    expect(c[0].id).toBe(a[0].id);
    expect(c[0].hash).not.toBe(a[0].hash);
  });

  it("returns no chunks for empty content", () => {
    expect(chunkMarkdown(opts("   \n"))).toEqual([]);
  });
});

describe("buildBundle", () => {
  it("emits registry overview and workflow chunks plus help chunks", () => {
    const bundle = buildBundle(input);
    const sources = new Set(bundle.chunks.map((c) => c.sourceId));
    expect(sources.has("registry:entity-connections")).toBe(true);
    expect(sources.has("connections-tab")).toBe(true);
    expect(
      bundle.chunks.find((c) => c.id === "registry:entity-connections#1")
        ?.heading,
    ).toBe("Connect this entity to another");
    expect(bundle.commit).toBe("abc123");
    expect(bundle.helpIds).toContain("session-hub");
  });

  it("links help chunks to the feature that references the article", () => {
    const bundle = buildBundle(input);
    const chunk = bundle.chunks.find((c) => c.sourceId === "connections-tab")!;
    expect(chunk.featureId).toBe("entity-connections");
  });

  it("resolves registry citations to article titles without changing retrieval titles", () => {
    const bundle = buildBundle({
      ...input,
      articles: articles.map((a) =>
        a.id === "connections-tab" ? { ...a, title: "Connections Tab" } : a,
      ),
    });
    const chunks = bundle.chunks.filter(
      (c) => c.sourceId === "registry:entity-connections",
    );
    for (const chunk of chunks) {
      expect(chunk.helpId).toBe("connections-tab");
      expect(chunk.citationTitle).toBe("Connections Tab");
      expect(chunk.title).toBe(
        FEATURE_REGISTRY.find((f) => f.id === "entity-connections")!.title,
      );
    }
    const result = finalizeAnswer({
      raw: {
        answer: "Open Connections.",
        sourceIds: [...chunks.map((c) => c.id), "connections-tab#0"],
        confidence: "high",
      },
      chunks: bundle.chunks,
      candidates: [],
      suggestions: [],
    });
    expect(result?.sources).toEqual([
      { id: chunks[0].id, title: "Connections Tab", helpId: "connections-tab" },
    ]);
  });

  it("keeps undocumented registry chunks available for grounding without an article link", () => {
    const feature = { ...FEATURE_REGISTRY[0], helpIds: [], related: [] };
    const bundle = buildBundle({ ...input, features: [feature] });
    const chunk = bundle.chunks.find(
      (c) => c.sourceId === `registry:${feature.id}`,
    )!;
    expect(chunk.helpId).toBeNull();
    expect(chunk.citationTitle).toBeUndefined();
    expect(chunk.text).toContain(feature.summary);
  });

  it("retrieves the distinction between automatic Graph clusters and manual visual arrangement", () => {
    const bundle = buildBundle({ ...input, articles: productionArticles });
    const context = sanitizeHelpContext({
      routeTemplate: "/(app)",
      area: "graph",
      surface: "vault",
    });
    for (const { question, expectedPhrase } of [
      {
        question: "How does grouping work?",
        expectedPhrase:
          "automatic visual clusters of closely connected entities",
      },
      {
        question: "Can I group these entities visually?",
        expectedPhrase:
          "no manual add/remove, rename, resize, or style control",
      },
      {
        question: "How do I make a group in the graph?",
        expectedPhrase: "cannot manually create a Graph group",
      },
      {
        question: "Does grouping change the relationships between entities?",
        expectedPhrase: "no entity data, relationships, or node positions",
      },
      {
        question: "Can I save my groups?",
        expectedPhrase: "cannot manually create a Graph group",
      },
    ]) {
      const result = retrieve(question, bundle, context);
      expect(result.noMatch, question).toBe(false);
      expect(
        result.chunks.some(({ chunk }) => chunk.text.includes(expectedPhrase)),
        question,
      ).toBe(true);
    }
    const article = productionArticles.find((a) => a.id === "graph-basics")!;
    expect(article.content).toContain("Small clusters may have no background");
    expect(article.content).toContain("no manual add/remove, rename, resize");
    expect(article.content).toContain(
      "does not create or change entity relationships",
    );
    expect(article.content).toContain("Save current layout");
  });

  it("retrieves entity-view AI revision steps and their discard path", () => {
    const bundle = buildBundle({ ...input, articles: productionArticles });
    const context = sanitizeHelpContext({
      routeTemplate: "/(app)",
      area: "entity-detail",
      surface: "vault",
    });
    const result = retrieve("what of ai revisions?", bundle, context);
    expect(result.noMatch).toBe(false);
    expect(
      result.chunks.some(
        ({ chunk }) =>
          chunk.helpId === "creating-and-editing-entities" &&
          chunk.text.includes("AI Revise Description"),
      ),
    ).toBe(true);
    const article = productionArticles.find(
      (a) => a.id === "creating-and-editing-entities",
    )!;
    expect(article.content).toContain("**Discard** to keep the original");
    expect(article.content).toContain(
      "If generation fails, your existing entity text remains unchanged.",
    );
    expect(article.content).toContain("**Zen Mode**");
  });

  it("is deterministic for the same input", () => {
    expect(buildBundle(input)).toEqual(buildBundle(input));
  });

  it("fails the build when a referenced help article is missing", () => {
    const missing = articles.filter((a) => a.id !== "connections-tab");
    expect(() => buildBundle({ ...input, articles: missing })).toThrow(
      /unknown help article "connections-tab"/,
    );
  });

  it("drops staging-only features from a production bundle but keeps them for staging", () => {
    const staging: FeatureEntry = {
      ...FEATURE_REGISTRY[0],
      id: "staging-only",
      channel: "staging",
      related: [],
      actions: [],
      workflows: [],
    };
    const features = [...FEATURE_REGISTRY, staging];
    expect(
      buildBundle({ ...input, features }).features.map((f) => f.id),
    ).not.toContain("staging-only");
    expect(
      buildBundle({ ...input, features, channel: "staging" }).features.map(
        (f) => f.id,
      ),
    ).toContain("staging-only");
  });

  it("attaches only current, complete embeddings", () => {
    const source = buildBundle(input);
    const validChunk = source.chunks.find(
      (chunk) => chunk.id === "connections-tab#0",
    )!;
    const staleChunk = source.chunks.find(
      (chunk) => chunk.kind === "help" && chunk.id !== validChunk.id,
    )!;
    const malformedChunk = source.chunks.find(
      (chunk) =>
        chunk.kind === "help" &&
        chunk.id !== validChunk.id &&
        chunk.id !== staleChunk.id,
    )!;
    const bundle = buildBundle({
      ...input,
      embeddings: {
        [validChunk.id]: {
          hash: embeddingFingerprint(validChunk),
          vector: Array(HELP_EMBEDDING_DIMENSIONS).fill(0.25),
        },
        [staleChunk.id]: {
          hash: "stale",
          vector: Array(HELP_EMBEDDING_DIMENSIONS).fill(0.25),
        },
        [malformedChunk.id]: {
          hash: embeddingFingerprint(malformedChunk),
          vector: Array(HELP_EMBEDDING_DIMENSIONS).fill(Number.NaN),
        },
      },
    });

    expect(
      bundle.chunks.find((chunk) => chunk.id === validChunk.id)?.embedding,
    ).toHaveLength(HELP_EMBEDDING_DIMENSIONS);
    expect(
      bundle.chunks.find((chunk) => chunk.id === staleChunk.id)?.embedding,
    ).toBeUndefined();
    expect(
      bundle.chunks.find((chunk) => chunk.id === malformedChunk.id)?.embedding,
    ).toBeUndefined();
  });
});

describe("embedding data", () => {
  it("fingerprints the full embedded text, including its title", () => {
    const chunk = { title: "Original", heading: "Heading", text: "Body" };
    expect(embeddingFingerprint(chunk)).not.toBe(
      embeddingFingerprint({ ...chunk, title: "Renamed" }),
    );
    expect(embeddingFingerprint(chunk)).not.toBe(
      embeddingFingerprint(chunk, "different-model"),
    );
  });

  it("accepts only complete batches of finite 384-value vectors", () => {
    const vector = Array(HELP_EMBEDDING_DIMENSIONS).fill(0.1);
    expect(validateEmbeddingBatch([vector], 1)).toEqual([vector]);
    expect(isValidEmbeddingVector([...vector, 0])).toBe(false);
    expect(
      isValidEmbeddingVector(
        vector.map((value, index) => (index === 0 ? Number.NaN : value)),
      ),
    ).toBe(false);
    expect(() => validateEmbeddingBatch([], 1)).toThrow(/expected 1 vectors/);
    expect(isValidEmbeddingVector(new Array(HELP_EMBEDDING_DIMENSIONS))).toBe(
      false,
    );
    expect(() => validateEmbeddingBatch(new Array(1), 1)).toThrow(
      /expected 1 vectors/,
    );
  });
});

describe("generator chunks", () => {
  const bundle = buildBundle(input);

  it("has one chunk per generator, owned by the generators feature", () => {
    const chunks = bundle.chunks.filter((c) =>
      c.sourceId.startsWith("generator:"),
    );
    expect(chunks.map((c) => c.sourceId).sort()).toEqual(
      GENERATORS.map((g) => `generator:${g.id}`).sort(),
    );
    for (const chunk of chunks) {
      expect(chunk.kind).toBe("registry");
      expect(chunk.featureId).toBe("campaign-generator");
    }
  });

  it("links generator citations only when the guide is present", () => {
    const quest = bundle.chunks.find((c) => c.id === "generator:quest#0")!;
    expect(quest.helpId).toBe("in-app-generators");
    expect(quest.citationTitle).toBe("in-app-generators");
    const withoutGuide = buildBundle({ ...input, features: [], articles: [] });
    const unlinked = withoutGuide.chunks.find((c) => c.id === quest.id)!;
    expect(unlinked.helpId).toBeNull();
    expect(unlinked.citationTitle).toBeUndefined();
  });

  it("names the generator and says what it makes, in the user's words", () => {
    const quest = bundle.chunks.find((c) => c.id === "generator:quest#0")!;
    const meta = GENERATORS.find((g) => g.id === "quest")!;
    expect(quest.title).toBe(meta.label);
    expect(quest.text).toContain(meta.description);
  });

  it('does not repeat the word "generator", which would drown out the overview', () => {
    for (const chunk of bundle.chunks.filter((c) =>
      c.sourceId.startsWith("generator:"),
    )) {
      expect(
        `${chunk.title} ${chunk.heading}`.toLowerCase(),
        chunk.id,
      ).not.toContain("generator");
    }
  });

  it("keeps the real production bundle, including embeddings, under Cloudflare's Worker limit", () => {
    const productionBundle = buildBundle({
      features: FEATURE_REGISTRY,
      articles: productionArticles,
      commit: "size-test",
      builtAt: "",
      channel: "production",
      embeddings: productionEmbeddings,
    });
    const embeddedChunks = productionBundle.chunks.filter(
      (chunk) => chunk.embedding,
    );

    // Cloudflare's current platform limit is 64 MiB uncompressed. Checking
    // the production knowledge data catches accidental omission of embeddings
    // while leaving room for the Worker code and its dependencies.
    expect(embeddedChunks.length).toBeGreaterThan(
      productionBundle.chunks.length / 2,
    );
    expect(Buffer.byteLength(JSON.stringify(productionBundle))).toBeLessThan(
      64 * 1024 * 1024,
    );
  });

  it("can be built from a different generator list (so the list is an input, not hard-wired)", () => {
    const custom = buildBundle({
      ...input,
      generators: [
        {
          id: "widget",
          label: "Widget",
          description: "Make a widget for the table.",
        },
      ],
    });
    expect(
      custom.chunks
        .filter((c) => c.sourceId.startsWith("generator:"))
        .map((c) => c.id),
    ).toEqual(["generator:widget#0"]);
  });
});

describe("parseHelpArticle", () => {
  it("reads id, title and body", () => {
    const parsed = parseHelpArticle(
      "---\nid: demo\ntitle: Demo Article\n---\n\n## Body\nText",
    );
    expect(parsed).toMatchObject({ id: "demo", title: "Demo Article" });
    expect(parsed?.content).toContain("Text");
  });

  it("skips hidden articles and files without front matter", () => {
    expect(
      parseHelpArticle("---\nid: x\ntitle: X\nhidden: true\n---\nBody"),
    ).toBeNull();
    expect(parseHelpArticle("No front matter")).toBeNull();
  });
});
