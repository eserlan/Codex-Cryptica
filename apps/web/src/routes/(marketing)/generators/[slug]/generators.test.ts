import { describe, it, expect } from "vitest";
import { load, entries } from "./+page";

describe("Generators SvelteKit Route", () => {
  describe("load", () => {
    it("should successfully load valid generator pages", () => {
      const res = load({ params: { slug: "npc" } } as any) as any;
      expect(res).toBeDefined();
      expect(res.slug).toBe("npc");
    });

    it("should throw error for invalid generator slugs", () => {
      expect(() =>
        load({ params: { slug: "invalid-generator" } } as any),
      ).toThrow();
    });
  });

  describe("entries", () => {
    it("should return the list of valid generator slugs", () => {
      const res = (entries as any)();
      expect(res).toBeDefined();
      expect(res).toEqual([
        { slug: "npc" },
        { slug: "settlement" },
        { slug: "magic-item" },
        { slug: "faction" },
      ]);
    });
  });
});
