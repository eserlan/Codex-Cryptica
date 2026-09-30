import { z } from "zod";
import {
  GuidanceActionSchema,
  type ActionRef,
  type GuidanceAction,
} from "../actions/types";
import type { HelpChunk } from "../bundle/types";

export const MAX_ANSWER_CHARS = 900;

export const NO_MATCH_MESSAGE =
  "I couldn't find documented help for that. These topics are the closest:";
export const OUT_OF_SCOPE_MESSAGE =
  "I can only help with using Codex Cryptica. Try asking about a feature, a screen, or how to do something in your vault.";

export interface HelpSource {
  id: string;
  title: string;
  helpId?: string;
}

export interface HelpTopic {
  helpId: string;
  title: string;
}

export interface HelpAnswer {
  outcome: "answered" | "no-match" | "out-of-scope";
  answer: string;
  sources: HelpSource[];
  action: GuidanceAction | null;
  suggestions: HelpTopic[];
}

/** The shape the Worker returns and the browser re-validates before showing it. */
export const HelpAnswerSchema = z.object({
  outcome: z.enum(["answered", "no-match", "out-of-scope"]),
  answer: z.string().max(2000),
  sources: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        helpId: z.string().optional(),
      }),
    )
    .max(10),
  action: GuidanceActionSchema.nullable(),
  suggestions: z
    .array(z.object({ helpId: z.string(), title: z.string() }))
    .max(10),
});

export const ModelResponseSchema = z.object({
  answer: z.string(),
  sourceIds: z.array(z.string()),
  actionId: z.string().default(""),
  confidence: z.enum(["high", "low", "none", "out-of-scope"]),
});

export function noMatchAnswer(suggestions: HelpTopic[]): HelpAnswer {
  return {
    outcome: "no-match",
    answer: NO_MATCH_MESSAGE,
    sources: [],
    action: null,
    suggestions,
  };
}

export function outOfScopeAnswer(): HelpAnswer {
  return {
    outcome: "out-of-scope",
    answer: OUT_OF_SCOPE_MESSAGE,
    sources: [],
    action: null,
    suggestions: [],
  };
}

/** Trims to the limit at a sentence boundary where there is one. */
export function trimAnswer(text: string, max = MAX_ANSWER_CHARS): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastStop = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
    cut.endsWith(".") ? cut.length - 1 : -1,
  );
  return lastStop > max * 0.5
    ? cut.slice(0, lastStop + 1)
    : `${cut.trimEnd()}…`;
}

export interface FinalizeInput {
  /** Parsed JSON from the model (not yet trusted). */
  raw: unknown;
  /** The chunks that were actually supplied to the model. */
  chunks: readonly HelpChunk[];
  /** The actions that were actually offered to the model. */
  candidates: readonly ActionRef[];
  suggestions: HelpTopic[];
}

/**
 * Turns an untrusted model response into the answer the user sees. Grounding
 * is enforced here, after generation: citations the model was never given are
 * dropped, an answer with no valid citation becomes a no-match, and an action
 * is accepted only if it is one of the candidates the server offered.
 * Returns null when the model output is not a valid response at all.
 */
export function finalizeAnswer(input: FinalizeInput): HelpAnswer | null {
  const parsed = ModelResponseSchema.safeParse(input.raw);
  if (!parsed.success) return null;
  const model = parsed.data;

  if (model.confidence === "out-of-scope") return outOfScopeAnswer();
  if (model.confidence === "none") return noMatchAnswer(input.suggestions);

  const supplied = new Map(input.chunks.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const sources: HelpSource[] = [];
  for (const id of model.sourceIds) {
    const chunk = supplied.get(id);
    if (!chunk || seen.has(id)) continue;
    seen.add(id);
    sources.push({
      id: chunk.id,
      title: chunk.title,
      ...(chunk.helpId ? { helpId: chunk.helpId } : {}),
    });
  }
  if (sources.length === 0 || model.answer.trim() === "") {
    return noMatchAnswer(input.suggestions);
  }

  const action =
    input.candidates.find((c) => c.id === model.actionId)?.action ?? null;

  return {
    outcome: "answered",
    answer: trimAnswer(model.answer),
    sources,
    action,
    suggestions: [],
  };
}
