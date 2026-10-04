import type { ScoredChunk } from "./rank";
import { lexicalScoresFor } from "./rank";
import { tokenize } from "./text";

/** The two things a question asks to compare, as search terms. */
export interface Comparison {
  left: string[];
  right: string[];
}

/** Text after these words is the purpose of the choice, not a thing being compared. */
const PURPOSE_CLAUSE =
  /\s+(?:to|for|when|if|so that|because|in order to)\s+.*$/i;

/** "Should I use", "Do I", "Is" ... in front of the first thing compared. */
const QUESTION_LEAD =
  /^(?:what(?:'s| is| are)?\s+|which\s+|should\s+(?:i|we)\s+|do\s+(?:i|we)\s+|does\s+|is\s+|are\s+|can\s+(?:i|we)\s+)/i;

const PATTERNS: RegExp[] = [
  /\bdifferences?\s+between\s+(.+?)\s+and\s+(.+)$/i,
  /^(.+?)\s+(?:versus|vs\.?)\s+(.+)$/i,
  /^(?:is|are|does|do)\s+(.+?)\s+(?:the\s+same\s+(?:thing\s+)?as|same\s+as|different\s+(?:from|to|than)|instead\s+of)\s+(.+)$/i,
  /^(?:does|do|will|would)\s+(.+?)\s+(?:replace|replaces|replacing)\s+(.+)$/i,
  /^(?:should\s+(?:i|we)\s+|do\s+(?:i|we)\s+|can\s+(?:i|we)\s+|which\s+)?(.+?)\s+or\s+(.+)$/i,
];

const clean = (text: string) =>
  text
    .replace(/[?.!]+$/g, "")
    .replace(QUESTION_LEAD, "")
    .trim();

/**
 * Finds "A or B", "the difference between A and B", "is A the same as B",
 * "does A replace B" and "A versus B". Returns null for anything else, so
 * ordinary questions are ranked exactly as before.
 */
export function detectComparison(question: string): Comparison | null {
  const text = question.trim();
  for (const pattern of PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;

    const left = tokenize(clean(match[1]));
    const right = tokenize(clean(match[2]).replace(PURPOSE_CLAUSE, ""));
    // Words both sides share ("entity" in "create an entity on the canvas or
    // in the explorer") say what is being done, not which side to look in.
    const shared = new Set(left.filter((term) => right.includes(term)));
    const leftOnly = left.filter((term) => !shared.has(term));
    const rightOnly = right.filter((term) => !shared.has(term));
    if (leftOnly.length === 0 || rightOnly.length === 0) continue;
    return { left: leftOnly, right: rightOnly };
  }
  return null;
}

/** A side's best chunk must match at least this much of its own words. */
export const MIN_SIDE_MATCH = 0.3;

/** How many leading results must hear about each side. */
export const COVERED_WITHIN = 3;

/**
 * A shown chunk covers a side only when it comes from the same feature or
 * article as the side's best chunk. Merely mentioning the word does not
 * count: a report guide that says "canvas" in passing is not the canvas guide.
 */
const groupOf = (item: ScoredChunk) =>
  item.chunk.featureId ?? item.chunk.sourceId;

/**
 * Only a chunk that is about the side (its title, article or feature name
 * contains one of the side's words) may be added for it. A body-only match is
 * too weak to displace a result the ranking chose.
 */
function isAbout(item: ScoredChunk, terms: readonly string[]): boolean {
  const named = new Set(
    tokenize(
      `${item.chunk.title} ${item.chunk.heading} ${item.chunk.sourceId} ${item.chunk.featureId ?? ""}`,
    ),
  );
  return terms.some((term) => named.has(term));
}

interface SideChoice {
  best: ScoredChunk;
  /** The shown chunk that already covers this side, if any. */
  coveredBy: ScoredChunk | null;
}

function chooseForSide(
  terms: string[],
  pool: readonly ScoredChunk[],
  shown: readonly ScoredChunk[],
): SideChoice | null {
  const scores = lexicalScoresFor(
    terms,
    pool.map((item) => item.chunk),
  );
  const scoreOf = new Map(pool.map((item, index) => [item, scores[index]]));
  const best = pool.reduce<ScoredChunk | null>(
    (top, item) =>
      top === null || scoreOf.get(item)! > scoreOf.get(top)! ? item : top,
    null,
  );
  if (best === null || scoreOf.get(best)! < MIN_SIDE_MATCH) return null;
  if (!isAbout(best, terms)) return null;

  const coveredBy =
    shown
      .slice(0, COVERED_WITHIN)
      .find(
        (item) =>
          groupOf(item) === groupOf(best) ||
          item.chunk.sourceId === best.chunk.sourceId,
      ) ?? null;
  return { best, coveredBy };
}

/**
 * For a comparison, makes sure each thing compared is heard about in the
 * leading results. A question about two features is not answerable from one,
 * and the usual ranking lets whichever side matches more words (or sits on the
 * current screen) crowd the other out. A side that is already covered is left
 * alone, so a comparison that ranks well today ranks exactly the same.
 */
export function ensureBothSides(
  shown: ScoredChunk[],
  pool: readonly ScoredChunk[],
  comparison: Comparison,
  limit: number,
): ScoredChunk[] {
  const sides = [comparison.left, comparison.right].map((terms) =>
    chooseForSide(terms, pool, shown),
  );
  if (sides.some((side) => side === null)) return shown;
  const choices = sides as SideChoice[];

  const missing = choices.filter((side) => side.coveredBy === null);
  if (missing.length === 0) return shown;

  const top = shown.slice(0, COVERED_WITHIN);
  const protectedChunks = new Set<ScoredChunk>(
    choices.flatMap((side) => (side.coveredBy ? [side.coveredBy] : [])),
  );
  for (const { best } of missing) {
    if (top.includes(best)) continue;
    // Replace the lowest-ranked leading result that is not covering a side.
    const slot = top
      .map((item) => !protectedChunks.has(item))
      .lastIndexOf(true);
    if (slot < 0) {
      if (top.length < COVERED_WITHIN) top.push(best);
    } else {
      top[slot] = best;
    }
    protectedChunks.add(best);
  }
  const rest = shown
    .slice(COVERED_WITHIN)
    .filter((item) => !top.includes(item));
  // What was displaced from the leading results still follows, so the list
  // keeps its length.
  const displaced = shown
    .slice(0, COVERED_WITHIN)
    .filter((item) => !top.includes(item));
  return [...top, ...rest, ...displaced].slice(0, limit);
}
