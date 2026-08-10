import { describe, it, expect } from "vitest";
import {
  getLandingPage,
  getAllLandingPages,
  getAllLandingPageSlugs,
} from "./registry";
import type { LandingPageConfig } from "./schema";

describe("Landing Page Registry", () => {
  const mockRegistry: Record<string, LandingPageConfig> = {
    "test-system": {
      slug: "test-system",
      kind: "system",
      seo: { title: "SEO Title", description: "SEO Desc" },
      hero: { title: "Hero", tagline: "Tag", problemStatement: "Prob" },
      useCases: [],
      recommendedTools: [],
      cta: { title: "CTA", buttonText: "Go", buttonHref: "/go" },
      disclaimer: "Not affiliated.",
    },
    "test-genre": {
      slug: "test-genre",
      kind: "genre",
      seo: { title: "SEO Title", description: "SEO Desc" },
      hero: { title: "Hero 2", tagline: "Tag 2", problemStatement: "Prob 2" },
      useCases: [],
      recommendedTools: [],
      cta: { title: "CTA 2", buttonText: "Go 2", buttonHref: "/go-2" },
    },
  };

  describe("getLandingPage", () => {
    it("returns the page config if it exists", () => {
      const page = getLandingPage("test-system", mockRegistry);
      expect(page).toBeDefined();
      expect(page?.slug).toBe("test-system");
    });

    it("returns undefined if the page config does not exist", () => {
      const page = getLandingPage("unknown-slug", mockRegistry);
      expect(page).toBeUndefined();
    });
  });

  describe("getAllLandingPages", () => {
    it("returns an array of all page configs", () => {
      const pages = getAllLandingPages(mockRegistry);
      expect(pages).toHaveLength(2);
      expect(pages[0].slug).toBe("test-system");
      expect(pages[1].slug).toBe("test-genre");
    });

    it("returns an empty array if registry is empty", () => {
      const pages = getAllLandingPages({});
      expect(pages).toHaveLength(0);
    });
  });

  describe("getAllLandingPageSlugs", () => {
    it("returns an array of slugs", () => {
      const slugs = getAllLandingPageSlugs(mockRegistry);
      expect(slugs).toHaveLength(2);
      expect(slugs).toContain("test-system");
      expect(slugs).toContain("test-genre");
    });
  });

  describe("Vampire: The Masquerade Pack", () => {
    it("is registered and has a disclaimer", () => {
      const vtm = getLandingPage("vampire-the-masquerade");
      expect(vtm).toBeDefined();
      expect(vtm?.slug).toBe("vampire-the-masquerade");
      expect(vtm?.disclaimer).toContain("Paradox Interactive");
    });
  });

  describe("Fantasy Worldbuilding Pack", () => {
    it("is registered and omits a disclaimer", () => {
      const fantasy = getLandingPage("fantasy-worldbuilding");
      expect(fantasy).toBeDefined();
      expect(fantasy?.slug).toBe("fantasy-worldbuilding");
      expect(fantasy?.disclaimer).toBeUndefined();
    });
  });

  describe("Extensibility (US3)", () => {
    it("allows dynamic page addition and handles optional section collapsing", () => {
      const customConfig: LandingPageConfig = {
        slug: "custom-system",
        kind: "system",
        seo: { title: "Custom", description: "Custom" },
        hero: {
          title: "Custom Hero",
          tagline: "Tag",
          problemStatement: "Prob",
        },
        useCases: [],
        recommendedTools: [],
        cta: { title: "Start", buttonText: "Go", buttonHref: "/go" },
      };

      const customRegistry = { "custom-system": customConfig };

      const page = getLandingPage("custom-system", customRegistry);
      expect(page).toBeDefined();
      expect(page?.slug).toBe("custom-system");
      expect(page?.exampleGraph).toBeUndefined();
      expect(page?.disclaimer).toBeUndefined();
    });
  });
});
