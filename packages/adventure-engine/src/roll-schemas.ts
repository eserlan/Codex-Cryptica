import { z } from "zod";
import {
  id,
  text,
  narration,
  timestamp,
  MAX_TEXT_CHARS,
} from "./schema-primitives";

const rollTracePartSchema = z.object({
  type: z.enum(["dice", "modifier"]),
  value: z.number().finite(),
  sides: z.number().int().positive().optional(),
  rolls: z.array(z.number().finite()).max(200).optional(),
  dropped: z.array(z.number().finite()).max(200).optional(),
});

export const outcomeSchema = z.object({
  kind: z.enum(["narrative", "numeric"]),
  value: z.union([z.string().max(MAX_TEXT_CHARS), z.number().finite()]),
  label: text.optional(),
  // The rolled dice behind `value`, when there was a real roll (#3443).
  parts: z.array(rollTracePartSchema).max(50).optional(),
});

export const bandSchema = z.object({
  id,
  label: text,
  minimum: z.number().finite().optional(),
  maximum: z.number().finite().optional(),
});

export const resolvedRollSchema = z.object({
  expression: text.optional(),
  bands: z.array(bandSchema).min(1).max(12).optional(),
  outcome: outcomeSchema,
});

export const dicePresetSchema = z.object({
  id,
  label: text,
  expression: text,
  createdAt: timestamp,
});

export const pendingRollSchema = z.object({
  id,
  inputId: id,
  // Opening rolls have no player action yet; action-turn rolls still carry it.
  playerAction: z.string().max(MAX_TEXT_CHARS),
  setupNarration: narration.optional(),
  uncertainty: text,
  stakes: text,
  dice: z
    .object({ expression: text, bands: z.array(bandSchema).min(1).max(12) })
    .optional(),
  resolutionStatus: z.enum(["awaiting-outcome", "ready-to-resolve"]),
  suppliedOutcome: outcomeSchema.optional(),
  createdAt: timestamp,
  outcomeRecordedAt: timestamp.optional(),
  suggestedActions: z.array(text).length(3).optional(),
});
