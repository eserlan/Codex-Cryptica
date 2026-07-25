/**
 * Art Direction v2 — photography and optics toolkit.
 *
 * Optics are expressed as structured presets rather than free-form strings so
 * category and theme defaults can be merged with a small number of user
 * overrides without producing contradictory prompts.
 */

export type FocalLength =
  | "16mm"
  | "20mm"
  | "24mm"
  | "28mm"
  | "35mm"
  | "50mm"
  | "85mm"
  | "100mm"
  | "105mm"
  | "135mm"
  | "200mm"
  | "100mm-macro"
  | "tilt-shift";

export type Aperture =
  | "f/1.4"
  | "f/1.8"
  | "f/2.8"
  | "f/4"
  | "f/5.6"
  | "f/8"
  | "f/11"
  | "f/16"
  | "hyperfocal";

export type ShotSize =
  | "extreme-wide"
  | "wide"
  | "full"
  | "medium-full"
  | "medium"
  | "medium-close"
  | "close"
  | "extreme-close"
  | "insert";

export type CameraAngle =
  | "eye-level"
  | "low"
  | "high"
  | "worms-eye"
  | "birds-eye"
  | "dutch"
  | "over-the-shoulder";

export type AspectRatio = "2.39:1" | "16:9" | "3:2" | "4:5" | "2:3" | "1:1";

export type LightingRecipe =
  | "rembrandt"
  | "split"
  | "butterfly"
  | "loop"
  | "rim"
  | "chiaroscuro"
  | "high-key"
  | "low-key"
  | "motivated-practical"
  | "golden-hour"
  | "blue-hour"
  | "overcast-softbox";

export type FilmStock =
  | "portra-400"
  | "ektar"
  | "tri-x-400"
  | "ilford-hp5"
  | "velvia"
  | "cinestill-800t"
  | "ektachrome";

export type LensCharacter =
  | "anamorphic-flare"
  | "bokeh"
  | "vignette"
  | "chromatic-aberration"
  | "barrel-distortion"
  | "focus-breathing"
  | "shallow-depth"
  | "long-exposure"
  | "motion-blur"
  | "light-leak"
  | "halation"
  | "grain";

export interface OpticsPreset {
  id: string;
  focalLength?: FocalLength;
  aperture?: Aperture;
  shotSize?: ShotSize;
  angle?: CameraAngle;
  aspectRatio?: AspectRatio;
  lighting?: LightingRecipe;
  filmStock?: FilmStock;
  lensCharacter?: LensCharacter[];
  /** Free-form composition note appended after the structured optics terms. */
  composition?: string;
  /**
   * Set when this framing puts a person in frame for a category that normally
   * has none — the item `in-hand` variant, for instance. Not an optical
   * property; it selects the anatomy negative block, which would otherwise be
   * omitted and let the visible hand render badly.
   */
  figureInFrame?: boolean;
}

/** Overrides an advanced user may apply on top of a category/theme default. */
export type OpticsOverrides = Partial<Omit<OpticsPreset, "id">>;

export const FOCAL_LENGTH_PHRASES: Record<FocalLength, string> = {
  "16mm": "16mm ultra-wide lens",
  "20mm": "20mm ultra-wide lens",
  "24mm": "24mm wide-angle lens",
  "28mm": "28mm wide-angle lens",
  "35mm": "35mm lens",
  "50mm": "50mm lens",
  "85mm": "85mm lens",
  "100mm": "100mm lens",
  "105mm": "105mm short telephoto lens",
  "135mm": "135mm telephoto lens",
  "200mm": "200mm telephoto lens",
  "100mm-macro": "100mm macro lens",
  "tilt-shift": "tilt-shift lens",
};

export const APERTURE_PHRASES: Record<Aperture, string> = {
  "f/1.4": "f/1.4, very shallow depth of field",
  "f/1.8": "f/1.8, shallow depth of field",
  "f/2.8": "f/2.8, subject isolated from the background",
  "f/4": "f/4, moderate depth of field",
  "f/5.6": "f/5.6, balanced depth of field",
  "f/8": "f/8, sharp through the subject",
  "f/11": "f/11, deep focus",
  "f/16": "f/16, deep focus front to back",
  hyperfocal: "hyperfocal focus, everything from foreground to horizon sharp",
};

export const SHOT_SIZE_PHRASES: Record<ShotSize, string> = {
  "extreme-wide": "extreme wide shot",
  wide: "wide shot",
  full: "full-length shot with headroom",
  "medium-full": "medium-full shot from the knees up",
  medium: "medium shot from the waist up",
  "medium-close": "medium close-up from the chest up",
  close: "close-up",
  "extreme-close": "extreme close-up",
  insert: "macro insert shot",
};

export const CAMERA_ANGLE_PHRASES: Record<CameraAngle, string> = {
  "eye-level": "eye-level angle",
  low: "slightly low angle",
  high: "slightly high angle",
  "worms-eye": "worm's-eye angle looking up",
  "birds-eye": "bird's-eye angle looking down",
  dutch: "dutch tilt",
  "over-the-shoulder": "over-the-shoulder angle",
};

export const ASPECT_RATIO_PHRASES: Record<AspectRatio, string> = {
  "2.39:1": "2.39:1 anamorphic widescreen framing",
  "16:9": "16:9 widescreen framing",
  "3:2": "3:2 landscape framing",
  "4:5": "4:5 portrait framing",
  "2:3": "2:3 portrait framing",
  "1:1": "1:1 square framing",
};

/**
 * Pixel dimensions for each ratio, for providers that take an explicit size
 * instead of reading the framing out of the prompt. Kept near 1 megapixel and
 * on multiples of 64, which is what diffusion models are trained on.
 */
export const ASPECT_RATIO_DIMENSIONS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  "2.39:1": { width: 1536, height: 640 },
  "16:9": { width: 1344, height: 768 },
  "3:2": { width: 1216, height: 832 },
  "4:5": { width: 896, height: 1152 },
  "2:3": { width: 832, height: 1216 },
  "1:1": { width: 1024, height: 1024 },
};

export const LIGHTING_RECIPE_PHRASES: Record<LightingRecipe, string> = {
  rembrandt: "Rembrandt key light with a triangle of light on the shadow cheek",
  split: "split lighting dividing the face into light and shadow halves",
  butterfly: "butterfly key light casting a small shadow under the nose",
  loop: "loop key light with a short nose shadow",
  rim: "rim and kicker light separating the subject from the background",
  chiaroscuro: "chiaroscuro lighting with deep unresolved shadow",
  "high-key": "high-key lighting, bright and low contrast",
  "low-key": "low-key lighting, dark with controlled highlights",
  "motivated-practical": "motivated practical lights visible in frame",
  "golden-hour": "low golden-hour sunlight with long shadows",
  "blue-hour": "blue-hour twilight with cool ambient fill",
  "overcast-softbox": "soft even overcast light",
};

export const FILM_STOCK_PHRASES: Record<FilmStock, string> = {
  "portra-400": "Kodak Portra 400 colour response",
  ektar: "Kodak Ektar saturation and fine grain",
  "tri-x-400": "Kodak Tri-X 400 black and white grain",
  "ilford-hp5": "Ilford HP5 black and white grain",
  velvia: "Fuji Velvia saturated slide-film colour",
  "cinestill-800t": "Cinestill 800T tungsten colour with halation",
  ektachrome: "Ektachrome slide-film colour",
};

export const LENS_CHARACTER_PHRASES: Record<LensCharacter, string> = {
  "anamorphic-flare": "horizontal anamorphic flare",
  bokeh: "rounded bokeh in the out-of-focus areas",
  vignette: "subtle corner vignette",
  "chromatic-aberration": "slight chromatic aberration at high-contrast edges",
  "barrel-distortion": "mild barrel distortion",
  "focus-breathing": "gentle focus breathing",
  "shallow-depth": "shallow depth of field",
  "long-exposure": "long-exposure motion trails",
  "motion-blur": "motion blur on moving elements",
  "light-leak": "faint light leak across one edge",
  halation: "halation glow around bright highlights",
  grain: "visible film grain",
};

/**
 * Optics terms that contradict each other when combined. Used by
 * {@link validateOptics} to surface authoring mistakes during development.
 */
const DEPTH_OF_FIELD_APERTURES: Aperture[] = ["f/1.4", "f/1.8", "f/2.8"];
const DEEP_FOCUS_APERTURES: Aperture[] = ["f/11", "f/16", "hyperfocal"];

export interface OpticsWarning {
  code: string;
  message: string;
}

/**
 * Returns human-readable warnings for optics combinations that will fight each
 * other in the final image. Callers decide whether to log, surface, or ignore.
 */
export function validateOptics(preset: OpticsPreset): OpticsWarning[] {
  const warnings: OpticsWarning[] = [];
  const lensCharacter = preset.lensCharacter || [];

  if (
    preset.aperture &&
    DEEP_FOCUS_APERTURES.includes(preset.aperture) &&
    lensCharacter.includes("shallow-depth")
  ) {
    warnings.push({
      code: "aperture-depth-conflict",
      message: `Aperture ${preset.aperture} asks for deep focus but lens character requests shallow depth.`,
    });
  }

  if (
    preset.aperture &&
    DEPTH_OF_FIELD_APERTURES.includes(preset.aperture) &&
    preset.shotSize === "extreme-wide"
  ) {
    warnings.push({
      code: "aperture-shot-conflict",
      message: `Aperture ${preset.aperture} isolates a subject but the shot size is extreme wide.`,
    });
  }

  if (
    lensCharacter.includes("long-exposure") &&
    lensCharacter.includes("motion-blur")
  ) {
    warnings.push({
      code: "motion-redundant",
      message:
        "long-exposure and motion-blur both describe movement; pick one.",
    });
  }

  if (lensCharacter.length > MAX_LENS_CHARACTER_TERMS) {
    warnings.push({
      code: "lens-character-overload",
      message: `${lensCharacter.length} lens character terms will muddy the render; keep it to ${MAX_LENS_CHARACTER_TERMS} or fewer.`,
    });
  }

  return warnings;
}

/** Beyond this, lens character terms start cancelling each other out. */
export const MAX_LENS_CHARACTER_TERMS = 3;

/**
 * Merges advanced overrides onto a base preset. Undefined override values are
 * ignored so a caller can adjust a single field without restating the rest.
 */
export function mergeOptics(
  base: OpticsPreset,
  overrides?: OpticsOverrides,
): OpticsPreset {
  if (!overrides) return base;
  const merged = { ...base } as OpticsPreset & Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    merged[key] = value;
  }
  return merged;
}

/**
 * Renders a preset as a single camera clause. Order is fixed so identical
 * inputs always produce byte-identical output.
 */
export function formatOptics(preset?: OpticsPreset): string {
  if (!preset) return "";

  const parts: string[] = [];
  if (preset.shotSize) parts.push(SHOT_SIZE_PHRASES[preset.shotSize]);
  if (preset.focalLength) parts.push(FOCAL_LENGTH_PHRASES[preset.focalLength]);
  if (preset.aperture) parts.push(APERTURE_PHRASES[preset.aperture]);
  if (preset.angle) parts.push(CAMERA_ANGLE_PHRASES[preset.angle]);
  if (preset.lighting) parts.push(LIGHTING_RECIPE_PHRASES[preset.lighting]);
  if (preset.composition) parts.push(preset.composition);
  if (preset.filmStock) parts.push(FILM_STOCK_PHRASES[preset.filmStock]);
  for (const character of preset.lensCharacter || []) {
    parts.push(LENS_CHARACTER_PHRASES[character]);
  }
  if (preset.aspectRatio) parts.push(ASPECT_RATIO_PHRASES[preset.aspectRatio]);

  return parts.filter(Boolean).join(", ");
}
