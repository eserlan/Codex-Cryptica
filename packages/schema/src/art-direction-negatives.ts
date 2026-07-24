/**
 * Art Direction v2 — negative prompt library.
 *
 * Negatives are stored as discrete terms rather than prose so they can be
 * merged, deduplicated, and formatted per provider. Category blocks describe
 * failure modes specific to that subject type; the general block covers
 * failures every category shares.
 */

export const GENERAL_NEGATIVE_PROMPT: readonly string[] = [
  "text",
  "watermark",
  // Qualified deliberately: the bare term "signature" collides with the
  // character category's "signature equipment", which is positive direction.
  "artist signature",
  "logo",
  "extra fingers",
  "extra limbs",
  "fused hands",
  "distorted anatomy",
  "asymmetrical eyes",
  "plastic skin",
  "oversaturated HDR",
  "lens dirt overlay",
  "tiling",
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

/**
 * Merges the general block with the selected category block, preserving order
 * (general first, then category) and dropping case-insensitive duplicates.
 */
export function composeNegativeTerms(categoryId?: string): string[] {
  const categoryTerms = categoryId
    ? CATEGORY_NEGATIVE_PROMPTS[categoryId] || []
    : [];
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const term of [...GENERAL_NEGATIVE_PROMPT, ...categoryTerms]) {
    const key = term.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(term.trim());
  }

  return merged;
}
