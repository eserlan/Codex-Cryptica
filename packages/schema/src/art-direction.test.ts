import { describe, expect, it } from "vitest";
import {
  CATEGORY_ART_DIRECTION_DEFAULTS,
  GLOBAL_ART_DIRECTION_DEFAULT,
  THEME_ART_DIRECTION_DEFAULTS,
  resolveArtDirection,
} from "./art-direction";

describe("art direction resolver", () => {
  it("uses entity art direction before all other fallbacks", () => {
    const result = resolveArtDirection({
      subject: "Almos",
      surface: "entity",
      categoryId: "character",
      themeId: "fantasy",
      entityArtDirection: "{subject}, ink portrait with silver mask",
      userAuthoredArtDirection: "{subject}, oil painting",
    });

    expect(result.source).toBe("entity-context");
    expect(result.prompt).toContain("Almos, ink portrait");
  });

  it("uses user-authored art direction before shipped defaults", () => {
    const result = resolveArtDirection({
      subject: "The Glass Tower",
      surface: "entity",
      categoryId: "location",
      themeId: "scifi",
      entityArtDirection: "   ",
      userAuthoredArtDirection: "{subject}, monochrome architectural plate",
    });

    expect(result.source).toBe("user-authored-context");
    expect(result.prompt).toBe(
      "The Glass Tower, monochrome architectural plate",
    );
  });

  it("falls back through category, theme, and global defaults", () => {
    expect(
      resolveArtDirection({
        subject: "Mara",
        surface: "entity",
        categoryId: "character",
        themeId: "fantasy",
      }).source,
    ).toBe("category-default");

    expect(
      resolveArtDirection({
        subject: "Mara",
        surface: "entity",
        themeId: "fantasy",
      }).source,
    ).toBe("theme-default");

    expect(
      resolveArtDirection({
        subject: "Mara",
        surface: "entity",
        themeId: "missing-theme",
      }).source,
    ).toBe("global-default");
  });

  it("composes category default, theme default, and global default prompts", () => {
    const result = resolveArtDirection({
      subject: "Mara",
      surface: "entity",
      categoryId: "character",
      themeId: "scifi",
    });

    expect(result.prompt).toContain("Mara, full character concept art");
    expect(result.prompt).toContain("Mara. Digital concept art style");
    expect(result.prompt).toContain(
      "Mara, illustrated worldbuilding reference",
    );
  });

  it("inserts the subject when the template has no placeholder", () => {
    const result = resolveArtDirection({
      subject: "The Ember Crown",
      surface: "entity",
      entityArtDirection: "Detailed prop render on a neutral background",
    });

    expect(result.prompt).toBe(
      "The Ember Crown. Detailed prop render on a neutral background",
    );
  });

  it("replaces repeated subject placeholders", () => {
    const result = resolveArtDirection({
      subject: "Aster",
      surface: "entity",
      entityArtDirection: "{subject} mirrored beside {subject}",
    });

    expect(result.prompt).toBe("Aster mirrored beside Aster");
  });

  it("uses cover composition for cover surface requests", () => {
    const result = resolveArtDirection({
      subject: "The Ninth Archive",
      surface: "cover",
      categoryId: "character",
      themeId: "fantasy",
    });

    expect(result.source).toBe("category-default");
    expect(result.templateId).toBe("category.cover");
    expect(result.categoryId).toBe("cover");
  });

  it("does not alias real category ids unless they are marked as hints", () => {
    const realCategory = resolveArtDirection({
      subject: "Archivist Nara",
      surface: "entity",
      categoryId: "npc",
      themeId: "fantasy",
    });
    const hintedCategory = resolveArtDirection({
      subject: "Archivist Nara",
      surface: "command",
      categoryId: "npc",
      categoryIdIsHint: true,
      themeId: "fantasy",
    });

    expect(realCategory.source).toBe("theme-default");
    expect(realCategory.categoryId).toBe("npc");
    expect(hintedCategory.source).toBe("category-default");
    expect(hintedCategory.categoryId).toBe("character");
  });

  it("normalizes and strips theme suffixes (light/dark)", () => {
    const resultScifiLight = resolveArtDirection({
      subject: "Mara",
      surface: "entity",
      themeId: "scifi_light",
    });
    const resultScifiDark = resolveArtDirection({
      subject: "Mara",
      surface: "entity",
      themeId: "scifi-dark",
    });
    const resultHorrorLight = resolveArtDirection({
      subject: "Mara",
      surface: "entity",
      themeId: "gothic_horror_light",
    });

    expect(resultScifiLight.themeId).toBe("scifi");
    expect(resultScifiLight.prompt).toContain("Digital concept art style");

    expect(resultScifiDark.themeId).toBe("scifi");
    expect(resultScifiDark.prompt).toContain("Digital concept art style");

    expect(resultHorrorLight.themeId).toBe("horror");
    expect(resultHorrorLight.prompt).toContain("Tenebrist oil painting");
  });

  it("ships required category and theme defaults without named artist imitation", () => {
    for (const id of [
      "character",
      "creature",
      "location",
      "item",
      "faction",
      "event",
      "note",
      "cover",
    ]) {
      expect(CATEGORY_ART_DIRECTION_DEFAULTS[id]?.template).toContain(
        "{subject}",
      );
    }

    for (const id of [
      "fantasy",
      "scifi",
      "cyberpunk",
      "modern",
      "post_apocalyptic",
      "post-apocalyptic",
      "apocalyptic",
      "gothic_horror",
      "gothic-horror",
      "horror",
      "steampunk",
      "mythic",
      "pulp_adventure",
      "pulp-adventure",
      "fallout",
      "starwars",
      "startrek",
    ]) {
      expect(THEME_ART_DIRECTION_DEFAULTS[id]?.template).toContain("{subject}");
    }

    const shippedText = [
      GLOBAL_ART_DIRECTION_DEFAULT.template,
      ...Object.values(CATEGORY_ART_DIRECTION_DEFAULTS).map((t) => t.template),
      ...Object.values(THEME_ART_DIRECTION_DEFAULTS).map((t) => t.template),
    ].join("\n");

    expect(shippedText).not.toMatch(
      /\b(in the style of|by artgerm|by greg rutkowski|by loish|by sakimichan|by beeple)\b/i,
    );
  });
});
