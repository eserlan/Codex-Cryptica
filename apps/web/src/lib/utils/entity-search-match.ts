import type { Entity } from "schema";

/**
 * Does this entity answer to the typed text? Matches the title or any alias,
 * case-insensitively. An empty query matches everything.
 *
 * Shared so every place that searches entities by name agrees on what "found"
 * means — an alias that finds something in the explorer finds it in the parent
 * picker too. Callers that also search labels or body text add those terms
 * themselves; this is the name half they all have in common.
 */
export function matchesEntityQuery(
  entity: Pick<Entity, "title"> & { aliases?: string[] },
  query: string,
): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  if (entity.title?.toLowerCase().includes(trimmed)) return true;
  return !!entity.aliases?.some((alias) =>
    alias.toLowerCase().includes(trimmed),
  );
}
