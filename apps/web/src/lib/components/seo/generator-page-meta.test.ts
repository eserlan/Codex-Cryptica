import { describe, expect, it } from "vitest";
import { slugMeta, type ValidSlug } from "./generator-page-meta";

const allExpectedSlugs: ValidSlug[] = [
  "npc",
  "settlement",
  "magic-item",
  "minor-magic-item",
  "artifact-generator",
  "faction",
  "quest",
  "rumour",
  "puzzle",
  "item",
  "tavern",
  "social-hub",
  "kingdom",
  "nation",
  "vampire-clan",
  "nomad-clan",
  "dark-fantasy-faction",
  "names",
  "fantasy-names",
  "dnd-npc",
  "pantheon-generator",
  "god-generator",
  "ship-generator",
  "language-generator",
  "news-sheet-generator",
  "dungeon-generator",
  "adventure-generator",
  "adventure-idea-generator",
  "plot-twist-generator",
  "bbeg-generator",
  "world",
  "council-vote",
  "secret-society",
  "star-system",
  "alien-race",
  "creature",
  "encounter",
  "heist",
];

describe("generator-page-meta completeness and social preview tags", () => {
  it("uses Puzzle's own rendered social screenshot", () => {
    expect(slugMeta.puzzle.ogImage).toBe(
      "https://assets.codexcryptica.com/screenshots/generator-puzzle.png",
    );
    expect(slugMeta.puzzle.ogImage).not.toContain("generator-quest");
  });

  it("has metadata entries for all 30 valid generator slugs", () => {
    const keys = Object.keys(slugMeta);
    expect(keys.length).toBe(allExpectedSlugs.length);
    for (const slug of allExpectedSlugs) {
      expect(slugMeta[slug], `Missing metadata for slug ${slug}`).toBeDefined();
    }
  });

  for (const slug of allExpectedSlugs) {
    describe(`slug: ${slug}`, () => {
      it("has non-empty title and description", () => {
        const meta = slugMeta[slug];
        expect(meta.pageTitle.trim().length).toBeGreaterThan(10);
        expect(meta.metaDescription.trim().length).toBeGreaterThan(20);
      });

      it("has a valid canonical path starting with /generators/", () => {
        const meta = slugMeta[slug];
        expect(meta.canonicalPath.startsWith("/generators/")).toBe(true);
      });

      it("has a dedicated ogImage and ogImageAlt", () => {
        const meta = slugMeta[slug];
        expect(meta.ogImage, `Expected ogImage for ${slug}`).toBeDefined();
        expect(meta.ogImage?.startsWith("https://")).toBe(true);
        expect(
          meta.ogImageAlt,
          `Expected ogImageAlt for ${slug}`,
        ).toBeDefined();
        expect(meta.ogImageAlt?.trim().length).toBeGreaterThan(10);
      });

      it("has valid keywords array", () => {
        const meta = slugMeta[slug];
        expect(Array.isArray(meta.keywords)).toBe(true);
        expect(meta.keywords!.length).toBeGreaterThan(0);
      });
    });
  }
});
