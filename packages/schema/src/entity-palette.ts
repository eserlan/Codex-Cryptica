import type { Category } from "./entity";
import type { StylingTemplate, ThemeTokens } from "./theme";

/**
 * Theme-aware entity-type tones (issue #2680).
 *
 * A category's `color` is the canonical, user-editable identity of an entity
 * type — but painting it straight onto a graph node produced neon blocks that
 * looked like a graph library's defaults rather than part of the active theme
 * (a fluorescent green location beside a bright orange faction on dark
 * leather). These helpers keep the category hue as the *seed* and derive the
 * colours actually painted from the theme's own tokens, so every type reads as
 * a variant of one designed palette in all 30+ themes, including any custom
 * one a user builds.
 *
 * Everything here is pure and deterministic: same theme + same category in,
 * same tone out. Contrast targets follow WCAG 1.4.11 non-text contrast (3:1),
 * because node fills, rings and glyphs are graphics, not text.
 */

export interface EntityTypeTone {
  /** Node body. A muted, theme-anchored tint of the category hue. */
  fill: string;
  /** Node ring. Held at >= 3:1 against the canvas background. */
  border: string;
  /** Icon/silhouette painted on `fill`. Held at >= 3:1 against it. */
  glyph: string;
  /** Chip/rule colour for type UI on a panel. >= 3:1 against the surface. */
  accent: string;
}

export type EntityTypePalette = Record<string, EntityTypeTone>;

/** WCAG 1.4.11: graphical objects need 3:1 against what they sit on. */
export const MIN_GRAPHIC_CONTRAST = 3;

/** How far a category hue may be pulled towards the theme's own hue. */
const HUE_PULL_RATIO = 0.12;
const HUE_PULL_MAX_DEG = 14;

/** Saturation is scaled by the theme's own chroma, then clamped to this band. */
const SAT_MIN = 0.14;
const SAT_MAX = 0.46;

/** A token this washed out carries no usable hue to harmonise towards. */
const NEUTRAL_SAT = 0.08;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  /** Degrees, 0-360. */
  h: number;
  /** 0-1. */
  s: number;
  /** 0-1. */
  l: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Parses the colour formats theme tokens and categories actually use: 3- and
 * 6-digit hex plus `rgb()`/`rgba()`. Anything else (a `color-mix()` token, a
 * named colour) returns null and the caller falls back to the raw string —
 * better an unharmonised colour than a broken one.
 */
export function parseColor(color: string | undefined): Rgb | null {
  if (!color) return null;
  const value = color.trim();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3) {
      return {
        r: parseInt(digits[0] + digits[0], 16),
        g: parseInt(digits[1] + digits[1], 16),
        b: parseInt(digits[2] + digits[2], 16),
      };
    }
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
    };
  }

  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    // CSS allows either number or percentage channels, and mixing the two is
    // invalid — `rgb(100%, 0%, 0%)` read as 0-255 numbers would be a dark red
    // instead of pure red.
    const channels = parts.slice(0, 3).map((part) => {
      const numeric = Number.parseFloat(part);
      if (Number.isNaN(numeric)) return NaN;
      return part.trim().endsWith("%") ? (numeric / 100) * 255 : numeric;
    });
    if (channels.some((c) => Number.isNaN(c))) return null;
    return {
      r: clamp(channels[0], 0, 255),
      g: clamp(channels[1], 0, 255),
      b: clamp(channels[2], 0, 255),
    };
  }

  return null;
}

export function toHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.round(clamp(value, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;

  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return {
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
  };
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const v = clamp(value, 0, 255) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Blends `amount` of `towards` into `color` (0 = unchanged, 1 = `towards`). */
function mix(color: Rgb, towards: Rgb, amount: number): Rgb {
  const t = clamp(amount, 0, 1);
  return {
    r: color.r + (towards.r - color.r) * t,
    g: color.g + (towards.g - color.g) * t,
    b: color.b + (towards.b - color.b) * t,
  };
}

/**
 * Rounds to the 8-bit channels the colour is finally serialised with, so a
 * contrast measurement here is a measurement of what actually gets painted.
 */
const quantize = ({ r, g, b }: Rgb): Rgb => ({
  r: Math.round(clamp(r, 0, 255)),
  g: Math.round(clamp(g, 0, 255)),
  b: Math.round(clamp(b, 0, 255)),
});

/**
 * Walks lightness outwards from the colour's own until it clears `target`
 * against `backdrop`, keeping hue and saturation intact. Steps outwards in
 * both directions so the *nearest* lightness that works wins — a tone only
 * moves as far as legibility actually requires, which is what keeps the
 * palette muted. If no lightness clears the target (a mid-luminance backdrop
 * can be unreachable), the most contrasting candidate is returned rather than
 * the failing original.
 */
function ensureContrast(color: Rgb, backdrop: Rgb, target: number): Rgb {
  const start = quantize(color);
  if (contrastRatio(start, backdrop) >= target) return start;

  const hsl = rgbToHsl(start);
  let best = start;
  let bestRatio = contrastRatio(start, backdrop);

  for (let step = 1; step <= 50; step++) {
    for (const direction of [1, -1]) {
      const l = hsl.l + direction * step * 0.02;
      if (l < 0 || l > 1) continue;
      const candidate = quantize(hslToRgb({ ...hsl, l }));
      const ratio = contrastRatio(candidate, backdrop);
      if (ratio >= target) return candidate;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = candidate;
      }
    }
  }

  return best;
}

/** Rotates `hue` a bounded amount along the short arc towards `anchor`. */
function harmonizeHue(hue: number, anchor: number | null): number {
  if (anchor === null) return hue;
  let delta = ((anchor - hue + 540) % 360) - 180;
  delta = clamp(delta * HUE_PULL_RATIO, -HUE_PULL_MAX_DEG, HUE_PULL_MAX_DEG);
  return (((hue + delta) % 360) + 360) % 360;
}

/**
 * The hue every entity type leans towards: the theme's primary if it carries
 * one, else its accent. Neutral themes (greys) anchor nothing, so their type
 * hues stay where they are and only lose saturation.
 */
function themeAnchorHue(
  primary: Rgb | null,
  accent: Rgb | null,
): number | null {
  for (const token of [primary, accent]) {
    if (!token) continue;
    const hsl = rgbToHsl(token);
    if (hsl.s >= NEUTRAL_SAT) return hsl.h;
  }
  return null;
}

/** Mean saturation of the theme's own accents, 0 (grey theme) to 1 (neon). */
function themeChroma(primary: Rgb | null, accent: Rgb | null): number {
  const values = [primary, accent]
    .filter((token): token is Rgb => token !== null)
    .map((token) => rgbToHsl(token).s);
  if (values.length === 0) return 0.5;
  return values.reduce((sum, s) => sum + s, 0) / values.length;
}

/**
 * Derives one entity type's tone from its seed colour and the active theme.
 *
 * The seed only ever contributes hue and how much saturation it is *willing*
 * to spend; lightness comes from the theme's own surface, so a type sits in
 * the same tonal band as everything else the theme paints. An unparseable
 * seed or theme background falls back to the seed colour untouched.
 */
export function deriveEntityTypeTone(
  seedColor: string,
  tokens: ThemeTokens,
): EntityTypeTone {
  const seed = parseColor(seedColor);
  const background = parseColor(tokens.background);
  const surface = parseColor(tokens.surface) ?? background;

  if (!seed || !background || !surface) {
    return {
      fill: seedColor,
      border: seedColor,
      glyph: tokens.primary || tokens.text,
      accent: seedColor,
    };
  }

  const primary = parseColor(tokens.primary);
  const accentToken = parseColor(tokens.accent);
  const seedHsl = rgbToHsl(seed);
  const surfaceHsl = rgbToHsl(surface);
  const isDarkTheme = relativeLuminance(background) < 0.4;

  const hue = harmonizeHue(seedHsl.h, themeAnchorHue(primary, accentToken));
  const saturation = clamp(
    seedHsl.s * (0.4 + 0.35 * themeChroma(primary, accentToken)),
    SAT_MIN,
    SAT_MAX,
  );
  // Anchored to the theme's own material rather than to the seed: a dark
  // theme gets tones a step above its surface, a light theme a step below.
  const lightness = isDarkTheme
    ? clamp(surfaceHsl.l + 0.16, 0.2, 0.42)
    : clamp(surfaceHsl.l - 0.22, 0.5, 0.72);

  const tint = hslToRgb({ h: hue, s: saturation, l: lightness });
  // A last pull towards the surface is what makes seven hues read as one
  // family instead of seven unrelated swatches.
  const fill = mix(tint, surface, 0.22);

  // The ring starts barely a step off the fill and carries a little of the
  // theme's primary; `ensureContrast` then lifts it exactly as far as the 3:1
  // floor demands and no further, so nodes read as objects without a bright
  // outline drawing the eye away from the entity itself.
  const ringSeed = mix(
    hslToRgb({
      h: hue,
      s: clamp(saturation * 1.05, SAT_MIN, 0.56),
      l: clamp(lightness + (isDarkTheme ? 0.06 : -0.06), 0.12, 0.86),
    }),
    primary ?? tint,
    0.18,
  );

  const glyphSeed = primary ?? parseColor(tokens.text) ?? surface;

  return {
    fill: toHex(fill),
    border: toHex(ensureContrast(ringSeed, background, MIN_GRAPHIC_CONTRAST)),
    glyph: toHex(ensureContrast(glyphSeed, fill, MIN_GRAPHIC_CONTRAST)),
    accent: toHex(ensureContrast(ringSeed, surface, MIN_GRAPHIC_CONTRAST)),
  };
}

/** Derives tones for every category in one pass, keyed by category id. */
export function deriveEntityTypePalette(
  theme: Pick<StylingTemplate, "tokens"> | undefined | null,
  categories: Category[],
): EntityTypePalette {
  const palette: EntityTypePalette = {};
  if (!theme?.tokens) return palette;
  for (const category of categories) {
    palette[category.id] = deriveEntityTypeTone(category.color, theme.tokens);
  }
  return palette;
}
