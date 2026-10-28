import { describe, expect, it } from "vitest";
import { HUB_THEME_SLUGS } from "#lib/content/hub-themes.js";
import { themeConfig } from "./theme-config";

describe("hub theme configuration", () => {
  it("configures every public hub exactly once", () => {
    expect(Object.keys(themeConfig).sort()).toEqual(
      [...HUB_THEME_SLUGS].sort(),
    );
  });

  it.each(HUB_THEME_SLUGS)(
    "has a complete ordered catalogue for %s",
    (theme) => {
      const config = themeConfig[theme];
      expect(config.metaTitle).toContain(config.label);
      expect(config.metaDescription).toContain("No login required.");
      expect(config.intro.length).toBeGreaterThan(0);
      expect(config.eyebrow.length).toBeGreaterThan(0);
      expect(config.cards.at(-1)?.slug).toBe("random");
      expect(new Set(config.cards.map((card) => card.slug)).size).toBe(
        config.cards.length,
      );
    },
  );

  it("preserves storage identifiers that differ from public slugs", () => {
    expect(themeConfig["sci-fi"].localStorageId).toBe("scifi");
    expect(themeConfig.vampire.localStorageId).toBe("horror");
    expect(themeConfig["cosmic-horror"].localStorageId).toBe("cosmic_horror");
    expect(themeConfig["optimistic-exploration-sci-fi"].localStorageId).toBe(
      "startrek",
    );
  });

  it("excludes genre-specific cards from unrelated hubs", () => {
    expect(
      themeConfig.superhero.cards.slice(0, 3).map((card) => card.slug),
    ).toEqual([
      "origin-generator",
      "villain-scheme-generator",
      "comic-book-event-generator",
    ]);
    expect(
      themeConfig["cosmic-horror"].cards.some(
        (card) => card.slug === "vampire-clan",
      ),
    ).toBe(false);
    expect(
      themeConfig.pirate.cards.find((card) => card.slug === "ship-generator")
        ?.label,
    ).toBe("Pirate Ship Generator");
  });
});
