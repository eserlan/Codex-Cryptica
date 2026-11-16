import { z } from "zod";
import {
  CURRENT_HISTORICAL_ANCHOR_VERSION,
  MAX_HISTORICAL_CAUSAL_REFS,
  MAX_HISTORICAL_DOCUMENTED_FACTS,
  MAX_HISTORICAL_DRIFT_CHANGES,
  MAX_HISTORICAL_ENTITY_REFS,
  MAX_HISTORICAL_OPEN_MECHANISMS,
  type HistoricalAnchor,
} from "./historical-anchor-types";

const MAX_TEXT_CHARS = 600;
const id = z.string().trim().min(1).max(160);
const text = z.string().trim().min(1).max(MAX_TEXT_CHARS);
const timestamp = z.string().datetime({ offset: true });

export const historicalAnchorPolicySchema = z.enum([
  "preserve",
  "alternate",
  "discover",
]);

export const adventureCalendarDateSchema = z
  .object({
    year: z.number().int().finite(),
    month: z.number().int().min(1).optional(),
    day: z.number().int().min(1).optional(),
    precision: z.enum(["year", "unit", "day", "anchor"]).optional(),
    unitId: id.optional(),
    anchorId: id.optional(),
    calendarRevision: z.number().int().positive().optional(),
    label: z.string().max(MAX_TEXT_CHARS).optional(),
  })
  .strict();

export const historicalDateIntervalSchema = z
  .object({
    start: adventureCalendarDateSchema,
    end: adventureCalendarDateSchema.optional(),
    approximate: z.boolean().optional(),
    label: z.string().max(MAX_TEXT_CHARS).optional(),
  })
  .strict();

export const historicalAnchorCausalRefSchema = z
  .object({
    kind: z.enum(["setup", "turn", "world-time", "scenario-event", "manual"]),
    refId: id,
    atMinute: z.number().int().nonnegative().optional(),
    summary: text.optional(),
  })
  .strict();

export const historicalAnchorDocumentedFactSchema = z
  .object({
    id,
    text,
  })
  .strict();

export const historicalAnchorEntityRefSchema = z
  .object({
    recordId: id,
    recordType: text.optional(),
    displayName: text,
    role: text.optional(),
  })
  .strict();

export const historicalAnchorBaselineSchema = z
  .object({
    title: text,
    contentFingerprint: id,
    capturedAt: timestamp,
    calendarRevision: z.number().int().positive(),
    documentedFacts: z
      .array(historicalAnchorDocumentedFactSchema)
      .max(MAX_HISTORICAL_DOCUMENTED_FACTS),
    openMechanisms: z.array(id).max(MAX_HISTORICAL_OPEN_MECHANISMS),
    relevantEntityRefs: z
      .array(historicalAnchorEntityRefSchema)
      .max(MAX_HISTORICAL_ENTITY_REFS),
  })
  .strict();

export const historicalAnchorProgressSchema = z
  .object({
    status: z.enum([
      "upcoming",
      "approaching",
      "reached",
      "diverged",
      "unresolved",
    ]),
    updatedAtRevision: z.number().int().nonnegative(),
    updatedAt: timestamp,
    causalRefs: z
      .array(historicalAnchorCausalRefSchema)
      .max(MAX_HISTORICAL_CAUSAL_REFS),
    reason: text.optional(),
  })
  .strict();

export const historicalAnchorDriftSchema = z
  .object({
    status: z.enum(["clean", "vault-modified", "vault-missing"]),
    rebaseDecisionRequired: z.boolean(),
    detectedAt: timestamp.optional(),
    currentFingerprint: id.optional(),
    changes: z.array(text).max(MAX_HISTORICAL_DRIFT_CHANGES).optional(),
  })
  .strict();

export const historicalAnchorSchema = z
  .object({
    version: z.literal(CURRENT_HISTORICAL_ANCHOR_VERSION),
    policy: historicalAnchorPolicySchema,
    eventRecordId: id,
    eventInterval: historicalDateIntervalSchema,
    startDate: adventureCalendarDateSchema,
    baseline: historicalAnchorBaselineSchema,
    revealedFactIds: z
      .array(id)
      .max(MAX_HISTORICAL_DOCUMENTED_FACTS + 1)
      .default([]),
    progress: historicalAnchorProgressSchema,
    drift: historicalAnchorDriftSchema,
  })
  .strict();

type RawHistoricalAnchor = Record<string, unknown>;
type HistoricalAnchorMigration = (
  anchor: RawHistoricalAnchor,
) => RawHistoricalAnchor;

const anchorMigrations: Record<number, HistoricalAnchorMigration> = {};

/**
 * Upgrades a historical anchor document without mutating the input.
 * Rejects unknown future versions with `"incompatible-version"`.
 */
export function migrateHistoricalAnchor(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid-historical-anchor");
  }
  let anchor = structuredClone(input) as RawHistoricalAnchor;
  const initialVersion = anchor.version;
  if (
    typeof initialVersion !== "number" ||
    !Number.isInteger(initialVersion) ||
    initialVersion < 1
  ) {
    throw new Error("invalid-historical-anchor-version");
  }
  let version = initialVersion;
  while (version < CURRENT_HISTORICAL_ANCHOR_VERSION) {
    const migrate = anchorMigrations[version];
    if (!migrate) throw new Error("incompatible-version");
    anchor = migrate(anchor);
    const migratedVersion = anchor.version;
    if (
      typeof migratedVersion !== "number" ||
      !Number.isInteger(migratedVersion)
    ) {
      throw new Error("incompatible-version");
    }
    version = migratedVersion;
  }
  if (version !== CURRENT_HISTORICAL_ANCHOR_VERSION) {
    throw new Error("incompatible-version");
  }
  return anchor;
}

export function parseHistoricalAnchor(input: unknown): HistoricalAnchor {
  return historicalAnchorSchema.parse(
    migrateHistoricalAnchor(input),
  ) as HistoricalAnchor;
}
