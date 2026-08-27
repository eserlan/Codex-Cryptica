/**
 * Scoring and pool narrowing, shared by single-axis resolution and multi-pick
 * selection so both obey the same weights, rules and relaxation order.
 */

import type { Rng } from "../random-utils";
import { evaluate } from "./predicates";
import type {
  OptionPool,
  Relaxation,
  ResolveContext,
  SmartOption,
  Trait,
} from "./types";

/** A bare string is an option with default weight and no rules. */
function coerce(option: string | SmartOption): SmartOption {
  return typeof option === "string" ? { value: option } : option;
}

export function expand(pool: OptionPool): SmartOption[] {
  return pool.map(coerce);
}

/**
 * Weighted draw that consumes exactly one number from the stream, and that with
 * uniform weights lands on the same index as `pickFrom`. The equivalence is what
 * lets an un-annotated generator migrate to this resolver without its output
 * distribution (or its seeded tests) shifting.
 */
export function weightedPick(
  scored: readonly { option: SmartOption; score: number }[],
  rng: Rng,
): SmartOption {
  const total = scored.reduce((sum, entry) => sum + entry.score, 0);
  let roll = rng() * total;
  for (const entry of scored) {
    roll -= entry.score;
    if (roll < 0) return entry.option;
  }
  // Only reachable through floating point drift on the final entry.
  return scored[scored.length - 1].option;
}

export function scoreOf(
  option: SmartOption,
  ctx: ResolveContext,
  bias: Readonly<Record<Trait, number>>,
): number {
  let score = option.weight ?? 1;
  for (const trait of option.traits ?? []) {
    const multiplier = bias[trait];
    if (multiplier !== undefined) score *= multiplier;
  }
  if (option.boosts) {
    for (const trait of ctx.traits) {
      const multiplier = option.boosts[trait];
      if (multiplier !== undefined) score *= multiplier;
    }
  }
  return score > 0 ? score : 0;
}

/**
 * Narrow the pool, giving up constraints in a fixed order rather than failing.
 * A generator that cannot draw is a worse outcome than one that draws something
 * slightly incoherent, so an over-constrained axis relaxes and says so.
 */
export function narrow(
  options: readonly SmartOption[],
  ctx: ResolveContext,
  axisId: string,
  relaxations: Relaxation[],
): SmartOption[] {
  const meetsRequires = (o: SmartOption) =>
    o.requires === undefined || evaluate(o.requires, ctx);
  const meetsExcludes = (o: SmartOption) =>
    o.excludes === undefined || !evaluate(o.excludes, ctx);

  const strict = options.filter((o) => meetsRequires(o) && meetsExcludes(o));
  if (strict.length > 0) return strict;

  relaxations.push({ axisId, dropped: "excludes" });
  const withoutExcludes = options.filter(meetsRequires);
  if (withoutExcludes.length > 0) return withoutExcludes;

  relaxations.push({ axisId, dropped: "requires" });
  return [...options];
}
