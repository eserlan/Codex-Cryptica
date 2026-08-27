import { type Rng, defaultRng } from "../random-utils";
import { referencedAxes } from "./predicates";
import { expand, narrow, scoreOf, weightedPick } from "./scoring";
import type {
  SmartAxis,
  SmartGeneratorConfig,
  Relaxation,
  ResolveContext,
  ResolvedAxis,
  SmartGeneratorSchema,
  SmartResult,
  Trait,
} from "./types";

/**
 * Resolve every axis of a schema in declaration order, so each axis can depend
 * on the ones before it. Locked values (manual, preset or inferred) are taken
 * verbatim and never consume the rng.
 */
export function resolveSmart(
  schema: SmartGeneratorSchema,
  config: SmartGeneratorConfig = {},
  rng: Rng = defaultRng,
): SmartResult {
  const bias = config.bias ?? {};
  const values: Record<string, string> = {};
  const traits: Trait[] = [];
  const axes: ResolvedAxis[] = [];
  const relaxations: Relaxation[] = [];

  for (const axis of schema.axes) {
    const ctx: ResolveContext = {
      genre: config.genre ?? "",
      values,
      traits,
    };
    const options = expand(axis.pool(ctx));
    const locked = config.locked?.[axis.id];

    if (locked) {
      // A custom value the user typed will not be in the pool; it simply
      // carries no traits, which is the honest answer.
      const match = options.find((o) => o.value === locked.value);
      record(axis, locked.value, locked.source, match?.traits ?? []);
      continue;
    }

    if (options.length === 0) {
      throw new Error(
        `Smart generator "${schema.id}" has no options for axis "${axis.id}".`,
      );
    }

    const pool = narrow(options, ctx, axis.id, relaxations);
    let scored = pool.map((option) => ({
      option,
      score: scoreOf(option, ctx, bias),
    }));
    if (scored.every((entry) => entry.score <= 0)) {
      // The bias alone emptied the pool, e.g. every option carries a trait the
      // description negated. Drop the bias rather than the axis.
      relaxations.push({ axisId: axis.id, dropped: "bias" });
      scored = pool.map((option) => ({
        option,
        score: scoreOf(option, ctx, {}),
      }));
    }

    const picked = weightedPick(scored, rng);
    record(axis, picked.value, "random", picked.traits ?? []);
  }

  function record(
    axis: SmartAxis,
    value: string,
    source: ResolvedAxis["source"],
    optionTraits: readonly Trait[],
  ): void {
    values[axis.id] = value;
    traits.push(...optionTraits);
    axes.push({
      axisId: axis.id,
      label: axis.label,
      value,
      source,
      traits: optionTraits,
    });
  }

  return { values, axes, traits: [...new Set(traits)], relaxations };
}

/**
 * Dev-time lint for a schema's rules. Predicates may only read axes that resolve
 * earlier, since a forward reference silently evaluates to false and quietly
 * removes an option from every draw.
 *
 * Pools are sampled with an empty context, so a conditional pool is only checked
 * for the branch it returns by default. That is enough to catch the ordering
 * mistakes this is for.
 */
export function validateSchema(schema: SmartGeneratorSchema): string[] {
  const problems: string[] = [];
  const order = new Map(schema.axes.map((axis, index) => [axis.id, index]));

  schema.axes.forEach((axis, index) => {
    const options = expand(axis.pool({ genre: "", values: {}, traits: [] }));
    for (const option of options) {
      const predicates = [option.requires, option.excludes].filter(
        (p) => p !== undefined,
      );
      for (const predicate of predicates) {
        for (const referenced of referencedAxes(predicate)) {
          const referencedIndex = order.get(referenced);
          if (referencedIndex === undefined) {
            problems.push(
              `Axis "${axis.id}" option "${option.value}" references axis "${referenced}", which the schema does not define.`,
            );
          } else if (referencedIndex >= index) {
            problems.push(
              `Axis "${axis.id}" option "${option.value}" references axis "${referenced}", which resolves later.`,
            );
          }
        }
      }
    }
  });

  return problems;
}
