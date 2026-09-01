/**
 * The faction, nomad clan, vampire clan, and dark fantasy faction generator
 * smart schemas (#2531, #1136).
 *
 * Builds `SmartGeneratorSchema` definitions for:
 *   1. Standard Factions (genre-aware)
 *   2. Nomad Clans (Cyberpunk)
 *   3. Vampire Clans (Gothic Noir)
 *   4. Dark Fantasy / Grimdark Factions
 *
 * Each schema's declaration order encodes the causal chain:
 *   Faction: Type -> Scope -> Moral Posture -> Primary Goal -> Internal Conflict -> Immediate Hook
 *   Nomad Clan: Role -> Territory -> Tone -> Goal -> Conflict -> Hook
 *   Vampire Clan: Archetype -> Bloodline -> Scope -> Feeding Habit -> Weakness -> Moral Posture -> Dark Agenda -> Internal Conflict -> Hook
 *   Dark Fantasy Faction: Mode -> Type -> Scope -> Moral Posture -> Goal -> Conflict -> Hook
 */

import {
  factionConfig,
  nomadClanConfig,
  vampireConfig,
  darkFactionConfig,
  FACTION_BASE_MAP,
  FACTION_RESOURCE_MAP,
} from "./public-faction-constants";
import {
  FACTION_ALIGNMENT_TRAITS,
  FACTION_CONFLICT_TRAITS,
  FACTION_GOAL_TRAITS,
  FACTION_HOOK_TRAITS,
  FACTION_SCOPE_TRAITS,
  FACTION_TYPE_TRAITS,
  FACTION_RULES,
  FACTION_AFFINITIES,
  NOMAD_ROLE_TRAITS,
  NOMAD_TONE_TRAITS,
  NOMAD_TERRITORY_TRAITS,
  NOMAD_CONFLICT_TRAITS,
  NOMAD_GOAL_TRAITS,
  NOMAD_HOOK_TRAITS,
  NOMAD_CLAN_AFFINITIES,
  VAMPIRE_ARCHETYPE_TRAITS,
  VAMPIRE_BLOODLINE_TRAITS,
  VAMPIRE_FEEDING_TRAITS,
  VAMPIRE_WEAKNESS_TRAITS,
  VAMPIRE_SCOPE_TRAITS,
  VAMPIRE_ALIGNMENT_TRAITS,
  VAMPIRE_GOAL_TRAITS,
  VAMPIRE_CONFLICT_TRAITS,
  VAMPIRE_HOOK_TRAITS,
  VAMPIRE_AFFINITIES,
  FACTION_BASE_TRAITS,
  FACTION_RESOURCE_TRAITS,
  type FactionTrait,
} from "./public-faction-traits";
import type {
  SmartGeneratorSchema,
  SmartOption,
  SmartPredicate,
} from "./smart";
import { selectSmart } from "./smart";
import type { Rng } from "./random-utils";

function forTheme<T>(record: Record<string, T[]>, theme: string): T[] {
  return record[theme] ?? record["Classic Fantasy"];
}

function traitPredicate(
  traits: readonly FactionTrait[],
): SmartPredicate | undefined {
  if (traits.length === 0) return undefined;
  if (traits.length === 1) return { trait: traits[0] };
  return { any: traits.map((trait) => ({ trait })) };
}

function withRules(
  value: string,
  traits: readonly FactionTrait[],
  rules: readonly {
    trait: FactionTrait;
    requiresTraitOf?: readonly FactionTrait[];
    excludesTraitOf?: readonly FactionTrait[];
  }[],
  affinities: readonly {
    when: FactionTrait;
    favour: FactionTrait;
    multiplier: number;
  }[],
): SmartOption {
  const requires: FactionTrait[] = [];
  const excludes: FactionTrait[] = [];
  for (const rule of rules) {
    if (!traits.includes(rule.trait)) continue;
    requires.push(...(rule.requiresTraitOf ?? []));
    excludes.push(...(rule.excludesTraitOf ?? []));
  }

  const boosts: Record<string, number> = {};
  for (const affinity of affinities) {
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

function annotate(
  value: string,
  traitsFor: Readonly<Record<string, readonly FactionTrait[]>>,
  rules: readonly {
    trait: FactionTrait;
    requiresTraitOf?: readonly FactionTrait[];
    excludesTraitOf?: readonly FactionTrait[];
  }[] = [],
  affinities: readonly {
    when: FactionTrait;
    favour: FactionTrait;
    multiplier: number;
  }[] = [],
): SmartOption {
  return withRules(value, traitsFor[value] ?? [], rules, affinities);
}

// ---------------------------------------------------------------------------
// Standard Faction Schema
// ---------------------------------------------------------------------------

export function buildFactionSchema(): SmartGeneratorSchema {
  return {
    id: "faction",
    axes: [
      {
        id: "factionType",
        label: "Faction Type",
        pool: (ctx) =>
          forTheme(factionConfig.typesByTheme, ctx.genre).map((v) =>
            annotate(v, FACTION_TYPE_TRAITS, FACTION_RULES, FACTION_AFFINITIES),
          ),
      },
      {
        id: "scope",
        label: "Scope of Influence",
        pool: (ctx) =>
          forTheme(factionConfig.scopesByTheme, ctx.genre).map((v) =>
            annotate(
              v,
              FACTION_SCOPE_TRAITS,
              FACTION_RULES,
              FACTION_AFFINITIES,
            ),
          ),
      },
      {
        id: "alignment",
        label: "Moral Posture",
        pool: () =>
          factionConfig.alignments.map((v) =>
            annotate(
              v,
              FACTION_ALIGNMENT_TRAITS,
              FACTION_RULES,
              FACTION_AFFINITIES,
            ),
          ),
      },
      {
        id: "goal",
        label: "Primary Goal",
        pool: (ctx) =>
          forTheme(factionConfig.goalsByTheme, ctx.genre).map((v) =>
            annotate(v, FACTION_GOAL_TRAITS, FACTION_RULES, FACTION_AFFINITIES),
          ),
      },
      {
        id: "conflict",
        label: "Internal Conflict",
        pool: () =>
          factionConfig.conflicts.map((v) =>
            annotate(
              v,
              FACTION_CONFLICT_TRAITS,
              FACTION_RULES,
              FACTION_AFFINITIES,
            ),
          ),
      },
      {
        id: "hook",
        label: "Immediate Hook",
        pool: () =>
          factionConfig.hooks.map((v) =>
            annotate(v, FACTION_HOOK_TRAITS, FACTION_RULES, FACTION_AFFINITIES),
          ),
      },
    ],
  };
}

export const factionSchema = buildFactionSchema();

// ---------------------------------------------------------------------------
// Nomad Clan Schema
// ---------------------------------------------------------------------------

export function buildNomadClanSchema(): SmartGeneratorSchema {
  return {
    id: "nomad-clan",
    axes: [
      {
        id: "role",
        label: "Clan Role",
        pool: () =>
          nomadClanConfig.roles.map((v) =>
            annotate(v, NOMAD_ROLE_TRAITS, [], NOMAD_CLAN_AFFINITIES),
          ),
      },
      {
        id: "territory",
        label: "Territory",
        pool: () =>
          nomadClanConfig.territories.map((v) =>
            annotate(v, NOMAD_TERRITORY_TRAITS, [], NOMAD_CLAN_AFFINITIES),
          ),
      },
      {
        id: "tone",
        label: "Tone",
        pool: () =>
          nomadClanConfig.tones.map((v) =>
            annotate(v, NOMAD_TONE_TRAITS, [], NOMAD_CLAN_AFFINITIES),
          ),
      },
      {
        id: "goal",
        label: "Goal",
        pool: () =>
          nomadClanConfig.goals.map((v) =>
            annotate(v, NOMAD_GOAL_TRAITS, [], NOMAD_CLAN_AFFINITIES),
          ),
      },
      {
        id: "conflict",
        label: "Current Conflict",
        pool: () =>
          nomadClanConfig.conflicts.map((v) =>
            annotate(v, NOMAD_CONFLICT_TRAITS, [], NOMAD_CLAN_AFFINITIES),
          ),
      },
      {
        id: "hook",
        label: "Immediate Hook",
        pool: () =>
          nomadClanConfig.hooks.map((v) =>
            annotate(v, NOMAD_HOOK_TRAITS, [], NOMAD_CLAN_AFFINITIES),
          ),
      },
    ],
  };
}

export const nomadClanSchema = buildNomadClanSchema();

// ---------------------------------------------------------------------------
// Vampire Clan Schema
// ---------------------------------------------------------------------------

export function buildVampireSchema(): SmartGeneratorSchema {
  return {
    id: "vampire-clan",
    axes: [
      {
        id: "archetype",
        label: "Clan Archetype",
        pool: () =>
          vampireConfig.archetypes.map((v) =>
            annotate(v, VAMPIRE_ARCHETYPE_TRAITS, [], VAMPIRE_AFFINITIES),
          ),
      },
      {
        id: "bloodline",
        label: "Bloodline",
        pool: () =>
          vampireConfig.bloodlines.map((v) =>
            annotate(v, VAMPIRE_BLOODLINE_TRAITS, [], VAMPIRE_AFFINITIES),
          ),
      },
      {
        id: "scope",
        label: "Scope of Influence",
        pool: () =>
          vampireConfig.scopes.map((v) =>
            annotate(v, VAMPIRE_SCOPE_TRAITS, [], VAMPIRE_AFFINITIES),
          ),
      },
      {
        id: "feedingHabit",
        label: "Feeding Habit",
        pool: () =>
          vampireConfig.feedingHabits.map((v) =>
            annotate(v, VAMPIRE_FEEDING_TRAITS, [], VAMPIRE_AFFINITIES),
          ),
      },
      {
        id: "weakness",
        label: "Clan Weakness",
        pool: () =>
          vampireConfig.weaknesses.map((v) =>
            annotate(v, VAMPIRE_WEAKNESS_TRAITS, [], VAMPIRE_AFFINITIES),
          ),
      },
      {
        id: "alignment",
        label: "Moral Posture",
        pool: () =>
          vampireConfig.alignments.map((v) =>
            annotate(v, VAMPIRE_ALIGNMENT_TRAITS, [], VAMPIRE_AFFINITIES),
          ),
      },
      {
        id: "goal",
        label: "Dark Agenda",
        pool: () =>
          vampireConfig.goals.map((v) =>
            annotate(v, VAMPIRE_GOAL_TRAITS, [], VAMPIRE_AFFINITIES),
          ),
      },
      {
        id: "conflict",
        label: "Internal Conflict",
        pool: () =>
          vampireConfig.conflicts.map((v) =>
            annotate(v, VAMPIRE_CONFLICT_TRAITS, [], VAMPIRE_AFFINITIES),
          ),
      },
      {
        id: "hook",
        label: "Adventure Hook",
        pool: () =>
          vampireConfig.hooks.map((v) =>
            annotate(v, VAMPIRE_HOOK_TRAITS, [], VAMPIRE_AFFINITIES),
          ),
      },
    ],
  };
}

export const vampireSchema = buildVampireSchema();

// ---------------------------------------------------------------------------
// Dark Fantasy / Grimdark Faction Schema (#1136)
// ---------------------------------------------------------------------------

/**
 * Bare-string pools throughout: a `string[]` is already a valid `OptionPool`
 * (see smart/types.ts), so this reproduces flat, uniform randomness with no
 * cross-axis trait correlation — the documented zero-config default, and
 * appropriate here since these axes (mode/type/scope/posture) don't need the
 * weighted-affinity machinery the older faction/vampire/nomad schemas use.
 */
export function buildDarkFactionSchema(): SmartGeneratorSchema {
  return {
    id: "dark-fantasy-faction",
    axes: [
      {
        id: "mode",
        label: "Dark Fantasy Mode",
        pool: () => darkFactionConfig.modes,
      },
      {
        id: "factionType",
        label: "Faction Type",
        pool: () => darkFactionConfig.types,
      },
      {
        id: "scope",
        label: "Operating Scope",
        pool: () => darkFactionConfig.scopes,
      },
      {
        id: "moralPosture",
        label: "Moral Posture",
        pool: () => darkFactionConfig.moralPostures,
      },
      {
        id: "goal",
        label: "Primary Goal",
        pool: () => darkFactionConfig.goals,
      },
      {
        id: "conflict",
        label: "Internal Conflict",
        pool: () => darkFactionConfig.conflicts,
      },
      {
        id: "hook",
        label: "Immediate Hook",
        pool: () => darkFactionConfig.hooks,
      },
    ],
  };
}

export const darkFactionSchema = buildDarkFactionSchema();

// ---------------------------------------------------------------------------
// Base & Resource Smart Selection
// ---------------------------------------------------------------------------

export function selectSmartFactionBase(
  factionType: string,
  resolvedTraits: readonly string[],
  rng: Rng,
): string {
  const options = FACTION_BASE_MAP[factionType] ?? [
    "A neutral facility whose access is controlled and whose records are not shared",
    "A licensed premises that provides cover for activities conducted elsewhere",
    "A distributed network of locations with no single point of failure",
  ];
  const annotatedPool = options.map((v) =>
    annotate(v, FACTION_BASE_TRAITS, [], FACTION_AFFINITIES),
  );
  const result = selectSmart(
    annotatedPool,
    1,
    {
      genre: "Classic Fantasy",
      traits: resolvedTraits,
      values: { factionType },
    },
    {},
    rng,
  );
  return result.values[0] ?? options[0];
}

export function selectSmartFactionResource(
  factionType: string,
  resolvedTraits: readonly string[],
  rng: Rng,
): string {
  const options = FACTION_RESOURCE_MAP[factionType] ?? [
    "Specialised knowledge or access that no other group in the region controls",
    "A network of obligations, debts, and dependencies too entangled to cut cleanly",
    "Control of a single critical resource that everyone else needs to function",
  ];
  const annotatedPool = options.map((v) =>
    annotate(v, FACTION_RESOURCE_TRAITS, [], FACTION_AFFINITIES),
  );
  const result = selectSmart(
    annotatedPool,
    1,
    {
      genre: "Classic Fantasy",
      traits: resolvedTraits,
      values: { factionType },
    },
    {},
    rng,
  );
  return result.values[0] ?? options[0];
}
