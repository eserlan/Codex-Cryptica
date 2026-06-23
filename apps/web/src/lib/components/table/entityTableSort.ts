import type { Entity } from "schema";

/** Columns the Entity Table can be sorted by. */
export type SortKey = "title" | "type" | "updated";
export type SortDirection = "asc" | "desc";

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

/**
 * Resolve an entity's "updated" timestamp. The schema carries both `updatedAt`
 * (newer) and `lastUpdated` (legacy); prefer the former.
 */
export function getEntityUpdatedAt(entity: Entity): number | undefined {
  return entity.updatedAt ?? entity.lastUpdated;
}

/**
 * Sort entities for the table. Returns a new array; the input is not mutated.
 * Entities missing the sort value (e.g. no updated timestamp) always sort last,
 * regardless of direction, so cleanup gaps stay visible at the bottom. Ties
 * fall back to title order for stable, predictable output.
 */
export function sortEntities(entities: Entity[], sort: SortState): Entity[] {
  const dir = sort.direction === "asc" ? 1 : -1;

  return [...entities].sort((a, b) => {
    if (sort.key === "updated") {
      const av = getEntityUpdatedAt(a);
      const bv = getEntityUpdatedAt(b);
      if (av === undefined && bv === undefined)
        return a.title.localeCompare(b.title);
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      if (av !== bv) return (av - bv) * dir;
      return a.title.localeCompare(b.title);
    }

    if (sort.key === "type") {
      const t = a.type.localeCompare(b.type);
      if (t !== 0) return t * dir;
      return a.title.localeCompare(b.title);
    }

    // title
    return a.title.localeCompare(b.title) * dir;
  });
}

/** Toggle direction when re-selecting the active column, else default to asc. */
export function nextSortState(current: SortState, key: SortKey): SortState {
  if (current.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: "asc" };
}
