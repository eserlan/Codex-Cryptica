import { describe, it, expect, vi } from "vitest";
import { load, entries } from "./+page";

vi.mock("$lib/config/seo-pages", () => ({
  solutions: {
    "test-solution": {
      slug: "test-solution",
      title: "Test Solution",
      description: "Test Description",
      faq: [],
      keywords: [],
    },
  },
}));

describe("Solutions SvelteKit Route", () => {
  describe("load", () => {
    it("should successfully load valid solution pages", () => {
      const res = load({ params: { slug: "test-solution" } } as any) as any;
      expect(res).toBeDefined();
      expect(res.solution.title).toBe("Test Solution");
    });

    it("should throw error for invalid solutions", () => {
      expect(() => load({ params: { slug: "invalid-slug" } } as any)).toThrow();
    });
  });

  describe("entries", () => {
    it("should return the list of solution slugs", () => {
      const res = (entries as any)();
      expect(res).toBeDefined();
      expect(res).toEqual([{ slug: "test-solution" }]);
    });
  });
});
