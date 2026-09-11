import type { RandomSource } from "random-source-engine";

/**
 * The labels on offer are every label any source in the list carries, not just
 * the ones on sources currently visible — filtering by a label must not make
 * the button that cleared it disappear.
 */
export function collectLabels(all: RandomSource[]): string[] {
  return [...new Set(all.flatMap((s) => s.labels))].sort();
}

/**
 * Search and label filters both narrow the list, and a source must satisfy
 * every active label, not merely one — that is what lets combining labels
 * narrow further rather than widen.
 */
export function filterSources(
  all: RandomSource[],
  query: string,
  activeLabels: string[],
): RandomSource[] {
  const needle = query.trim().toLowerCase();
  return all
    .filter((s) => !needle || s.name.toLowerCase().includes(needle))
    .filter((s) => activeLabels.every((l) => s.labels.includes(l)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Entries for a table, cards for a deck — whichever the kind counts as content. */
export function countOf(
  kind: "table" | "deck",
  source: RandomSource,
): number {
  return (kind === "table" ? source.entries : source.cards)?.length ?? 0;
}
