import { z } from "zod";

export const MAX_TEXT_CHARS = 600;

export const text = z.string().trim().min(1).max(MAX_TEXT_CHARS);
export const narration = z.string().trim().min(1).max(2_000);
export const id = z.string().trim().min(1).max(160);
export const timestamp = z.string().datetime({ offset: true });

export const threadOutcomeResultSchema = z.enum([
  "achieved",
  "failed",
  "abandoned",
  "cold",
]);

export const threadGoalSchema = z.string().trim().min(1).max(240);

export const threadOutcomeSchema = z
  .object({
    result: threadOutcomeResultSchema,
    reason: text,
    sourceTurnId: id,
    supportingFactIds: z.array(id).max(16),
    supportingCommitmentIds: z.array(id).max(16),
    recordedAt: timestamp,
    sequence: z.number().int().nonnegative(),
    unresolvedConsequences: z.array(text).max(6).optional(),
  })
  .strict();
