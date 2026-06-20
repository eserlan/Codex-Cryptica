import { describe, it, expect } from "vitest";
import { load, entries } from "./+page";

describe("Themed Generator Route", () => {
  describe("load", () => {
    it("loads a valid theme + slug combination", () => {
      const res = load({
        params: { theme: "lancer", slug: "npc" },
      } as any) as any;
      expect(res.theme).toBe("lancer");
      expect(res.slug).toBe("npc");
    });

    it("throws 404 for an unknown theme", () => {
      expect(() =>
        load({ params: { theme: "unknown-theme", slug: "npc" } } as any),
      ).toThrow();
    });

    it("throws 404 for an unknown slug", () => {
      expect(() =>
        load({
          params: { theme: "fantasy", slug: "unknown-generator" },
        } as any),
      ).toThrow();
    });
  });

  describe("entries", () => {
    it("returns a cross-product of all themes and slugs", () => {
      const res = (entries as any)();
      // 10 themes × 16 slugs = 160 entries
      expect(res).toHaveLength(10 * 16);
    });

    it("includes lancer + npc", () => {
      const res = (entries as any)();
      expect(res).toContainEqual({ theme: "lancer", slug: "npc" });
    });

    it("includes fantasy + settlement", () => {
      const res = (entries as any)();
      expect(res).toContainEqual({ theme: "fantasy", slug: "settlement" });
    });
  });
});
