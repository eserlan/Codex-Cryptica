import { describe, it, expect } from "vitest";
import { load, entries } from "./+page";

describe("Generator Theme Hub Route", () => {
  describe("load", () => {
    it.each([
      "fantasy",
      "cyberpunk",
      "sci-fi",
      "post-apocalyptic",
      "modern",
      "vampire",
    ])("should load valid theme: %s", (theme) => {
      const res = load({ params: { theme } } as any) as any;
      expect(res.theme).toBe(theme);
    });

    it("should throw 404 for unknown theme", () => {
      expect(() => load({ params: { theme: "steampunk" } } as any)).toThrow();
    });

    it("should throw 404 for empty theme", () => {
      expect(() => load({ params: { theme: "" } } as any)).toThrow();
    });
  });

  describe("entries", () => {
    it("should return all 6 theme slugs", () => {
      const res = (entries as any)();
      expect(res).toEqual([
        { theme: "fantasy" },
        { theme: "cyberpunk" },
        { theme: "sci-fi" },
        { theme: "post-apocalyptic" },
        { theme: "modern" },
        { theme: "vampire" },
      ]);
    });
  });
});
