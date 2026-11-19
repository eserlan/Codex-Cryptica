import { describe, expect, it } from "vitest";
import { FEATURE_HELP_ARTICLES } from "./help-feature-links";
import { loadHelpArticles } from "#lib/content/loader.js";
import * as publicHelp from "./help-content";

describe("feature help links", () => {
  it("preserves the public article link registry", () => {
    expect(publicHelp.FEATURE_HELP_ARTICLES).toBe(FEATURE_HELP_ARTICLES);
    expect(FEATURE_HELP_ARTICLES.SHARING_ENTITY_TEMPLATES).toBe(
      "sharing-templates",
    );
  });

  it("does not point feature entry points at missing articles", () => {
    const ids = loadHelpArticles().map((article) => article.id);
    for (const id of Object.values(FEATURE_HELP_ARTICLES)) {
      expect(ids, `Missing linked help article: ${id}`).toContain(id);
    }
  });
});
