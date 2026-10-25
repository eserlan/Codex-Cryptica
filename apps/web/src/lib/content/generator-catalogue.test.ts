import { describe, expect, it } from "vitest";
import { GENERATOR_SLUGS } from "../../params/generator_slug";
import { slugMeta } from "$lib/components/seo/generator-page-meta";
import {
  GENERATOR_CATALOGUE,
  GENERATOR_CATEGORIES,
  groupGeneratorCatalogue,
  withCategoryRelatedLinks,
} from "./generator-catalogue";

// Served slugs whose page is canonical to itself. Aliases (a slug whose
// canonical points at another generator) and the random picker are excluded.
const selfCanonicalSlugs = GENERATOR_SLUGS.filter(
  (slug) =>
    slug !== "random" &&
    slugMeta[slug as keyof typeof slugMeta].canonicalPath ===
      `/generators/${slug}`,
);

describe("generator catalogue", () => {
  it("lists every self-canonical generator exactly once", () => {
    const catalogued = GENERATOR_CATALOGUE.map((entry) => entry.slug);

    expect(new Set(catalogued).size).toBe(catalogued.length);
    expect([...catalogued].sort()).toEqual([...selfCanonicalSlugs].sort());
  });

  it("leaves out alias slugs that canonicalise elsewhere", () => {
    const catalogued = new Set<string>(
      GENERATOR_CATALOGUE.map((entry) => entry.slug),
    );

    expect(catalogued.has("adventure-idea-generator")).toBe(false);
    expect(catalogued.has("random")).toBe(false);
  });

  it("keeps every category populated and scannable", () => {
    const groups = groupGeneratorCatalogue();

    expect(groups.map((group) => group.id)).toEqual(
      GENERATOR_CATEGORIES.map((category) => category.id),
    );
    for (const group of groups) {
      expect(group.items.length).toBeGreaterThanOrEqual(2);
      expect(group.items.length).toBeLessThanOrEqual(10);
    }
  });
});

describe("withCategoryRelatedLinks", () => {
  it("keeps hand-picked links first and fills with same-category siblings", () => {
    const explicit = [{ href: "/solutions/ai-gm-assistant", label: "AI GM" }];

    const links = withCategoryRelatedLinks("tavern", explicit);

    expect(links[0]).toEqual(explicit[0]);
    expect(links.map((link) => link.href)).toContain("/generators/settlement");
    expect(links).toHaveLength(5);
  });

  it("never links a page to itself or repeats a link", () => {
    const links = withCategoryRelatedLinks("tavern", [
      { href: "/generators/tavern", label: "Self" },
      { href: "/generators/settlement", label: "Settlement" },
    ]);
    const hrefs = links.map((link) => link.href);

    expect(hrefs).not.toContain("/generators/tavern");
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("returns only the hand-picked links for a slug outside the catalogue", () => {
    const explicit = [{ href: "/generators/adventure-generator", label: "A" }];

    expect(
      withCategoryRelatedLinks("adventure-idea-generator", explicit),
    ).toEqual(explicit);
  });

  it("gives every catalogued generator page somewhere to go next", () => {
    for (const entry of GENERATOR_CATALOGUE) {
      const links = withCategoryRelatedLinks(
        entry.slug,
        slugMeta[entry.slug].relatedLinks ?? [],
      );
      expect(links.length, entry.slug).toBeGreaterThanOrEqual(2);
    }
  });
});
