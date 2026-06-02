import { describe, it, expect, vi } from "vitest";
import { load, entries } from "./+page";

vi.mock("$lib/config/seo-pages", () => ({
  comparisons: {
    "test-comp": {
      slug: "test-comp",
      title: "Test Comparison",
      description: "Test Description",
      faq: [],
      keywords: [],
    },
  },
}));

describe("Comparisons SvelteKit Route", () => {
  describe("load", () => {
    it("should successfully load valid comparison pages", () => {
      const res = load({ params: { slug: "test-comp" } } as any) as any;
      expect(res).toBeDefined();
      expect(res.comparison.title).toBe("Test Comparison");
    });

    it("should throw error for invalid comparisons", () => {
      expect(() => load({ params: { slug: "invalid-slug" } } as any)).toThrow();
    });
  });

  describe("entries", () => {
    it("should return the list of comparison slugs", () => {
      const res = (entries as any)();
      expect(res).toBeDefined();
      expect(res).toEqual([{ slug: "test-comp" }]);
    });
  });
});
