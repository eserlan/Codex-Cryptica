/**
 * Art Direction v2 — the stature axis.
 *
 * Categories say what kind of thing is in frame, themes say what world it
 * belongs to, optics say how it is shot. None of them say whether it is a
 * farmhand, a duke, a hero, or a god — so "divine" could only ever appear as
 * adjectives in the subject layer, which every later layer overrides.
 *
 * The failure this exists to fix: a prompt for elven deities composed the
 * fantasy material vocabulary ("worn leather, hammered iron ... thatch and
 * slate, moss and lichen over old masonry") and rendered a village militia.
 * Six words of subject lost to sixty words of downstream peasant vocabulary.
 *
 * Which is the rule the whole axis is built on: a contradiction is resolved by
 * *substitution*, not addition. Appending "radiant, divine" to a prompt that
 * still says thatch and worn leather returns the same militia with a glow on
 * it, so an exalted stature replaces the material vocabulary rather than
 * extending it, and spends negatives on the words that would drag the subject
 * back down.
 */

import type { MaterialFocus } from "./art-direction-catalogue";
import type { OpticsPreset } from "./art-direction-optics";

export type StatureId = "mundane" | "renowned" | "mythic" | "divine";

/** How a composed stature was decided. */
export type StatureSource = "explicit" | "labels" | "inferred";

export interface ArtStature {
  id: string;
  label: string;
  /** Register clause, composed directly after the subject. Empty for mundane. */
  prompt: string;
  /** Replaces the category's material focus when set. */
  materialFocus?: MaterialFocus;
  /**
   * Camera bias, applied over the theme's and under any explicit override.
   * Low angle and self-originating light do most of the work that reads as
   * stature; the wording alone does not.
   */
  defaultCamera?: Partial<OpticsPreset>;
  /** Terms that would pull the subject back to the mundane. */
  negativePrompt: readonly string[];
  /** Replaces the faction blueprint's signals, which are a heraldry manual. */
  factionSignals?: string;
}

export const ART_STATURES: Record<StatureId, ArtStature> = {
  // The default. Emits nothing, so a vault that never labels stature composes
  // byte-identical prompts to before this axis existed.
  mundane: {
    id: "stature.mundane",
    label: "Mundane",
    prompt: "",
    negativePrompt: [],
  },

  renowned: {
    id: "stature.renowned",
    label: "Renowned",
    prompt:
      "figures of standing: given space by those around them, dressed a step above them, and framed as the reason the scene is being looked at",
    negativePrompt: ["anonymous bystander", "lost in the crowd"],
  },

  mythic: {
    id: "stature.mythic",
    label: "Mythic",
    prompt:
      "legendary stature: hierarchical scale where importance sets size, stillness against a moving world, and a composition that arranges itself around them",
    materialFocus: "exalted",
    defaultCamera: { angle: "low", lighting: "rim" },
    negativePrompt: [
      "everyday wear",
      "patched cloth",
      "scuffed leather",
      "rust",
      "domestic clutter",
    ],
    // Stated positively: a prompt that says "no banners" tends to produce
    // banners. What must be absent goes in the negative block instead.
    factionSignals:
      "scale, stillness, and the deference of those nearby, with ornament kept sparse",
  },

  divine: {
    id: "stature.divine",
    label: "Divine",
    prompt:
      "divine presence: hierarchical scale where importance sets size, light originating from the figures rather than the scene, frontal authority, absolute stillness, and no trace of use, repair, or wear on anything they touch",
    materialFocus: "exalted",
    defaultCamera: { angle: "low", lighting: "radiant", aspectRatio: "2:3" },
    // The vocabulary that produced a village militia from a prompt for gods.
    negativePrompt: [
      "thatch",
      "cobblestone",
      "timber-framed houses",
      "worn leather",
      "patched cloth",
      "scuffed armour",
      "rust",
      "grime",
      "militia",
      "mortal crowd",
      "banners",
      "tabards",
      "battle standards",
      // Not "heraldic emblem": the faction category positively asks for
      // restrained heraldry, and its own block already bars an oversized one.
    ],
    factionSignals:
      "scale, stillness, and self-originating light, with any mortal figures small and turned toward them",
  },
};

/**
 * Label → stature. Vaults already carry labels and the distiller already
 * treats them as strong subject direction; this makes the same label steer the
 * layers the subject cannot reach.
 *
 * Only words that can *only* mean standing are listed. A label like "ancient"
 * belongs to a ruin, a tome, and a forest far more often than to a legend, and
 * an exalted stature would strip exactly the weathering a ruin exists to show.
 * Age, power, and importance to the plot are not stature. When in doubt the
 * word is left out: a missed stature costs one explicit label, a false one
 * silently rewrites the entity's whole material vocabulary.
 */
export const STATURE_ALIASES: Record<string, StatureId> = {
  deity: "divine",
  deities: "divine",
  god: "divine",
  goddess: "divine",
  gods: "divine",
  divine: "divine",
  divinity: "divine",
  immortal: "divine",
  primordial: "divine",
  titan: "divine",
  legend: "mythic",
  legendary: "mythic",
  demigod: "mythic",
};

/** Highest stature wins: a "legendary deity" is divine, not mythic. */
const STATURE_RANK: Record<StatureId, number> = {
  mundane: 0,
  renowned: 1,
  mythic: 2,
  divine: 3,
};

/** Resolves an id, alias, or label to a stature id. */
export function resolveStatureId(value?: string): StatureId | undefined {
  if (!value) return undefined;
  const key = value.trim().toLowerCase().replace(/_/g, "-");
  if (key in ART_STATURES) return key as StatureId;
  return STATURE_ALIASES[key];
}

/**
 * Picks the highest stature named by a set of labels. Returns undefined when
 * none of them carry stature, which is the common case.
 */
export function resolveStatureFromLabels(
  labels?: readonly string[],
): StatureId | undefined {
  let best: StatureId | undefined;
  for (const label of labels || []) {
    const resolved = resolveStatureId(label);
    if (!resolved) continue;
    if (!best || STATURE_RANK[resolved] > STATURE_RANK[best]) best = resolved;
  }
  return best;
}

export function getStature(id?: StatureId): ArtStature | undefined {
  if (!id) return undefined;
  return ART_STATURES[id];
}
