import type { DiceEngine } from "dice-engine";
import type { TableEntry } from "./types";

/**
 * Weighted selection over `DiceEngine`.
 *
 * Never uses `Math.random()`: DiceEngine already implements rejection sampling
 * against `crypto.getRandomValues` with a documented no-modulo-bias guarantee,
 * which is exactly the property SC-008 measures. Routing through it also means
 * a seeded provider makes selection deterministic in tests.
 */

/**
 * Weight of each entry, normalised to a non-negative integer.
 *
 * This is the one place weights are sanitised, because the editor's number
 * input cannot do it: `min="1"` is a hint that blocks neither typing `0` nor
 * the `oninput` that follows, a cleared field reads as `Number("") === 0`, and
 * a typed letter reads as `NaN`. NaN is the dangerous one — it passes a
 * `total <= 0` check and then matches no cursor band at all, silently biasing
 * every roll to the last entry.
 *
 * A missing weight still means 1. A deliberate 0 still means "never pick this",
 * which the cursor walk honours by never advancing past it.
 */
export function weightsOf(entries: TableEntry[]): number[] {
  return entries.map((e) => {
    if (e.weight === undefined) return 1;
    if (!Number.isFinite(e.weight)) return 0;
    return Math.max(Math.round(e.weight), 0);
  });
}

export function totalWeight(entries: TableEntry[]): number {
  return weightsOf(entries).reduce((a, b) => a + b, 0);
}

export interface Selection {
  index: number;
  /**
   * The actual 1..total roll behind the pick.
   *
   * Returned so callers report a real die value rather than reconstructing one
   * from the winning entry's band floor, which is a different number (FR-011).
   */
  roll: number;
}

/**
 * Picks an index in `weights` with probability proportional to its weight.
 *
 * Returns the index rather than the entry so callers can report the underlying
 * die value alongside the result (FR-011).
 */
export function selectIndex(weights: number[], dice: DiceEngine): Selection {
  if (weights.length === 0) {
    throw new Error("selectIndex called with no weights");
  }

  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    throw new Error("selectIndex called with non-positive total weight");
  }
  if (weights.length === 1) return { index: 0, roll: 1 };

  // rollRaw gives 1..total inclusive, unbiased.
  const roll = rollRaw(total, dice);
  let cursor = 0;
  for (let i = 0; i < weights.length; i++) {
    cursor += weights[i];
    if (roll <= cursor) return { index: i, roll };
  }
  return { index: weights.length - 1, roll };
}

/**
 * One unbiased integer in 1..sides via DiceEngine's own dice notation, which is
 * the only public surface exposing its rejection sampling.
 */
export function rollRaw(sides: number, dice: DiceEngine): number {
  if (sides <= 0) throw new Error("rollRaw requires a positive side count");
  if (sides === 1) return 1;
  return dice.evaluate(`1d${sides}`).total;
}
