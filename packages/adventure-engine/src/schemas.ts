/** Compatibility exports for adventure validation and durable session loading. */
export { MAX_TEXT_CHARS } from "./schema-primitives";
export {
  MAX_PACKAGE_PROGRESS_ENTRIES,
  MAX_ACTOR_REMEMBERED_FACTS,
  MAX_ACTOR_FACT_CHARS,
} from "./package-progress-schemas";
export { visiblePatchSchema, hiddenPatchSchema } from "./state-schemas";
export {
  MAX_STORY_SO_FAR_CHARS,
  MAX_OOC_EXCHANGES,
  CURRENT_ADVENTURE_SCHEMA_VERSION,
  adventureSessionSchema,
} from "./session-schema";
export { MAX_PLACES, MAX_PLACE_ALIASES } from "./place-schemas";
export {
  turnProposalSchema,
  parseTurnProposal,
  generationMetadataSchema,
} from "./turn-schemas";

export { scenarioEventSchema } from "./scenario-schemas";
export { migrateAdventureSession } from "./session-migration";
export {
  parseAdventureSession,
  parseAdventureSessionForRecovery,
  type AdventureSessionReadResult,
} from "./session-reader";
export {
  MAX_SERIALIZED_STATE_CHARS,
  MAX_GENERATION_INPUT_CHARS,
  validateStateBudget,
  validateGenerationBudget,
} from "./session-budget";
export type {
  VisibleStatePatch as SchemaVisiblePatch,
  HiddenStatePatch as SchemaHiddenPatch,
  SuppliedRollOutcome as SchemaOutcome,
  OutcomeBand as SchemaOutcomeBand,
  ProvisionalFact as SchemaProvisionalFact,
  ResolvedRollSnapshot as SchemaResolvedRoll,
  DicePreset as SchemaDicePreset,
  ResourceCounter as SchemaResourceCounter,
} from "./types";
