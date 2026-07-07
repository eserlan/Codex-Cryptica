import type { Entity } from "schema";

/** Columns the Entity Table can be sorted by. */
export type SortKey =
  "title" | "type" | "connections" | "labels" | "created" | "modified";
export type SortDirection = "asc" | "desc";

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

/** Directional connection counts for a single entity. */
export interface ConnectionSummary {
  inbound: number;
  outbound: number;
  total: number;
}

/** Resolve an entity's creation timestamp (epoch ms), if known. */
export function getEntityCreatedAt(entity: Entity): number | undefined {
  return entity.createdAt;
}

/**
 * Resolve an entity's "modified" timestamp. Prefer the explicit `modifiedAt`,
 * falling back to the load-bearing `updatedAt` and the legacy `lastUpdated` so
 * entities created before these fields existed still show a sensible value.
 */
export function getEntityModifiedAt(entity: Entity): number | undefined {
  return entity.modifiedAt ?? entity.updatedAt ?? entity.lastUpdated;
}

/** Labels shown in the table; legacy entities without labels fall back to tags. */
export function getEntityLabels(entity: Entity): string[] {
  return entity.labels?.length ? entity.labels : (entity.tags ?? []);
}

/** Alphabetically first label without sorting a copy of the array. */
function firstLabel(entity: Entity): string | undefined {
  let min: string | undefined;
  for (const label of getEntityLabels(entity)) {
    if (min === undefined || label.localeCompare(min) < 0) min = label;
  }
  return min;
}

/**
 * Sort entities for the table. Returns a new array; the input is not mutated.
 * Entities missing the sort value (e.g. no created/modified timestamp) always
 * sort last, regardless of direction, so cleanup gaps stay visible at the
 * bottom. Ties fall back to title order for stable, predictable output.
 */
export function sortEntities(
  entities: Entity[],
  sort: SortState,
  connectionCounts: Record<string, ConnectionSummary> = {},
): Entity[] {
  const dir = sort.direction === "asc" ? 1 : -1;

  return [...entities].sort((a, b) => {
    if (sort.key === "created" || sort.key === "modified") {
      const read =
        sort.key === "created" ? getEntityCreatedAt : getEntityModifiedAt;
      const av = read(a);
      const bv = read(b);
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

    if (sort.key === "labels") {
      // Compare by first label (alphabetical); unlabeled entities sort last.
      const la = firstLabel(a);
      const lb = firstLabel(b);
      if (la === undefined && lb === undefined)
        return a.title.localeCompare(b.title);
      if (la === undefined) return 1;
      if (lb === undefined) return -1;
      const l = la.localeCompare(lb);
      if (l !== 0) return l * dir;
      return a.title.localeCompare(b.title);
    }

    if (sort.key === "connections") {
      const countA = connectionCounts[a.id]?.total ?? 0;
      const countB = connectionCounts[b.id]?.total ?? 0;
      if (countA !== countB) return (countA - countB) * dir;
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
