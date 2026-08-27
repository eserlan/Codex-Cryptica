/**
 * The settlement generator's smart schema (#2341).
 *
 * Builds a `SmartGeneratorSchema` from the existing `settlementConfig` tables
 * plus the trait annotations, so the option content stays in one place and the
 * rules stay in another. Axis order is the interesting part: each axis can only
 * depend on the ones before it, so the order encodes what causes what.
 *
 *   environment -> primaryFunction -> authority -> tone -> tension -> size
 *
 * A settlement exists somewhere, which shapes what it is for, which shapes who
 * ends up running it, which colours how it feels and what is going wrong.
 */

import { settlementConfig } from "./public-settlement-constants";
import {
  AUTHORITY_TRAITS,
  ENVIRONMENT_TRAITS,
  FUNCTION_TRAITS,
  SETTLEMENT_AFFINITIES,
  SETTLEMENT_RULES,
  TENSION_TRAITS,
  TONE_TRAITS,
  type SettlementTrait,
} from "./public-settlement-traits";
import type {
  SmartAxis,
  SmartGeneratorSchema,
  SmartOption,
  SmartPredicate,
} from "./smart";

function forGenre<T>(record: Record<string, T[]>, genre: string): T[] {
  return record[genre] ?? record["Fantasy"];
}

function traitPredicate(
  traits: readonly SettlementTrait[],
): SmartPredicate | undefined {
  if (traits.length === 0) return undefined;
  if (traits.length === 1) return { trait: traits[0] };
  return { any: traits.map((trait) => ({ trait })) };
}

/** Turn a plain option value into a rule-carrying option. */
function annotate(
  value: string,
  traitsFor: Readonly<Record<string, readonly SettlementTrait[]>>,
): SmartOption {
  const traits = traitsFor[value] ?? [];

  const requires: SettlementTrait[] = [];
  const excludes: SettlementTrait[] = [];
  for (const rule of SETTLEMENT_RULES) {
    if (!traits.includes(rule.trait)) continue;
    requires.push(...(rule.requiresTraitOf ?? []));
    excludes.push(...(rule.excludesTraitOf ?? []));
  }

  const boosts: Record<string, number> = {};
  for (const affinity of SETTLEMENT_AFFINITIES) {
    if (traits.includes(affinity.favour)) {
      boosts[affinity.when] = affinity.multiplier;
    }
  }

  return {
    value,
    traits,
    requires: traitPredicate(requires),
    excludes: traitPredicate(excludes),
    boosts: Object.keys(boosts).length > 0 ? boosts : undefined,
  };
}

function axisFrom(
  id: string,
  label: string,
  pools: Record<string, string[]>,
  traitsFor: Readonly<Record<string, readonly SettlementTrait[]>>,
): SmartAxis {
  return {
    id,
    label,
    pool: (ctx) =>
      forGenre(pools, ctx.genre).map((v) => annotate(v, traitsFor)),
  };
}

/** Scale traits come from position in the genre's own ladder, not the name. */
const SIZE_LADDER: readonly SettlementTrait[] = [
  "tiny",
  "small",
  "medium",
  "large",
];

function sizeTraits(index: number, count: number): readonly SettlementTrait[] {
  if (count <= 1) return ["medium"];
  const step = Math.round((index * (SIZE_LADDER.length - 1)) / (count - 1));
  return [SIZE_LADDER[step]];
}

const sizeAxis: SmartAxis = {
  id: "size",
  label: "Scale",
  pool: (ctx) => {
    const sizes = forGenre(settlementConfig.sizesByGenre, ctx.genre);
    return sizes.map((size, index) => ({
      value: size.name,
      traits: sizeTraits(index, sizes.length),
    }));
  },
};

export function buildSettlementSchema(): SmartGeneratorSchema {
  return {
    id: "settlement",
    axes: [
      axisFrom(
        "environment",
        "Environment",
        settlementConfig.environmentsByGenre,
        ENVIRONMENT_TRAITS,
      ),
      axisFrom(
        "primaryFunction",
        "Primary Function",
        settlementConfig.primaryFunctionsByGenre,
        FUNCTION_TRAITS,
      ),
      axisFrom(
        "authorityType",
        "Official Authority",
        settlementConfig.authorityTypesByGenre,
        AUTHORITY_TRAITS,
      ),
      axisFrom("tone", "Tone", settlementConfig.tonesByGenre, TONE_TRAITS),
      axisFrom(
        "mainTension",
        "Dominant Tension",
        settlementConfig.mainTensionsByGenre,
        TENSION_TRAITS,
      ),
      sizeAxis,
    ],
  };
}

/** Stable instance: the schema reads genre from the resolve context, not a closure. */
export const settlementSchema = buildSettlementSchema();
