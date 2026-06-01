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

    expect(result.prompt).toContain("Mara, full-body character concept art");
    expect(result.prompt).toContain("Mara. Digital concept art style");
    expect(result.prompt).toContain(
      "Mara, illustrated worldbuilding reference",
    );
  });

  it("keeps character defaults concrete without overriding themed or vault art styles", () => {
    const result = resolveArtDirection({
      subject: "Tymora",
      surface: "entity",
      categoryId: "character",
      themeId: "fantasy",
    });

    expect(result.prompt).toContain("clear face");
    expect(result.prompt).toContain("visible hands");
    expect(result.prompt).toContain("sharp focus on the full figure");
    expect(result.prompt).toContain("body language");
    expect(result.prompt).toContain("signature attire");
    expect(result.prompt).toContain(
      "hand-held props or environmental contact points",
    );
    expect(result.prompt).toContain("wearable technology or accessories");
    expect(result.prompt).toContain("surface finish");
    expect(result.prompt).toContain("weathering");
    expect(result.prompt).toContain("asymmetry");
    expect(result.prompt).toContain(
      "presentation lighting frames the character",
    );
    expect(result.prompt).toContain("Oil painting style");
    expect(result.prompt).toContain("warm earth palette");
    expect(result.prompt).toContain(
      "Tymora, illustrated worldbuilding reference",
    );
  });

  it("keeps cyberpunk characters material-specific and environment-aware", () => {
    const result = resolveArtDirection({
      subject: "Architect-Class Figure",
      surface: "entity",
      categoryId: "character",
      themeId: "cyberpunk",
    });

    expect(result.prompt).toContain("role, status, temperament");
    expect(result.prompt).toContain("wearable technology or accessories");
    expect(result.prompt).toContain("seams, fasteners, surface finish");
    expect(result.prompt).toContain("practical wear");
    expect(result.prompt).toContain("hand gesture");
    expect(result.prompt).toContain("surrounding environment");
    expect(result.prompt).toContain("urban surfaces and environmental texture");
    expect(result.prompt).toContain("high-contrast neon palette");
  });

  it("keeps item defaults tactile and specific without overriding themed art styles", () => {
    const result = resolveArtDirection({
      subject: "Synapse-Bridge",
      surface: "entity",
      categoryId: "item",
      themeId: "cyberpunk",
    });

    expect(result.prompt).toContain("close-up detailed prop concept art");
    expect(result.prompt).toContain("clear scale cues");
    expect(result.prompt).toContain("functional seams");
    expect(result.prompt).toContain("contact points");
    expect(result.prompt).toContain("worn surfaces");
    expect(result.prompt).toContain(
      "physical consequences of repeated handling",
    );
    expect(result.prompt).toContain("urban surfaces and environmental texture");
    expect(result.prompt).toContain(
      "Synapse-Bridge, illustrated worldbuilding reference",
    );
  });

  it("keeps faction defaults identity-focused without overriding themed art styles", () => {
    const result = resolveArtDirection({
      subject: "Arasaka Security Detachment",
      surface: "entity",
      categoryId: "faction",
      themeId: "cyberpunk",
    });

    expect(result.prompt).toContain("wide-angle eye-level faction concept art");
    expect(result.prompt).toContain("cohesive group composition");
    expect(result.prompt).toContain("clear visual anchor");
    expect(result.prompt).toContain("clear hierarchy");
    expect(result.prompt).toContain("readable insignia or subtle heraldry");
    expect(result.prompt).toContain("controlled patrol halt");
    expect(result.prompt).toContain("mirrored functional arrangement");
    expect(result.prompt).toContain("distinct uniform language");
    expect(result.prompt).toContain("restricted faction palette");
    expect(result.prompt).toContain("role-specific equipment");
    expect(result.prompt).toContain("specialist visual cues");
    expect(result.prompt).toContain("equipment readiness");
    expect(result.prompt).toContain("faces or masks where appropriate");
    expect(result.prompt).toContain("authority, ideology, resources");
    expect(result.prompt).toContain(
      "background landscape or ambient color that stays secondary",
    );
    expect(result.prompt).toContain("recognizable faction identity");
    expect(result.prompt).toContain("tactile material contrast");
    expect(result.prompt).toContain("cohesive silhouette");
    expect(result.prompt).toContain("controlled palette hierarchy");
    expect(result.prompt).toContain(
      "readable faction marks on practical gear or regalia",
    );
    expect(result.prompt).toContain("natural or crafted material weight");
    expect(result.prompt).toContain("rhythmic group spacing");
    expect(result.prompt).toContain("neon clutter");
    expect(result.prompt).toContain("modern gear unless setting-appropriate");
    expect(result.prompt).toContain("ornate generic armor");
    expect(result.prompt).toContain("Cyberpunk digital concept art style");
    expect(result.prompt).toContain("urban surfaces and environmental texture");
    expect(result.prompt).toContain(
      "Arasaka Security Detachment, illustrated worldbuilding reference",
    );
  });

  it("keeps fantasy faction defaults grounded and material-focused", () => {
    const result = resolveArtDirection({
      subject: "Stormber Patrol Unit",
      surface: "entity",
      categoryId: "faction",
      themeId: "fantasy",
    });

    expect(result.prompt).toContain("subtle heraldry");
    expect(result.prompt).toContain("clear visual anchor");
    expect(result.prompt).toContain("mirrored functional arrangement");
    expect(result.prompt).toContain("restricted faction palette");
    expect(result.prompt).toContain("repeated motifs");
    expect(result.prompt).toContain("background landscape");
    expect(result.prompt).toContain("natural or crafted material weight");
    expect(result.prompt).toContain("rhythmic group spacing");
    expect(result.prompt).toContain(
      "readable faction marks on practical gear or regalia",
    );
    expect(result.prompt).toContain("ornate generic armor");
    expect(result.prompt).toContain("modern gear unless setting-appropriate");
    expect(result.prompt).toContain("Oil painting style");
    expect(result.prompt).toContain("handcrafted materials");
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

  it("resolves each canonical theme id and alias correctly and includes expected text", () => {
    const testCases: Array<{ themeId: string; expectedSubstring: string }> = [
      { themeId: "fantasy", expectedSubstring: "Oil painting style" },
      { themeId: "scifi", expectedSubstring: "Digital concept art style" },
      {
        themeId: "cyberpunk",
        expectedSubstring: "Cyberpunk digital concept art style",
      },
      { themeId: "modern", expectedSubstring: "Photographic" },
      {
        themeId: "apocalyptic",
        expectedSubstring: "Desaturated digital illustration",
      },
      {
        themeId: "post-apocalyptic",
        expectedSubstring: "Desaturated digital illustration",
      },
      {
        themeId: "post_apocalyptic",
        expectedSubstring: "Desaturated digital illustration",
      },
      { themeId: "horror", expectedSubstring: "Tenebrist oil painting" },
      { themeId: "gothic-horror", expectedSubstring: "Tenebrist oil painting" },
      { themeId: "gothic_horror", expectedSubstring: "Tenebrist oil painting" },
      { themeId: "steampunk", expectedSubstring: "Gouache painting style" },
      { themeId: "mythic", expectedSubstring: "Tempera illustration style" },
      { themeId: "pulp_adventure", expectedSubstring: "Screen print style" },
      { themeId: "pulp-adventure", expectedSubstring: "Screen print style" },
      { themeId: "fallout", expectedSubstring: "Americana illustration style" },
      { themeId: "starwars", expectedSubstring: "McQuarrie-era" },
      { themeId: "startrek", expectedSubstring: "Clean 1990s sci-fi" },
      // suffix variants
      {
        themeId: "scifi_light",
        expectedSubstring: "Digital concept art style",
      },
      { themeId: "fantasy-dark", expectedSubstring: "Oil painting style" },
    ];

    for (const { themeId, expectedSubstring } of testCases) {
      const result = resolveArtDirection({
        subject: "TestSubject",
        surface: "entity",
        themeId,
      });

      expect(result.themeId).toBeDefined();
      expect(result.prompt).toContain(expectedSubstring);
    }
  });
});
