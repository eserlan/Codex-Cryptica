import { z } from "zod";
import type { BiomeAlteration } from "./model";

export interface SuggestRequest {
  system: string;
  user: string;
  signal?: AbortSignal;
}

export type SuggestRunner = (request: SuggestRequest) => Promise<string>;

export interface Suggestion {
  effect: string;
  plausibilityNote: string;
}

export type SuggestResult =
  | { ok: true; suggestions: Suggestion[] }
  | {
      ok: false;
      reason: "disabled" | "invalid-response" | "runner-error" | "cancelled";
    };

export const MAX_SUGGESTIONS = 3;

const SYSTEM_PROMPT = [
  "You help a worldbuilder think through the consequences of one deliberate fantasy or science-fiction change to an environment.",
  "Suggest up to three concrete, believable knock-on effects (on plants, animals, water, weather, people or travel), each with a short note on why it follows.",
  "Do not contradict the change. Do not add new magic. Keep each item to one or two sentences.",
  'Reply with JSON only, in this shape: {"suggestions":[{"effect":"...","plausibilityNote":"..."}]}',
].join(" ");

const ResponseSchema = z.object({
  suggestions: z.array(z.unknown()),
});

/** Longer than this is not a one-or-two sentence effect, so it is dropped. */
export const MAX_SUGGESTION_LENGTH = 500;

const SuggestionSchema = z.object({
  effect: z.string().trim().min(1).max(MAX_SUGGESTION_LENGTH),
  plausibilityNote: z.string().trim().min(1).max(MAX_SUGGESTION_LENGTH),
});

/**
 * Finds the JSON object in free text or a code fence: from the first "{", it
 * tries each "}" from the end backwards until the slice parses.
 */
function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  for (let end = text.lastIndexOf("}"); start !== -1 && end > start;) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      end = text.lastIndexOf("}", end - 1);
    }
  }
  return undefined;
}

/**
 * Asks the optional AI helper for knock-on effects of one fictional change.
 * It only returns proposals; nothing is written to a profile here.
 */
export async function suggestEffects(
  deps: { run: SuggestRunner; isAllowed?: () => boolean },
  input: { profileSummary: string; alteration: BiomeAlteration },
  signal?: AbortSignal,
): Promise<SuggestResult> {
  if (deps.isAllowed && !deps.isAllowed())
    return { ok: false, reason: "disabled" };
  if (signal?.aborted) return { ok: false, reason: "cancelled" };

  const user = [
    `Environment: ${input.profileSummary}`,
    `Fictional change (${input.alteration.aspect}): ${input.alteration.description}`,
    input.alteration.cause.trim()
      ? `Stated cause: ${input.alteration.cause.trim()}`
      : "Stated cause: none given yet.",
  ].join("\n");

  let raw: string;
  try {
    raw = await deps.run({ system: SYSTEM_PROMPT, user, signal });
  } catch {
    return {
      ok: false,
      reason: signal?.aborted ? "cancelled" : "runner-error",
    };
  }
  if (signal?.aborted) return { ok: false, reason: "cancelled" };

  const parsed = ResponseSchema.safeParse(extractJsonObject(raw));
  if (!parsed.success) return { ok: false, reason: "invalid-response" };

  const suggestions: Suggestion[] = [];
  for (const entry of parsed.data.suggestions) {
    const item = SuggestionSchema.safeParse(entry);
    if (item.success) suggestions.push(item.data);
    if (suggestions.length === MAX_SUGGESTIONS) break;
  }
  return suggestions.length > 0
    ? { ok: true, suggestions }
    : { ok: false, reason: "invalid-response" };
}
