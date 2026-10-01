import { describe, expect, it } from "vitest";
import {
  MAX_CHUNK_TOKENS,
  buildBundle,
  chunkMarkdown,
  estimateTokens,
  parseHelpArticle,
} from "../src/bundle";
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

const ids = [
  "connections-tab",
  "connection-labels",
  "graph-basics",
  "session-hub",
  "in-app-generators",
  "generate-related",
  "random-tables-decks",
];
const articles = ids.map((id) =>
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

  it("stays small: the whole bundle is well under the Worker's limit", () => {
    expect(JSON.stringify(bundle).length).toBeLessThan(600_000);
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
