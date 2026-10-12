import { GuidanceActionSchema, QUICK_PROMPT_SETS } from "help-engine";
import { z } from "zod";
import type { JourneyDefinition } from "./types";

const QUICK_PROMPTS = new Set(QUICK_PROMPT_SETS.flatMap((s) => s.prompts));

const MatcherSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("entry-created"),
      categories: z.array(z.string().min(1)).min(1).optional(),
    })
    .strict(),
  z.object({ kind: z.literal("connection-added") }).strict(),
  z.object({ kind: z.literal("generator-saved") }).strict(),
  z.object({ kind: z.literal("entry-found") }).strict(),
  z.object({ kind: z.literal("screen"), area: z.literal("graph") }).strict(),
]);

const StepSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    instruction: z.string().min(1).max(160),
    completeOn: MatcherSchema,
    after: z.array(z.string()).optional(),
    showMe: GuidanceActionSchema.optional(),
    fallback: z.string().min(1).max(200),
    anyEntryCopy: z.string().min(1).max(160).optional(),
    quickPrompt: z
      .string()
      .refine((p) => QUICK_PROMPTS.has(p), "Not an existing Cif quick prompt")
      .optional(),
  })
  .strict()
  .refine(
    (s) =>
      !(s.completeOn.kind === "entry-created" && s.completeOn.categories) ||
      !!s.anyEntryCopy,
    "A step that names categories needs anyEntryCopy",
  );

export const JourneyDefinitionSchema = z
  .object({
    id: z.enum(["worldbuilder", "writer", "rpg-gm"]),
    goal: z.enum(["world", "story", "campaign"]),
    version: z.number().int().positive(),
    title: z.string().min(1).max(60),
    steps: z.array(StepSchema).min(2).max(6),
    finish: z
      .object({
        message: z.string().min(1).max(200),
        next: GuidanceActionSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((def, issue) => {
    const seen = new Set<string>();
    for (const step of def.steps) {
      if (seen.has(step.id)) {
        issue.addIssue({
          code: "custom",
          message: `Duplicate step ${step.id}`,
        });
      }
      for (const dep of step.after ?? []) {
        // Only earlier steps, which also rules out cycles.
        if (!seen.has(dep)) {
          issue.addIssue({
            code: "custom",
            message: `${step.id} must come after an earlier step, not ${dep}`,
          });
        }
      }
      seen.add(step.id);
    }
  }) as unknown as z.ZodType<JourneyDefinition>;
