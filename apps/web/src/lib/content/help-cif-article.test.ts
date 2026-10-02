import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FEATURE_REGISTRY,
  buildBundle,
  parseHelpArticle,
  retrieve,
  sanitizeHelpContext,
} from "help-engine";

const helpDir = join(__dirname, "help");
const articles = readdirSync(helpDir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => parseHelpArticle(readFileSync(join(helpDir, file), "utf8")))
  .filter(
    (article): article is NonNullable<typeof article> => article !== null,
  );

describe("Cif's own help article", () => {
  const bundle = buildBundle({
    features: FEATURE_REGISTRY,
    articles,
    commit: "test",
    builtAt: "test",
    channel: "production",
  });
  const context = sanitizeHelpContext({
    routeTemplate: "/(app)",
    area: "entity-detail",
    entityKind: "location",
    tab: "connections",
    mode: "view",
    availableActions: ["status-tab", "connections-tab"],
  });

  it("is published, so /help/help-assistant exists and Cif can cite it", () => {
    expect(articles.map((article) => article.id)).toContain("help-assistant");
  });

  it("answers questions about Cif from its own article, not the CIF importer", () => {
    for (const question of ["What is Cif?", "How do I turn off the AI help?"]) {
      const sources = retrieve(question, bundle, context).chunks.map(
        (c) => c.chunk.sourceId,
      );
      expect(sources).toContain("help-assistant");
    }
  });

  it("does not take over connection questions (negative)", () => {
    const sources = retrieve(
      "How do I connect two entities?",
      bundle,
      context,
    ).chunks.map((c) => c.chunk.sourceId);
    expect(sources.slice(0, 2)).toEqual([
      "connections-tab",
      "registry:entity-connections",
    ]);
  });
});
