import { describe, it, expect } from "vitest";
import { FEATURE_HINTS, HINT_KEYS } from "./help-content";
import { loadBlogArticles, loadHelpArticles } from "$lib/content/loader";

// T061: in-app generators feature hint is registered (US5)
describe("help-content feature hints", () => {
  it("includes the Lineage controls hint", () => {
    expect(FEATURE_HINTS["lineage-controls"]).toMatchObject({
      id: "lineage-controls",
      title: expect.any(String),
      content: expect.stringContaining("Drag to pan"),
    });
  });

  it("FEATURE_HINTS includes in-app-generators entry", () => {
    expect(FEATURE_HINTS["in-app-generators"]).toBeDefined();
    expect(FEATURE_HINTS["in-app-generators"].id).toBe("in-app-generators");
    expect(FEATURE_HINTS["in-app-generators"].title).toBeTruthy();
    expect(FEATURE_HINTS["in-app-generators"].content).toBeTruthy();
  });

  it("HINT_KEYS includes IN_APP_GENERATORS key", () => {
    expect(HINT_KEYS.IN_APP_GENERATORS).toBe("in-app-generators-hint-seen");
  });

  // T023 (143-cif-importer): CIF import help entry
  it("FEATURE_HINTS includes a cif-importer entry mentioning offline import and family links", () => {
    expect(FEATURE_HINTS["cif-importer"]).toBeDefined();
    expect(FEATURE_HINTS["cif-importer"].id).toBe("cif-importer");
    expect(FEATURE_HINTS["cif-importer"].title).toBeTruthy();
    expect(FEATURE_HINTS["cif-importer"].content).toContain("offline");
    expect(FEATURE_HINTS["cif-importer"].content).toContain("family");
  });

  it("FEATURE_HINTS includes a delve-structural-builder entry", () => {
    expect(FEATURE_HINTS["delve-structural-builder"]).toBeDefined();
    expect(FEATURE_HINTS["delve-structural-builder"].id).toBe(
      "delve-structural-builder",
    );
    expect(FEATURE_HINTS["delve-structural-builder"].title).toBeTruthy();
    expect(FEATURE_HINTS["delve-structural-builder"].content).toContain(
      "spatial canvas",
    );
  });

  // Constitution VII: the feature hint alone left /help silent on tables and
  // decks, and the nav entry now sits behind the menu on a phone — so the
  // article is the discovery path, not a nicety.
  it("documents roll tables and card decks as a full help article", () => {
    const article = loadHelpArticles().find(
      (a) => a.id === "random-tables-decks",
    );

    expect(article).toBeDefined();
    expect(article!.title).toBeTruthy();
    // The parts a hint has no room for.
    expect(article!.content).toContain("{creature}");
    expect(article!.content).toContain("/table");
    expect(article!.content).toContain("/deck");
    expect(article!.content).toMatch(/discard pile/i);
  });

  it("lists the deterministic roll commands alongside the AI ones", () => {
    const commands = loadHelpArticles().find((a) => a.id === "chat-commands");

    expect(commands!.content).toContain("`/table [name]`");
    expect(commands!.content).toContain("`/deck [name] [count]`");
  });

  it("all blog links in help articles correspond to valid blog post slugs", () => {
    const blogArticles = loadBlogArticles();
    const validSlugs = new Set(blogArticles.map((b) => b.slug));
    const helpArticles = loadHelpArticles();

    const blogLinkRegex = /\/blog\/([a-z0-9-]+)/g;

    for (const article of helpArticles) {
      const matches = [...article.content.matchAll(blogLinkRegex)];
      for (const match of matches) {
        const slug = match[1];
        expect(
          validSlugs.has(slug),
          `Help article '${article.id}' contains broken blog link '/blog/${slug}'`,
        ).toBe(true);
      }
    }
  });
});
