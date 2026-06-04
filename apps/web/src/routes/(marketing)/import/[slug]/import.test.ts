import { describe, it, expect } from "vitest";
import { load, entries } from "./+page";

describe("Imports SvelteKit Route", () => {
  describe("load", () => {
    it("should successfully load valid importer pages", () => {
      const res = load({ params: { slug: "obsidian-vault" } } as any) as any;
      expect(res).toBeDefined();
      expect(res.importPage.slug).toBe("obsidian-vault");
    });

    it("should throw error for invalid importer slugs", () => {
      expect(() =>
        load({ params: { slug: "invalid-importer" } } as any),
      ).toThrow();
    });
  });

  describe("entries", () => {
    it("should return the list of valid importer slugs", () => {
      const res = (entries as any)();
      expect(res).toBeDefined();
      expect(res).toEqual([
        { slug: "obsidian-vault" },
        { slug: "world-anvil-export" },
        { slug: "kanka-json" },
        { slug: "legendkeeper-json" },
      ]);
    });
  });
});
