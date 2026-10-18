/**
 * Close-name suggestions for a failed lookup (FR-040).
 *
 * Lives here rather than in the web app because it is engine logic, not UI
 * logic: the app layer should stay a thin shell over the package (Constitution
 * I). It is also not a reuse miss. `packages/search-engine` is a FlexSearch
 * index over vault *entities*, built and persisted per vault; it exposes no
 * standalone string-similarity function, and indexing table names into it to
 * answer one "did you mean" would be far more machinery than the question
 * needs (Constitution III, YAGNI).
 */

/**
 * Dice coefficient over character bigrams, in 0..1.
 *
 * Bigrams rather than edit distance because the mistakes this catches are
 * mostly transpositions and partial names typed from memory mid-session, which
 * share substrings even when the edit distance is large.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const gram = s.slice(i, i + 2);
      out.set(gram, (out.get(gram) ?? 0) + 1);
    }
    return out;
  };

  const first = bigrams(a);
  const second = bigrams(b);
  let shared = 0;
  for (const [gram, count] of first) {
    shared += Math.min(count, second.get(gram) ?? 0);
  }
  return (2 * shared) / (a.length - 1 + b.length - 1);
}

/** Minimum score worth offering. Below this the "did you mean" is noise. */
const THRESHOLD = 0.4;

/**
 * The closest `limit` names to `name`, best first.
 *
 * Returns nothing rather than a weak guess when nothing scores well: naming a
 * wrong table is worse than admitting the lookup failed.
 */
export function suggestNames(
  name: string,
  candidates: string[],
  limit = 3,
): string[] {
  const key = name.trim().toLowerCase();
  if (!key) return [];

  return candidates
    .map((candidate) => ({
      name: candidate,
      score: similarity(key, candidate.trim().toLowerCase()),
    }))
    .filter((c) => c.score > THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => c.name);
}
