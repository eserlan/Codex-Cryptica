import type { Development } from "./types";

/**
 * Which parts of a development changed between two turns (#3228).
 *
 * Worked out here, by comparing the two results, rather than taken from the
 * model's own "what changed" line: the model can be vague or wrong about it,
 * and the user needs a reliable answer to "did anything actually change?".
 */
export const COMPARED_SECTIONS = [
  "alreadyInteresting",
  "centralQuestion",
  "makeItMove",
  "peopleWhoCare",
  "playerDirections",
  "consequences",
  "creatorQuestions",
] as const;

export type ComparedSection = (typeof COMPARED_SECTIONS)[number];

/** Spacing and letter case do not count as a change. */
function normalise(value: unknown): unknown {
  if (typeof value === "string")
    return value.trim().replace(/\s+/g, " ").toLowerCase();
  if (Array.isArray(value)) return value.map(normalise);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalise(item)]),
    );
  }
  return value;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
}

/** The sections that differ, in display order. Nothing is reported for a first result. */
export function changedSections(
  previous: Development | null | undefined,
  next: Development,
): ComparedSection[] {
  if (!previous) return [];
  return COMPARED_SECTIONS.filter((key) => !same(previous[key], next[key]));
}
