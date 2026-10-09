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

/**
 * Story questions ("what would the goblin do?") are for the Oracle, not product
 * help (Cif stays product help only, FR-030). Matched only when retrieval found
 * nothing, so a real product question never reaches this rule. Product words
 * keep "how do I ..." and "what does the Oracle button do" out of it.
 */
const STORY_QUESTION =
  /\b(what|how) (would|will|might|should|does|do)\b[\w\s',-]{0,40}\b(do|say|react|respond|decide|attack|answer|behave)\b/i;
const PRODUCT_WORDS =
  /\b(oracle|button|screen|vault|map|entity|shortcut|settings?|cif|help|how do i|how to|where|which|feature|tab|menu)\b/i;

export const ORACLE_REDIRECT_MESSAGE =
  "That is a story question, and Cif only explains Codex Cryptica. Ask the Oracle instead: open it from the sidebar, or use Ask Oracle in the solo bar when AI is on.";

export function isStoryQuestion(question: string): boolean {
  return STORY_QUESTION.test(question) && !PRODUCT_WORDS.test(question);
}

export function oracleRedirectAnswer(): HelpAnswer {
  return {
    outcome: "out-of-scope",
    answer: ORACLE_REDIRECT_MESSAGE,
    sources: [],
    action: null,
    suggestions: [],
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

function answerForConfidence(
  confidence: z.infer<typeof ModelResponseSchema>["confidence"],
  suggestions: HelpTopic[],
): HelpAnswer | null {
  if (confidence === "out-of-scope") return outOfScopeAnswer();
  if (confidence === "none") return noMatchAnswer(suggestions);
  return null;
}

function citedSources(
  sourceIds: string[],
  chunks: readonly HelpChunk[],
): HelpSource[] {
  const supplied = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const seenSources = new Set<string>();
  const seenTitles = new Set<string>();
  const sources: HelpSource[] = [];

  for (const id of sourceIds) {
    const chunk = supplied.get(id);
    if (!chunk) continue;

    const title = chunk.citationTitle ?? chunk.title;
    const sourceKey = chunk.helpId ?? chunk.sourceId ?? chunk.id;
    if (seenSources.has(sourceKey) || seenTitles.has(title)) continue;

    seenSources.add(sourceKey);
    seenTitles.add(title);
    sources.push({
      id: chunk.id,
      title,
      ...(chunk.helpId ? { helpId: chunk.helpId } : {}),
    });
  }

  return sources;
}

function finalizeParsedAnswer(
  model: z.infer<typeof ModelResponseSchema>,
  input: FinalizeInput,
): HelpAnswer {
  const confidenceAnswer = answerForConfidence(
    model.confidence,
    input.suggestions,
  );
  if (confidenceAnswer) return confidenceAnswer;

  const sources = citedSources(model.sourceIds, input.chunks);
  if (sources.length === 0 || model.answer.trim() === "") {
    return noMatchAnswer(input.suggestions);
  }

  const action =
    input.candidates.find((candidate) => candidate.id === model.actionId)
      ?.action ?? null;
  return {
    outcome: "answered",
    answer: trimAnswer(model.answer),
    sources,
    action,
    suggestions: [],
  };
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
  return finalizeParsedAnswer(parsed.data, input);
}
