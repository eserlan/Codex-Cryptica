import type { ModeId } from "./modes";
import { validateDevelopmentShape, type Development } from "./types";

/**
 * Turns the model's text into a validated development (#3228).
 *
 * Beyond the shape rules in `validateDevelopmentShape`, this rejects anything
 * that reads as a score, grade or rating of the idea (FR-009): the tool
 * develops ideas, it does not mark them.
 */
export type ParseResult =
  | { kind: "development"; development: Development }
  | { kind: "needs-rpg-idea"; message?: string }
  | { kind: "invalid"; reason: string };

export interface ParseOptions {
  /** Zero for the opening turn. */
  turnIndex: number;
  mode?: ModeId;
}

// Only the plain words for marking an idea; "rank" is an ordinary field (a title).
const SCORE_KEYS = /^(score|rating|grade)s?$/i;
const RATING_TEXT = [
  // "7/10", "8 out of 10" (a ten-point rating; not "3 out of 100 households")
  /\b\d+(?:\.\d+)?\s*(?:\/|out of)\s*10\b/i,
  // "score of 9", "rating: 4", "grade is 7"
  /\b(?:score|rating|grade)s?\s*(?:of|:|is|=)\s*\d/i,
];

function stripFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}

/** The text from the first "{" to the last "}", for a reply wrapped in a sentence. */
function outermostObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : null;
}

function parseJson(text: string): unknown {
  const cleaned = stripFence(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const inner = outermostObject(cleaned);
    if (!inner) throw new Error("no JSON");
    return JSON.parse(inner);
  }
}

function hasRatingText(value: string): boolean {
  return RATING_TEXT.some((pattern) => pattern.test(value));
}

function firstScoreLike(values: unknown[]): string | null {
  for (const value of values) {
    const found = findScoreLikeContent(value);
    if (found) return found;
  }
  return null;
}

function findInObject(obj: Record<string, unknown>): string | null {
  const scoreKey = Object.keys(obj).find((key) => SCORE_KEYS.test(key));
  if (scoreKey) return `The response contained a "${scoreKey}" field.`;
  return firstScoreLike(Object.values(obj));
}

function findScoreLikeContent(value: unknown): string | null {
  if (typeof value === "string") {
    return hasRatingText(value) ? "The response contained a rating." : null;
  }
  if (Array.isArray(value)) return firstScoreLike(value);
  if (value && typeof value === "object") {
    return findInObject(value as Record<string, unknown>);
  }
  return null;
}

export function parseDevelopmentResponse(
  text: string,
  options: ParseOptions,
): ParseResult {
  let raw: unknown;
  try {
    raw = parseJson(text);
  } catch {
    return { kind: "invalid", reason: "The response was not valid JSON." };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { kind: "invalid", reason: "The response was not an object." };
  }

  const obj = raw as Record<string, unknown>;
  if (obj.needsRpgIdea === true) {
    const message = typeof obj.message === "string" ? obj.message : undefined;
    return message
      ? { kind: "needs-rpg-idea", message }
      : { kind: "needs-rpg-idea" };
  }

  const scored = findScoreLikeContent(obj);
  if (scored) return { kind: "invalid", reason: scored };

  const shape = validateDevelopmentShape(obj, {
    turnIndex: options.turnIndex,
    mode: options.mode,
  });
  if (!shape.ok) return { kind: "invalid", reason: shape.reason };
  return { kind: "development", development: shape.value };
}
