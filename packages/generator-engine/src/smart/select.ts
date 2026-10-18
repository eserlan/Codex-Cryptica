import { type Rng, defaultRng } from "../random-utils";
import { expand, narrow, scoreOf, weightedPick } from "./scoring";
import type {
  OptionPool,
  Relaxation,
  ResolveContext,
  SmartOption,
  Trait,
} from "./types";

export interface SelectionResult {
  values: string[];
  relaxations: Relaxation[];
}

/**
 * Draw several distinct options from one pool, obeying the same weights, rules
 * and relaxation order as axis resolution (#2341).
 *
 * This is for the lists a generator hangs off its resolved axes: points of
 * interest, controlling factions, notable NPCs. They are not axes themselves
 * (nothing depends on them) but they should still respect what the axes decided,
 * so a mountain-pass settlement stops listing a harbour.
 *
 * Unlike `resolveSmart`, this does not reproduce `pickRandomItems`' draw
 * sequence: a shuffle consumes one number per entry, this consumes one per pick.
 */
export function selectSmart(
  pool: OptionPool,
  count: number,
  ctx: ResolveContext,
  config: { bias?: Readonly<Record<Trait, number>> } = {},
  rng: Rng = defaultRng,
): SelectionResult {
  const relaxations: Relaxation[] = [];
  const options = expand(pool);
  if (count <= 0 || options.length === 0) return { values: [], relaxations };

  const available = narrow(options, ctx, "selection", relaxations, count);
  const bias = config.bias ?? {};
  let scored = available.map((option) => ({
    option,
    score: scoreOf(option, ctx, bias),
  }));
  if (scored.every((entry) => entry.score <= 0)) {
    relaxations.push({ axisId: "selection", dropped: "bias" });
    scored = available.map((option) => ({
      option,
      score: scoreOf(option, ctx, {}),
    }));
  }

  const values: string[] = [];
  const remaining = [...scored];
  while (values.length < count && remaining.length > 0) {
    const picked: SmartOption = weightedPick(remaining, rng);
    values.push(picked.value);
    remaining.splice(
      remaining.findIndex((entry) => entry.option === picked),
      1,
    );
  }

  return { values, relaxations };
}
