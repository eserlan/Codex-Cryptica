// Performance baseline: see tasks.md T022 — profile with 5 000-word entity + 100 vault
// entities and record observed timing here after manual profiling.

export interface EntityIndexEntry {
  /** Lowercase title or alias for case-insensitive comparison. */
  text: string;
  /** The canonical entity ID this entry resolves to. */
  id: string;
}

export interface DetectedMatch {
  /** Byte offset of the first matched character in the source string. */
  start: number;
  /** Byte offset one past the last matched character. */
  end: number;
  /** The canonical entity ID resolved from the match. */
  entityId: string;
  /** The matched text as it appears in the source (original casing preserved). */
  matchedText: string;
}

/**
 * Returns a new array sorted longest-first (descending by text.length).
 * Must be called before passing to detectEntityMentions to guarantee
 * longest-match-wins behaviour.
 *
 * Does NOT mutate the input array.
 */
export function sortEntityIndex(index: EntityIndexEntry[]): EntityIndexEntry[] {
  return [...index].sort((a, b) => b.text.length - a.text.length);
}

/**
 * Scans `text` for occurrences of entity names defined in `sortedIndex`,
 * returning non-overlapping longest-first matches with self-link suppression.
 *
 * @param text            The raw text string to scan (original casing).
 * @param sortedIndex     Pre-sorted longest-first array of index entries (lowercase text).
 * @param currentEntityId Entity ID to exclude from results (self-link suppression).
 * @returns Array of DetectedMatch sorted by ascending start offset, non-overlapping.
 */
export function detectEntityMentions(
  text: string,
  sortedIndex: EntityIndexEntry[],
  currentEntityId: string,
): DetectedMatch[] {
  if (sortedIndex.length === 0 || text.length === 0) return [];

  const lower = text.toLowerCase();
  const results: DetectedMatch[] = [];
  let pos = 0;

  while (pos < lower.length) {
    let matched = false;

    for (const entry of sortedIndex) {
      if (entry.id === currentEntityId) continue;
      if (entry.text.length === 0) continue;

      // Fast check: does the text at current position start with this entry?
      if (!lower.startsWith(entry.text, pos)) continue;

      const matchEnd = pos + entry.text.length;

      if (!isWordBoundary(text, pos, matchEnd)) continue;

      results.push({
        start: pos,
        end: matchEnd,
        entityId: entry.id,
        matchedText: text.slice(pos, matchEnd),
      });
      pos = matchEnd;
      matched = true;
      break;
    }

    if (!matched) pos++;
  }

  return results;
}

/**
 * Returns true when the match span [start, end) sits on word boundaries.
 *
 * A word character is [a-zA-Z0-9'] — apostrophes are word-continuations so
 * "Aldric" does NOT match inside "Aldric's".
 */
function isWordBoundary(text: string, start: number, end: number): boolean {
  const wordChar = /[a-zA-Z0-9']/;
  const before = start > 0 ? text[start - 1] : null;
  const after = end < text.length ? text[end] : null;
  return (
    (before === null || !wordChar.test(before)) &&
    (after === null || !wordChar.test(after))
  );
}
