import { describe, it, expect } from "vitest";
import {
  MIN_GRAPHIC_CONTRAST,
  contrastRatio,
  deriveEntityTypePalette,
  deriveEntityTypeTone,
  parseColor,
  rgbToHsl,
  type EntityTypeTone,
} from "./entity-palette";
import { DEFAULT_CATEGORIES, type Category } from "./entity";
import {
  APOCALYPTIC_LIGHT,
  COSMIC_HORROR_LIGHT,
  CYBERPUNK_LIGHT,
  FALLOUT_LIGHT,
  FANTASY_DARK,
  HORROR_LIGHT,
  LANCER_LIGHT,
  MODERN_DARK,
  PIRATE_DARK,
  SCIFI_LIGHT,
  SPACE_OPERA_RESISTANCE_DARK,
  SPACE_WESTERN_LIGHT,
  STARTREK_LIGHT,
  STARWARS_LIGHT,
  STEAMPUNK_DARK,
  THEMES,
  WESTERN_DARK,
  WORKSPACE_DARK,
} from "./theme-templates";
import type { StylingTemplate } from "./theme";

const ALL_THEMES: StylingTemplate[] = [
  ...(Object.values(THEMES) as unknown as StylingTemplate[]),
  WORKSPACE_DARK,
  FANTASY_DARK,
  PIRATE_DARK,
  MODERN_DARK,
  SCIFI_LIGHT,
  CYBERPUNK_LIGHT,
  APOCALYPTIC_LIGHT,
  HORROR_LIGHT,
  COSMIC_HORROR_LIGHT,
  FALLOUT_LIGHT,
  STARWARS_LIGHT,
  STARTREK_LIGHT,
  LANCER_LIGHT,
  WESTERN_DARK,
  STEAMPUNK_DARK,
  SPACE_OPERA_RESISTANCE_DARK,
  SPACE_WESTERN_LIGHT,
];

const hsl = (color: string) => rgbToHsl(parseColor(color)!);
const contrast = (a: string, b: string) =>
  contrastRatio(parseColor(a)!, parseColor(b)!);

/** Shortest distance between two hues, in degrees. */
const hueDistance = (a: number, b: number) => {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
};

/**
 * Two tones are separable if any one channel of the shared tonal band moves
 * far enough to be read at a glance. Lightness is deliberately theme-anchored,
 * so most types separate on hue, and the near-hue pairs (a blue character next
 * to a slate note) separate on saturation instead.
 */
const isDistinguishable = (a: EntityTypeTone, b: EntityTypeTone) => {
  const first = hsl(a.fill);
  const second = hsl(b.fill);
  return (
    hueDistance(first.h, second.h) > 12 ||
    Math.abs(first.s - second.s) > 0.1 ||
    Math.abs(first.l - second.l) > 0.05
  );
};

describe("deriveEntityTypeTone", () => {
  it("mutes a neon seed instead of painting it (issue #2680)", () => {
    // The reported regression case: a fluorescent green location on the dark
    // parchment theme.
    const tone = deriveEntityTypeTone("#4ade80", FANTASY_DARK.tokens);

    expect(tone.fill.toLowerCase()).not.toBe("#4ade80");
    expect(hsl(tone.fill).s).toBeLessThan(hsl("#4ade80").s);
    // Moss, not neon: the fill sits in the theme's own dark tonal band.
    expect(hsl(tone.fill).l).toBeLessThan(0.4);
  });

  it("anchors every type to the same tonal band as the theme's surface", () => {
    const character = deriveEntityTypeTone("#60a5fa", FANTASY_DARK.tokens);
    const faction = deriveEntityTypeTone("#fb923c", FANTASY_DARK.tokens);
    const location = deriveEntityTypeTone("#4ade80", FANTASY_DARK.tokens);

    const lightnesses = [character, faction, location].map(
      (tone) => hsl(tone.fill).l,
    );
    const spread = Math.max(...lightnesses) - Math.min(...lightnesses);

    // The mixed-graph regression case from the issue: one coherent palette,
    // not three unrelated RGB colours.
    expect(spread).toBeLessThanOrEqual(0.12);
  });

  it("keeps the seed hue so types stay recognisable after harmonising", () => {
    const tone = deriveEntityTypeTone("#60a5fa", FANTASY_DARK.tokens);
    // Pulled towards the theme's brass primary, but still blue.
    expect(hueDistance(hsl(tone.fill).h, hsl("#60a5fa").h)).toBeLessThanOrEqual(
      20,
    );
  });

  it("is deterministic for the same seed and theme", () => {
    expect(deriveEntityTypeTone("#fb923c", PIRATE_DARK.tokens)).toEqual(
      deriveEntityTypeTone("#fb923c", PIRATE_DARK.tokens),
    );
  });

  it("falls back to the seed colour when it cannot be parsed", () => {
    const tone = deriveEntityTypeTone(
      "color-mix(in srgb, red, blue)",
      FANTASY_DARK.tokens,
    );

    expect(tone.fill).toBe("color-mix(in srgb, red, blue)");
    expect(tone.border).toBe("color-mix(in srgb, red, blue)");
    expect(tone.glyph).toBe(FANTASY_DARK.tokens.primary);
  });

  it("falls back when the theme background cannot be parsed", () => {
    const tone = deriveEntityTypeTone("#4ade80", {
      ...FANTASY_DARK.tokens,
      background: "var(--whatever)",
      surface: "var(--whatever)",
    });

    expect(tone.fill).toBe("#4ade80");
  });

  it("leaves hues alone when the theme itself is neutral", () => {
    const tone = deriveEntityTypeTone("#4ade80", {
      ...WORKSPACE_DARK.tokens,
      primary: "#d6d3d1",
      accent: "#a8a29e",
    });

    // Only the surface mix moves it, and only by a degree or two.
    expect(hueDistance(hsl(tone.fill).h, hsl("#4ade80").h)).toBeLessThan(3);
  });
});

describe("parseColor", () => {
  it("reads 3- and 6-digit hex", () => {
    expect(parseColor("#4ade80")).toEqual({ r: 74, g: 222, b: 128 });
    expect(parseColor("#ABC")).toEqual({ r: 170, g: 187, b: 204 });
  });

  it("reads rgb()/rgba() channels, ignoring alpha", () => {
    expect(parseColor("rgb(74, 222, 128)")).toEqual({ r: 74, g: 222, b: 128 });
    expect(parseColor("rgba(74, 222, 128, 0.32)")).toEqual({
      r: 74,
      g: 222,
      b: 128,
    });
  });

  it("scales percentage channels instead of reading them as 0-255", () => {
    expect(parseColor("rgb(100%, 0%, 0%)")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor("rgb(50% 50% 50% / 40%)")).toEqual({
      r: 127.5,
      g: 127.5,
      b: 127.5,
    });
  });

  it("returns null for anything it cannot read", () => {
    expect(parseColor("color-mix(in srgb, red, blue)")).toBeNull();
    expect(parseColor("rebeccapurple")).toBeNull();
    expect(parseColor("rgb(1, 2)")).toBeNull();
    expect(parseColor("#12345")).toBeNull();
    expect(parseColor(undefined)).toBeNull();
  });
});

describe("deriveEntityTypePalette", () => {
  it("keys tones by category id, including user-added categories", () => {
    const custom: Category = {
      id: "starship",
      label: "Starship",
      color: "#22d3ee",
      icon: "lucide:rocket",
    };
    const palette = deriveEntityTypePalette(SCIFI_LIGHT, [
      ...DEFAULT_CATEGORIES,
      custom,
    ]);

    expect(Object.keys(palette)).toContain("starship");
    expect(palette.starship.fill).not.toBe(custom.color);
  });

  it("returns an empty palette when no theme is active", () => {
    expect(deriveEntityTypePalette(undefined, DEFAULT_CATEGORIES)).toEqual({});
    expect(deriveEntityTypePalette(null, DEFAULT_CATEGORIES)).toEqual({});
  });

  describe.each(ALL_THEMES.map((theme) => [theme.id, theme] as const))(
    "%s",
    (_id, theme) => {
      const palette = deriveEntityTypePalette(theme, DEFAULT_CATEGORIES);

      it.each(DEFAULT_CATEGORIES.map((c) => [c.id] as const))(
        "%s keeps icon, ring and chip contrast",
        (categoryId) => {
          const tone = palette[categoryId];

          // Icons sit on the node body; rings sit on the canvas; chips sit on
          // a panel. All three are graphics, so all three owe 3:1.
          expect(contrast(tone.glyph, tone.fill)).toBeGreaterThanOrEqual(
            MIN_GRAPHIC_CONTRAST,
          );
          expect(
            contrast(tone.border, theme.tokens.background),
          ).toBeGreaterThanOrEqual(MIN_GRAPHIC_CONTRAST);
          expect(
            contrast(tone.accent, theme.tokens.surface),
          ).toBeGreaterThanOrEqual(MIN_GRAPHIC_CONTRAST);
        },
      );

      it("keeps saturation below the seed's and out of neon territory", () => {
        for (const category of DEFAULT_CATEGORIES) {
          const derived = hsl(palette[category.id].fill).s;
          expect(derived).toBeLessThanOrEqual(hsl(category.color).s);
          expect(derived).toBeLessThanOrEqual(0.5);
        }
      });

      it("keeps every entity type distinguishable from every other", () => {
        for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
          for (let j = i + 1; j < DEFAULT_CATEGORIES.length; j++) {
            const a = palette[DEFAULT_CATEGORIES[i].id];
            const b = palette[DEFAULT_CATEGORIES[j].id];
            expect(
              isDistinguishable(a, b),
              `${DEFAULT_CATEGORIES[i].id} vs ${DEFAULT_CATEGORIES[j].id}`,
            ).toBe(true);
          }
        }
      });
    },
  );
});
