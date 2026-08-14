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

/** Weight of each entry, defaulting a missing weight to 1. */
export function weightsOf(entries: TableEntry[]): number[] {
  return entries.map((e) => (e.weight === undefined ? 1 : e.weight));
}

export function totalWeight(entries: TableEntry[]): number {
  return weightsOf(entries).reduce((a, b) => a + b, 0);
}

/**
 * Picks an index in `weights` with probability proportional to its weight.
 *
 * Returns the *index*, not the entry, so callers can report the underlying die
 * value alongside the result (FR-011).
 */
export function selectIndex(weights: number[], dice: DiceEngine): number {
  if (weights.length === 0) {
    throw new Error("selectIndex called with no weights");
  }
  if (weights.length === 1) return 0;

  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    throw new Error("selectIndex called with non-positive total weight");
  }

  // rollRaw gives 1..total inclusive, unbiased.
  const roll = rollRaw(total, dice);
  let cursor = 0;
  for (let i = 0; i < weights.length; i++) {
    cursor += weights[i];
    if (roll <= cursor) return i;
  }
  return weights.length - 1;
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
