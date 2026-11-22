import { z } from "zod";

export const MAX_TEXT_CHARS = 600;

export const text = z.string().trim().min(1).max(MAX_TEXT_CHARS);
export const narration = z.string().trim().min(1).max(2_000);
export const id = z.string().trim().min(1).max(160);
export const timestamp = z.string().datetime({ offset: true });
