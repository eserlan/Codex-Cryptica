/**
 * Art Direction v2 — negative prompt library.
 *
 * Negatives are stored as discrete terms rather than prose so they can be
 * merged, deduplicated, and formatted per provider.
 *
 * The blocks are split by what they actually apply to. Anatomy negatives on a
 * landscape waste prompt budget and mildly contradict a camera that asks for a
 * human-scale reference figure, so they are only emitted when a figure is
 * actually in frame.
 */

/** Applies to every image regardless of subject. */
export const UNIVERSAL_NEGATIVE_PROMPT: readonly string[] = [
  "text",
  "watermark",
  // Qualified deliberately: the bare term "signature" collides with the
  // character category's "signature equipment", which is positive direction.
  "artist signature",
  "logo",
  "oversaturated HDR",
  "lens dirt overlay",
  "tiling",
];

/** Applies only when a person or creature is in frame. */
export const FIGURE_NEGATIVE_PROMPT: readonly string[] = [
  "extra fingers",
  "extra limbs",
  "fused hands",
  "distorted anatomy",
  "asymmetrical eyes",
  "plastic skin",
  "cropped head",
];

export const CATEGORY_NEGATIVE_PROMPTS: Record<string, readonly string[]> = {
  character: [
    "stiff A-pose",
    "generic armour",
    "blank expression",
    "hidden hands",
    "mirror symmetry",
    "floating accessories",
  ],
  creature: [
    "white void",
    "human face",
    "decorative spikes",
    "symmetrical roar",
    "no scale reference",
  ],
  location: [
    "empty stage",
    "flat lighting",
    "uniform haze",
    "fisheye distortion",
    "unjustified centre symmetry",
  ],
  item: [
    "magic aura",
    "floating UI",
    "pristine unused surface",
    "clutter",
    "gemstone spam",
  ],
  faction: [
    "random crowd",
    "clones",
    "oversized emblem",
    "superhero stance",
    "neon clutter",
    "anachronistic gear",
  ],
  event: [
    "mannequins",
    "decorative explosion",
    "no consequences",
    "equal focus everywhere",
  ],
  note: [
    "illegible glyph soup",
    "competing focal points",
    "meaningless decorative text",
  ],
  cover: [
    "busy top third",
    "centred focal point",
    "missing negative space",
    "generated text",
  ],
};

export interface NegativeCompositionOptions {
  /**
   * Whether a person or creature appears in frame. Drives inclusion of the
   * figure block. Defaults to false so figureless categories stay clean.
   */
  figureInFrame?: boolean;
}

/**
 * Merges the universal block, the figure block where relevant, and the
 * selected category block, preserving that order and dropping
 * case-insensitive duplicates.
 */
export function composeNegativeTerms(
  categoryId?: string,
  options: NegativeCompositionOptions = {},
): string[] {
  const categoryTerms = categoryId
    ? CATEGORY_NEGATIVE_PROMPTS[categoryId] || []
    : [];
  const figureTerms = options.figureInFrame ? FIGURE_NEGATIVE_PROMPT : [];

  const seen = new Set<string>();
  const merged: string[] = [];

  for (const term of [
    ...UNIVERSAL_NEGATIVE_PROMPT,
    ...figureTerms,
    ...categoryTerms,
  ]) {
    const key = term.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(term.trim());
  }

  return merged;
}
