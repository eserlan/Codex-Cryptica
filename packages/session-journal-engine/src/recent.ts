import type { JournalEntry } from "./types";

/** Bookkeeping entries that are not things a player would save. */
const BOOKKEEPING_TYPES = new Set(["party-change", "generated-saved"]);

export const RECENT_RESULTS_LIMIT = 10;

/**
 * The newest captured results in a journal, newest first. Bookkeeping entries
 * (party changes, "saved to the Vault" follow-ups) are left out, since they are
 * not things to save.
 */
export function recentResults(
  entries: readonly JournalEntry[],
  limit: number = RECENT_RESULTS_LIMIT,
): JournalEntry[] {
  return entries
    .filter((entry) => !BOOKKEEPING_TYPES.has(entry.type))
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}
