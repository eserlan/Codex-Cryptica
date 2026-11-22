import { z } from "zod";
import { id, text } from "./schema-primitives";

export const MAX_PLACES = 30;
export const MAX_PLACE_ALIASES = 5;
const MAX_PLACE_NAME_CHARS = 120;
const placeName = z.string().trim().min(1).max(MAX_PLACE_NAME_CHARS);
const placeCue = z.string().trim().min(1).max(32);
export const placeCuesSchema = z.array(placeCue).max(8).optional();

export const placeSchema = z
  .object({
    id,
    name: placeName,
    sourceRecordId: id.optional(),
    relation: text.optional(),
    aliases: z.array(placeName).max(MAX_PLACE_ALIASES).optional(),
    cues: placeCuesSchema,
  })
  .strict();

export const placeMoveSchema = z
  .object({
    placeId: id.optional(),
    name: placeName.optional(),
    relation: text.optional(),
    cues: placeCuesSchema,
  })
  .strict()
  .refine((move) => Boolean(move.placeId || move.name), {
    message: "A move needs a placeId or a name.",
  });
