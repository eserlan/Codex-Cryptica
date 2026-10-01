import { z } from "zod";
import {
  CONTROL_IDS,
  DESTINATION_IDS,
  GENERATOR_IDS,
  PANEL_IDS,
} from "./catalogue";

const label = z.string().min(1).max(80);

const navigate = z
  .object({ type: z.literal("navigate"), to: z.enum(DESTINATION_IDS), label })
  .strict();
const openHelp = z
  .object({
    type: z.literal("openHelp"),
    helpId: z.string().min(1).max(80),
    label,
  })
  .strict();
const openPanel = z
  .object({ type: z.literal("openPanel"), panel: z.enum(PANEL_IDS), label })
  .strict();
const highlight = z
  .object({
    type: z.literal("highlight"),
    target: z.enum(CONTROL_IDS),
    label,
  })
  .strict();
const openGenerator = z
  .object({
    type: z.literal("openGenerator"),
    // Optional: without an id the generator workflow opens for the user to pick.
    generatorId: z.enum(GENERATOR_IDS).optional(),
    label,
  })
  .strict();

export const GuidanceStepSchema = z.discriminatedUnion("type", [
  navigate,
  openHelp,
  openPanel,
  highlight,
  openGenerator,
]);

export type GuidanceStep = z.infer<typeof GuidanceStepSchema>;

const thenField = { then: GuidanceStepSchema.optional() };

/**
 * One offered guide: a step and at most one follow-on step. The follow-on is a
 * plain step, so it cannot carry its own follow-on and a guide never has more
 * than two steps.
 */
export const GuidanceActionSchema = z.discriminatedUnion("type", [
  navigate.extend(thenField).strict(),
  openHelp.extend(thenField).strict(),
  openPanel.extend(thenField).strict(),
  highlight.extend(thenField).strict(),
  openGenerator.extend(thenField).strict(),
]);

export type GuidanceAction = z.infer<typeof GuidanceActionSchema>;

/** A server-known action the model may select by ID. */
export const ActionRefSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/)
      .max(60),
    action: GuidanceActionSchema,
  })
  .strict();

export type ActionRef = z.infer<typeof ActionRefSchema>;
