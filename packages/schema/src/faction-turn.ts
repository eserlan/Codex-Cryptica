import { z } from "zod";

/**
 * Faction Turn schemas (feature 161).
 *
 * Every field is optional or defaulted and the whole block hangs off
 * `EntitySchema.factionTurn` as an optional property, so vaults written before
 * this feature parse unchanged. That is what makes FR-002 / SC-008 ("a faction
 * that has not opted in is indistinguishable from today") true by construction,
 * and why no IndexedDB version bump is required.
 */

/**
 * The four roles actions use to refer to a faction's stats (FR-004).
 *
 * Each maps to a **stat sheet field id**, never a label, so a GM renaming
 * "Influence" to "Political Reach" never breaks a mapping (FR-004a). A role no
 * action uses may be left unmapped; Influence needs only `influence` and, when
 * the target is itself turn-enabled, the target's `stability`.
 */
export const FactionStatRolesSchema = z.object({
  power: z.string().optional(),
  influence: z.string().optional(),
  resources: z.string().optional(),
  stability: z.string().optional(),
});

export type FactionStatRoles = z.infer<typeof FactionStatRolesSchema>;

export const FACTION_STAT_ROLES = [
  "power",
  "influence",
  "resources",
  "stability",
] as const;

export type FactionStatRole = (typeof FACTION_STAT_ROLES)[number];

/**
 * A resolved point in world time, captured at commit.
 *
 * Mirrors what `resolveCalendarCurrentDate()` returns so no conversion is
 * needed. `day` is absent when the date came from the vault-setting tier, which
 * is year-only. `calendarRevision` lets history notice a reconfigured calendar
 * and render the entry as undated rather than mis-dating it.
 */
export const WorldDateStampSchema = z.object({
  year: z.number(),
  month: z.number(),
  day: z.number().optional(),
  calendarRevision: z.number(),
});

export type WorldDateStamp = z.infer<typeof WorldDateStampSchema>;

/** The five ordered outcome bands (FR-017). Order is load-bearing: the permitted
 * range in FR-021a and the monotonicity guarantee in FR-017b both index into it. */
export const OUTCOME_BANDS = [
  "decisive-success",
  "success",
  "mixed",
  "failure",
  "backfire",
] as const;

export const OutcomeBandIdSchema = z.enum(OUTCOME_BANDS);

export type OutcomeBandId = z.infer<typeof OutcomeBandIdSchema>;

/** Which tier of FR-020 supplied the opposing value. Displayed, not just stored. */
export const OppositionSourceSchema = z.enum([
  "faction-stability",
  "existing-hold",
  "baseline",
]);

export type OppositionSource = z.infer<typeof OppositionSourceSchema>;

/**
 * One reversible mutation. Forward and inverse lists use the same shape, so undo
 * is simply "apply the inverse list" (FR-027, FR-028).
 */
export const FactionTurnChangeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("stat-value"),
    fieldId: z.string(),
    from: z.number(),
    to: z.number(),
    clamped: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("connection-strength"),
    targetId: z.string(),
    /** `null` means no edge existed; the inverse of that removes the edge. */
    from: z.number().nullable(),
    to: z.number(),
    clamped: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("connection-created"),
    targetId: z.string(),
    type: z.string(),
  }),
  z.object({
    kind: z.literal("connection-removed"),
    targetId: z.string(),
  }),
  z.object({
    // Only ever produced when the GM explicitly opts in (FR-032b).
    kind: z.literal("connection-type"),
    targetId: z.string(),
    from: z.string(),
    to: z.string(),
  }),
]);

export type FactionTurnChange = z.infer<typeof FactionTurnChangeSchema>;

/** A single die result, mirroring dice-engine's `PartResult` shape loosely enough
 * that a `RollResult` can be stored without importing that package into schema. */
export const FactionRollSnapshotSchema = z.object({
  formula: z.string(),
  total: z.number(),
  dice: z.array(z.number()).default([]),
  /**
   * The opposing side's roll. Influence is resolved as an *opposed* roll —
   * both sides roll, and the margin decides the band. Rolling for only one
   * side skews every matchup toward whoever rolled: an evenly matched pair
   * would succeed essentially always.
   */
  opposingTotal: z.number().optional(),
  opposingDice: z.array(z.number()).optional(),
});

export type FactionRollSnapshot = z.infer<typeof FactionRollSnapshotSchema>;

/**
 * Everything needed to explain an outcome forever (FR-018, FR-035a).
 *
 * Retained in full on every history entry and never trimmed (FR-041), so a turn
 * from the first session of a campaign is still explainable years later.
 */
export const FactionResolutionSchema = z.object({
  actingRole: z.literal("influence"),
  actingFieldId: z.string(),
  /** Snapshot of the GM's stat name at resolution time, so a later rename does
   * not retroactively reinterpret old history. */
  actingLabel: z.string(),
  actingValue: z.number(),
  opposingValue: z.number(),
  oppositionSource: OppositionSourceSchema,
  oppositionDetail: z.string(),
  modifiers: z
    .array(z.object({ label: z.string(), value: z.number() }))
    .default([]),
  /** `null` in no-randomness mode (FR-019). */
  roll: FactionRollSnapshotSchema.nullable(),
  total: z.number(),
  /** Always computed, even when AI later moves the band (FR-021a). */
  mechanicalBand: OutcomeBandIdSchema,
  /** At most one band either side of `mechanicalBand` (FR-021a). */
  permittedBands: z.array(OutcomeBandIdSchema),
  /** Equals `mechanicalBand` whenever AI did not act. */
  finalBand: OutcomeBandIdSchema,
  aiUsed: z.boolean().default(false),
  /** Present only when AI moved the band (FR-021b, FR-035a). */
  aiReason: z.string().optional(),
});

export type FactionResolution = z.infer<typeof FactionResolutionSchema>;

/**
 * A committed turn as it appears in history (FR-035).
 *
 * `targetTitle` is snapshotted so the entry stays readable after the target is
 * deleted (FR-040). `undone` marks rather than deletes (FR-029).
 */
export const FactionTurnRecordSchema = z.object({
  id: z.string(),
  worldDate: WorldDateStampSchema,
  /** Epoch ms of the real-world commit, for stable ordering within a world date. */
  committedAt: z.number(),
  action: z.literal("influence"),
  targetId: z.string(),
  targetTitle: z.string(),
  resolution: FactionResolutionSchema,
  changes: z.array(FactionTurnChangeSchema).default([]),
  inverse: z.array(FactionTurnChangeSchema).default([]),
  narrative: z.string().default(""),
  narrativeSource: z.enum(["ai", "template"]).default("template"),
  /** The pacing rule was overridden for this turn (FR-013). */
  isOverride: z.boolean().default(false),
  undone: z.boolean().default(false),
  /** Set when the GM promoted this turn into an event entity (FR-039). */
  promotedEventId: z.string().optional(),
});

export type FactionTurnRecord = z.infer<typeof FactionTurnRecordSchema>;

/**
 * The opt-in block itself. Absent entirely on factions that never opted in.
 *
 * `lastTurnDate` tracks the most recent turn **not undone**, and is recomputed
 * whenever a turn is reversed (FR-010).
 */
export const FactionTurnStateSchema = z.object({
  enabled: z.boolean().default(false),
  statRoles: FactionStatRolesSchema.default({}),
  lastTurnDate: WorldDateStampSchema.optional(),
  history: z.array(FactionTurnRecordSchema).default([]),
});

export type FactionTurnState = z.infer<typeof FactionTurnStateSchema>;

/** Per-vault settings. Stored beside the calendar settings, not on any entity. */
export const FactionTurnSettingsSchema = z.object({
  turnIntervalUnit: z.enum(["year", "month"]).default("month"),
  turnIntervalAmount: z.number().min(1).default(1),
  useRandomness: z.boolean().default(true),
  /** Independently switchable from narration (FR-021f). */
  aiBandSelection: z.boolean().default(true),
  aiNarration: z.boolean().default(true),
  /**
   * Off by default: a GM must explicitly choose to send more than the short
   * participant summaries needed for ordinary AI turn narration.
   */
  includeParticipantLore: z.boolean().default(false),
  /** Opposition for a target no faction holds (FR-020c). */
  baselineOpposition: z.number().default(5),
});

export type FactionTurnSettings = z.infer<typeof FactionTurnSettingsSchema>;

export const DEFAULT_FACTION_TURN_SETTINGS: FactionTurnSettings =
  FactionTurnSettingsSchema.parse({});
