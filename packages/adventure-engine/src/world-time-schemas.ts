import { z } from "zod";
import { id, text } from "./schema-primitives";

const worldTimeEventSchema = z
  .object({
    id,
    turnId: id,
    atMinute: z.number().int().nonnegative(),
    threadId: id,
    text,
  })
  .strict();

export const worldTimeSchema = z
  .object({
    version: z.literal(1),
    elapsedMinutes: z.number().int().min(0).max(52_560_000),
    events: z.array(worldTimeEventSchema).max(80),
  })
  .strict();

export const timeAdvanceSchema = z
  .object({
    minutes: z.number().int().min(1).max(43_200),
    cause: text,
    developments: z.array(z.object({ threadId: id, text }).strict()).max(3),
  })
  .strict();
