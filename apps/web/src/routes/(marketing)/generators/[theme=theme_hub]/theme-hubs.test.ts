import { describe, it, expect } from "vitest";
import { load, entries } from "./+page";
import { HUB_THEME_SLUGS } from "$lib/content/hub-themes";

describe("Generator Theme Hub Route", () => {
  describe("load", () => {
    it.each([
      "fantasy",
      "pirate",
      "cyberpunk",
      "sci-fi",
      "post-apocalyptic",
      "modern",
      "vampire",
      "cosmic-horror",
      "western",
      "steampunk",
      "lancer",
      "space-opera-resistance",
      "optimistic-exploration-sci-fi",
    ])("should load valid theme: %s", (theme) => {
      const res = load({ params: { theme } } as any) as any;
      expect(res.theme).toBe(theme);
    });

    it("should throw 404 for unknown theme", () => {
      expect(() =>
        load({ params: { theme: "unknown-theme" } } as any),
      ).toThrow();
    });

    it("should throw 404 for empty theme", () => {
      expect(() => load({ params: { theme: "" } } as any)).toThrow();
    });
  });

  describe("entries", () => {
    it("prerenders exactly the hubs declared in hub-themes", () => {
      const prerendered = (entries as any)().map((e: any) => e.theme);
      expect(prerendered.sort()).toEqual([...HUB_THEME_SLUGS].sort());
    });

    it("should return all theme slugs", () => {
      const res = (entries as any)();
      expect(res).toEqual([
        { theme: "fantasy" },
        { theme: "pirate" },
        { theme: "cyberpunk" },
        { theme: "sci-fi" },
        { theme: "post-apocalyptic" },
        { theme: "modern" },
        { theme: "vampire" },
        { theme: "cosmic-horror" },
        { theme: "western" },
        { theme: "steampunk" },
        { theme: "lancer" },
        { theme: "space-opera-resistance" },
        { theme: "optimistic-exploration-sci-fi" },
      ]);
    });
  });
});
