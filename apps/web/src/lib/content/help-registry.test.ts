import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FEATURE_REGISTRY,
  buildBundle,
  parseHelpArticle,
  retrieve,
  sanitizeHelpContext,
  validateRegistry,
} from "help-engine";

const helpDir = join(__dirname, "help");
const articles = readdirSync(helpDir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => parseHelpArticle(readFileSync(join(helpDir, file), "utf8")))
  .filter(
    (article): article is NonNullable<typeof article> => article !== null,
  );

describe("help registry against the real in-app help articles", () => {
  const helpIds = new Set(articles.map((article) => article.id));

  it("has no broken references to help articles, related features or actions", () => {
    expect(validateRegistry(FEATURE_REGISTRY, { helpIds })).toEqual([]);
  });

  it("includes the Session Hub article this spike added", () => {
    expect(helpIds.has("session-hub")).toBe(true);
  });

  it("would catch a removed article", () => {
    const withoutConnections = new Set(
      [...helpIds].filter((id) => id !== "connections-tab"),
    );
    expect(
      validateRegistry(FEATURE_REGISTRY, { helpIds: withoutConnections }).join(
        "\n",
      ),
    ).toContain('unknown help article "connections-tab"');
  });
});

describe("retrieval over the real help articles", () => {
  const bundle = buildBundle({
    features: FEATURE_REGISTRY,
    articles,
    commit: "test",
    builtAt: "test",
    channel: "production",
  });
  const settlementConnections = sanitizeHelpContext({
    routeTemplate: "/(app)",
    area: "entity-detail",
    entityKind: "location",
    tab: "connections",
    mode: "view",
    availableActions: ["status-tab", "connections-tab"],
  });
  const graphScreen = sanitizeHelpContext({
    routeTemplate: "/(app)",
    area: "graph",
    mode: "view",
  });

  it("finds connection help for the headline question on the Connections tab", () => {
    const result = retrieve(
      "How do I connect the faction I just created?",
      bundle,
      settlementConnections,
    );
    expect(result.noMatch).toBe(false);
    const sources = result.chunks.map((c) => c.chunk.sourceId);
    expect(
      sources.some(
        (s) => s === "registry:entity-connections" || s === "connections-tab",
      ),
    ).toBe(true);
  });

  it("does not treat a capability the product lacks as answerable", () => {
    for (const question of [
      "Can I stream to Twitch?",
      "What is the weather in Paris?",
      "How do I reset my Netflix password?",
    ]) {
      expect(
        retrieve(question, bundle, settlementConnections).noMatch,
        question,
      ).toBe(true);
    }
  });

  it("treats the Graph screen as a different place from the Connections tab", () => {
    expect(
      retrieve(
        "What is the graph for?",
        bundle,
        graphScreen,
      ).screenFeatures.map((f) => f.id),
    ).toEqual(["graph-view", "entity-reports", "guided-mode"]);
  });
});
