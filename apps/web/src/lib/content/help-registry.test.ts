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

  it("includes the Tales of the Valiant campaign guide article", () => {
    expect(helpIds.has("tales-of-the-valiant")).toBe(true);
    const tovArticle = articles.find((a) => a.id === "tales-of-the-valiant");
    expect(tovArticle).toBeDefined();
    expect(tovArticle?.title).toBe(
      "Tales of the Valiant (BFRD) Campaign Guide",
    );
    expect(tovArticle?.content).toContain("Luck");
    expect(tovArticle?.content).toContain("Doom");
  });

  it("states the current ToV profile, import, and Luck reset limitations", () => {
    const tovArticle = articles.find((a) => a.id === "tales-of-the-valiant");
    expect(tovArticle?.content).toContain(
      "Vault-wide system profile selection is not currently available",
    );
    expect(tovArticle?.content).toContain(
      "does not currently import ToV character JSON",
    );
    expect(tovArticle?.content).toContain(
      "BFRD Luck rules do not prescribe a Long Rest reset",
    );
    expect(tovArticle?.content).not.toContain("RPG System Profile");
    expect(tovArticle?.content).not.toContain(
      "automatically detects the Black Flag schema",
    );

    const tovGeneratorArticle = articles.find(
      (a) => a.id === "tales-of-the-valiant-generators",
    );
    expect(tovGeneratorArticle).toBeDefined();
    expect(tovGeneratorArticle?.content).toContain(
      "Vault-wide system profile selection is not currently available",
    );
    expect(tovGeneratorArticle?.content).not.toContain(
      "Vault Profile Inheritance",
    );
    expect(tovGeneratorArticle?.content).not.toContain(
      "generators automatically pre-select",
    );
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
      "Can I export my vault to Roll20?",
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
    ).toEqual(["graph-view", "entity-reports", "guided-mode", "guided-setup"]);
  });
});

describe("Hex Crawl mode help article (T085, FR-044)", () => {
  const hexArticle = articles.find((a) => a.id === "hex-crawl-mode");

  /** FR-044 topics, each with the wording the article must contain. */
  const REQUIRED_TOPICS: Record<string, RegExp> = {
    "turning Hex Crawl mode on": /Turning on Hex Crawl mode/,
    "the hex panel": /The hex panel/,
    "the three states": /Unknown[\s\S]*Seen[\s\S]*Explored/,
    "attaching and creating entities": /Attach entity[\s\S]*Create entity here/,
    Explore: /\*\*Explore\*\*/,
    "what is sent to the AI service":
      /sends this hex's terrain, notes and nearby lore to the AI service/,
    "the offline fallback": /terrain tables/,
    "players never see hex notes":
      /Players and guests never see hex notes, terrain, drafts or explored markers\./,
  };

  function missingTopics(content: string): string[] {
    return Object.entries(REQUIRED_TOPICS)
      .filter(([, pattern]) => !pattern.test(content))
      .map(([topic]) => topic);
  }

  it("is registered as an article with a title and body", () => {
    expect(hexArticle).toBeDefined();
    expect(hexArticle?.title).toBe("Hex Crawl Mode");
    expect(hexArticle?.content).toContain("Hex Crawl mode");
  });

  it("covers every required topic", () => {
    expect(missingTopics(hexArticle?.content ?? "")).toEqual([]);
  });

  it("reports every topic as missing when the content is empty (negative case)", () => {
    expect(missingTopics("")).toHaveLength(Object.keys(REQUIRED_TOPICS).length);
  });

  it("uses the same AI disclosure wording as the other AI help articles", () => {
    const generate = articles.find((a) => a.id === "generate-related");
    const generators = articles.find((a) => a.id === "in-app-generators");
    expect(generate?.content).toMatch(/sent to the AI service/);
    expect(generators?.content).toMatch(/full vault is never sent/i);
    expect(hexArticle?.content).toMatch(/your full vault is never sent/i);
    expect(hexArticle?.content).toMatch(/AI Disabled/);
  });

  it("is linked from the hexcrawl-maps article", () => {
    const hexcrawl = articles.find((a) => a.id === "hexcrawl-maps");
    expect(hexcrawl?.content).toContain("/help#help/hex-crawl-mode");
  });

  it("is found by a search for 'hex crawl'", () => {
    const bundle = buildBundle({
      features: FEATURE_REGISTRY,
      articles,
      commit: "test",
      builtAt: "test",
      channel: "production",
    });
    const context = sanitizeHelpContext({
      routeTemplate: "/(app)",
      area: "graph",
      mode: "view",
    });
    const result = retrieve("hex crawl", bundle, context);
    expect(result.noMatch).toBe(false);
    expect(result.chunks.map((c) => c.chunk.sourceId)).toContain(
      "hex-crawl-mode",
    );
  });
});
