/**
 * Shared model for "smart" deterministic generators (#2337).
 *
 * Today every local generator resolves its options with a flat
 * `pickFrom(pool, rng)` per axis, so nothing a generator picks can influence
 * anything else it picks. This module keeps that behaviour as the zero-config
 * default and adds the pieces the flat version cannot express: weights, semantic
 * traits, dependencies between axes, and exclusions.
 *
 * Nothing here talks to a model. The semantic layer (#2338) writes into
 * `SmartGeneratorConfig`; this model only decides what a configured generator draws.
 */

/**
 * A semantic descriptor attached to an option, e.g. `"coastal"`, `"wealthy"`.
 *
 * Internal vocabulary only. Per constitution principle XII, "Labels" stays
 * reserved for the user-facing entity labels that `PublicGeneratorOutput.labels`
 * already carries, so this concept is called a trait everywhere in code and is
 * never surfaced to users under either name.
 */
export type Trait = string;

/** A declarative condition evaluated against the axes resolved so far. */
export type SmartPredicate =
  /** The named axis resolved to one of these values. */
  | { axis: string; anyOf: readonly string[] }
  /** This trait is present on an already-resolved option. */
  | { trait: Trait }
  | { not: SmartPredicate }
  | { all: readonly SmartPredicate[] }
  | { any: readonly SmartPredicate[] };

/** One entry in an option pool, with everything except `value` optional. */
export interface SmartOption<T extends string = string> {
  value: T;
  /** Relative draw weight. Defaults to 1, which reproduces flat randomness. */
  weight?: number;
  /** Semantic descriptors used for dependencies and free-text matching. */
  traits?: readonly Trait[];
  /** The option is unavailable unless this holds. */
  requires?: SmartPredicate;
  /** The option is unavailable if this holds. */
  excludes?: SmartPredicate;
  /** Weight multipliers applied when an already-resolved trait is present. */
  boosts?: Readonly<Record<Trait, number>>;
}

/**
 * A pool accepts bare strings so an existing `string[]` table is already a valid
 * pool and can gain traits one entry at a time.
 */
export type OptionPool<T extends string = string> = readonly (
  T | SmartOption<T>
)[];

/** What an axis can see while it is being resolved. */
export interface ResolveContext {
  genre: string;
  /** Axis id to resolved value, for axes earlier in the declaration order. */
  values: Readonly<Record<string, string>>;
  /** Union of the traits carried by the options resolved so far. */
  traits: readonly Trait[];
}

export interface SmartAxis<T extends string = string> {
  id: string;
  /** Plain-language name, reused by the chips UI (#2339). */
  label: string;
  /** Genre-aware and conditional: may read `ctx.values` for earlier axes. */
  pool: (ctx: ResolveContext) => OptionPool<T>;
}

export interface SmartGeneratorSchema {
  id: string;
  /** Declaration order is resolution order: an axis may only depend on earlier ones. */
  axes: readonly SmartAxis[];
}

/** Where a resolved value came from. Drives the chip styling in #2339. */
export type Provenance = "manual" | "preset" | "inferred" | "random";

export interface LockedValue {
  value: string;
  source: Exclude<Provenance, "random">;
}

export interface SmartGeneratorConfig {
  genre?: string;
  /** Axes pinned by the user, a preset, or the semantic layer. */
  locked?: Readonly<Record<string, LockedValue>>;
  /**
   * Soft weight multipliers per trait. Above 1 favours, below 1 discourages,
   * and 0 suppresses an option entirely (used for negated free-text intent).
   */
  bias?: Readonly<Record<Trait, number>>;
}

export interface ResolvedAxis {
  axisId: string;
  label: string;
  value: string;
  source: Provenance;
  traits: readonly Trait[];
}

/** Which class of constraint had to be given up to keep an axis resolvable. */
export type RelaxationKind = "bias" | "excludes" | "requires";

export interface Relaxation {
  axisId: string;
  dropped: RelaxationKind;
}

export interface SmartResult {
  /** Axis id to resolved value, the shape the existing generators consume. */
  values: Record<string, string>;
  axes: ResolvedAxis[];
  /** Union of every resolved option's traits, for `selectSmart` on derived lists. */
  traits: Trait[];
  /** Empty when every constraint held, which is the expected case. */
  relaxations: Relaxation[];
}
