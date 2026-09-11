import type { FactionTurnRecord, WorldDateStamp } from "./types";

/**
 * Reading a faction's turn history.
 *
 * History is never pruned, capped or trimmed (FR-041): the oldest turn of a long
 * campaign must still be explainable, which is the whole point of keeping the
 * full resolution detail on every record.
 */

/**
 * Whether a record's date can still be interpreted against the current calendar.
 *
 * A GM who reconfigures their calendar does not invalidate their history; the
 * affected entries simply render as undated, matching how the rest of the app
 * already treats dates it cannot place.
 */
export function isDateResolvable(
  record: FactionTurnRecord,
  calendarRevision: number,
): boolean {
  return record.worldDate.calendarRevision === calendarRevision;
}

function dateSortKey(date: WorldDateStamp, monthsPerYear: number): number {
  return (date.year * monthsPerYear + (date.month - 1)) * 64 + (date.day ?? 0);
}

/**
 * Chronological order by world date, then by real-world commit time so several
 * turns taken on the same in-world day keep a stable, meaningful order (FR-036).
 *
 * Entries whose calendar revision no longer matches sort last: they have no
 * placeable position, and interleaving them by a stale date would misrepresent
 * the campaign's history.
 */
export function sortHistory(
  history: FactionTurnRecord[],
  calendarRevision: number,
  monthsPerYear = 12,
): FactionTurnRecord[] {
  return [...history].sort((a, b) => {
    const aResolvable = isDateResolvable(a, calendarRevision);
    const bResolvable = isDateResolvable(b, calendarRevision);
    if (aResolvable !== bResolvable) return aResolvable ? -1 : 1;
    if (!aResolvable && !bResolvable) return a.committedAt - b.committedAt;

    const byDate =
      dateSortKey(a.worldDate, monthsPerYear) -
      dateSortKey(b.worldDate, monthsPerYear);
    if (byDate !== 0) return byDate;
    return a.committedAt - b.committedAt;
  });
}

/** The newest record that has not been undone, or undefined if none remain. */
export function mostRecentActive(
  history: FactionTurnRecord[],
): FactionTurnRecord | undefined {
  let best: FactionTurnRecord | undefined;
  for (const record of history) {
    if (record.undone) continue;
    if (!best || record.committedAt > best.committedAt) best = record;
  }
  return best;
}

/**
 * The `lastTurnDate` implied by a history list.
 *
 * Recomputed after every commit and every undo, so reversing a faction's only
 * turn genuinely returns it to "has never acted" for pacing purposes (FR-010).
 */
export function deriveLastTurnDate(
  history: FactionTurnRecord[],
): WorldDateStamp | undefined {
  return mostRecentActive(history)?.worldDate;
}
