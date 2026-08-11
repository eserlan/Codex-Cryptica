import { describe, it, expect } from "vitest";
import { load, entries } from "./+page";
import { HUB_THEME_SLUGS } from "$lib/content/hub-themes";

describe("Generator Theme Hub Route", () => {
  describe("load", () => {
    it.each(HUB_THEME_SLUGS)("should load valid theme: %s", (theme) => {
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
    it("prerenders exactly the hubs declared in hub-themes, in order", () => {
      expect((entries as any)()).toEqual(
        HUB_THEME_SLUGS.map((theme) => ({ theme })),
      );
    });
  });
});
