import { OUTCOME_BANDS, type OutcomeBandId } from "schema";

/**
 * The five ordered outcome bands and the magnitudes they produce.
 *
 * Ordering is load-bearing in two places: `permittedBands` walks it to build the
 * at-most-one-step range AI may choose within (FR-021a), and the monotonicity
 * guarantee (FR-017b) is expressed as "the magnitude table decreases along this
 * array". Do not reorder without re-reading both.
 *
 * The numbers here are the tuning surface. The spec deliberately fixes only
 * their *ordering* and *determinism*, not their values — see plan.md open item 1
 * and task T087, which tunes them against a real vault.
 */
export const BAND_ORDER = OUTCOME_BANDS;

const LABELS: Record<OutcomeBandId, string> = {
  "decisive-success": "Decisive success",
  success: "Success",
  mixed: "Mixed",
  failure: "Failure",
  backfire: "Backfire",
};

export function bandLabel(band: OutcomeBandId): string {
  return LABELS[band];
}

export interface BandMagnitude {
  /**
   * Change to the relationship strength the acting faction holds over the
   * target, in the 0..1 units the connection model uses. Positive shifts the
   * hold toward the faction; negative shifts it away.
   */
  strength: number;
  /** Change to the acting faction's influence stat, in whole points. */
  stat: number;
}

/**
 * Magnitudes per band, monotonically decreasing down the array (FR-017b).
 *
 * `mixed` is deliberately the smallest absolute movement of any band (FR-017a)
 * rather than zero: a turn that changed nothing at all reads as a bug to a GM,
 * and it makes turn history noisier to interpret ("did that even happen?").
 */
const MAGNITUDES: Record<OutcomeBandId, BandMagnitude> = {
  "decisive-success": { strength: 0.2, stat: 2 },
  success: { strength: 0.1, stat: 1 },
  mixed: { strength: 0.02, stat: 0 },
  failure: { strength: -0.1, stat: -1 },
  backfire: { strength: -0.2, stat: -2 },
};

/**
 * The magnitude a band produces. Depends only on the band (FR-032a), so the same
 * band always moves the world by the same amount — which is what makes a
 * committed turn reversible from its record alone.
 */
export function bandMagnitude(band: OutcomeBandId): BandMagnitude {
  // Returned by value so a caller mutating the result cannot corrupt the table.
  return { ...MAGNITUDES[band] };
}

export function isSuccessBand(band: OutcomeBandId): boolean {
  return band === "decisive-success" || band === "success";
}

export function isFailureBand(band: OutcomeBandId): boolean {
  return band === "failure" || band === "backfire";
}

/**
 * Margin thresholds, checked from the most decisive downward.
 *
 * A tie is `mixed`: neither side prevailed, which is exactly what that band is
 * for.
 */
const THRESHOLDS: { minMargin: number; band: OutcomeBandId }[] = [
  { minMargin: 8, band: "decisive-success" },
  { minMargin: 1, band: "success" },
  { minMargin: 0, band: "mixed" },
  { minMargin: -7, band: "failure" },
];

/**
 * Map an acting total against an opposing total to a band.
 *
 * Pure and total: every real-numbered input lands in exactly one of the five
 * bands, which is what makes resolution deterministic when randomness and AI
 * band selection are both off (SC-006).
 */
export function bandForTotal(
  actingTotal: number,
  opposingTotal: number,
): OutcomeBandId {
  const margin = actingTotal - opposingTotal;
  for (const { minMargin, band } of THRESHOLDS) {
    if (margin >= minMargin) return band;
  }
  return "backfire";
}

/**
 * The bands AI may choose from, given the mechanically computed one (FR-021a).
 *
 * At most one step either side, truncated at the ends of the scale. This is the
 * range; enforcement that a returned band actually falls inside it lives in
 * `applyAiBand`, because a provider response schema can constrain the band to
 * the five ids but cannot express "within one of a value computed this turn".
 */
export function permittedBands(mechanical: OutcomeBandId): OutcomeBandId[] {
  const index = BAND_ORDER.indexOf(mechanical);
  const start = Math.max(0, index - 1);
  const end = Math.min(BAND_ORDER.length - 1, index + 1);
  return BAND_ORDER.slice(start, end + 1);
}
