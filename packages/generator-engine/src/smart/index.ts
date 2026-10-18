/**
 * Smart deterministic generator framework (#2337).
 *
 * Declarative option pools with weights, semantic traits, dependencies and
 * exclusions, resolved locally with no model involved. Bare `string[]` pools
 * stay valid, so a generator can adopt this one axis at a time.
 */
export { resolveSmart, validateSchema } from "./resolve";
export { evaluate, referencedAxes } from "./predicates";
export { selectSmart, type SelectionResult } from "./select";
export { applyPreset, presetsFor, type SmartPreset } from "./presets";
export {
  BASE_LEXICON,
  mergeLexicons,
  type Lexicon,
  type LexiconEntry,
} from "./lexicon";
export {
  analyseIntent,
  applyIntent,
  intentBias,
  defaultAnalyzer,
  type AppliedIntent,
  type InferredChoice,
  type IntentSignal,
  type TextAnalyzer,
} from "./semantic";
export type {
  SmartAxis,
  SmartGeneratorConfig,
  LockedValue,
  OptionPool,
  SmartPredicate,
  Provenance,
  Relaxation,
  RelaxationKind,
  ResolveContext,
  ResolvedAxis,
  SmartGeneratorSchema,
  SmartOption,
  SmartResult,
  Trait,
} from "./types";
