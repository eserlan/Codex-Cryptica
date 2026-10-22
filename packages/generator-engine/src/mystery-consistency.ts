/** Deterministic consistency checks for accepted mystery stages. No AI involved. */
import { list, record, text, type Obj } from "./mystery-obj";

/** The alphabetic stem of a numbered id: "person-2" → "person". */
const stemOf = (id: string): string | null =>
  /^([a-z][a-z_-]*?)-?\d+$/i.exec(id)?.[1] ?? null;

/**
 * Ids written in prose that point at nothing. Only stems already used by a
 * known id are checked, so ordinary words like "step-1" are left alone.
 */
export function findBrokenReferences(
  prose: readonly string[],
  knownIds: readonly string[],
): string[] {
  const known = new Set(knownIds.map((id) => id.toLowerCase()));
  const stems = new Set(
    knownIds.map(stemOf).filter((stem): stem is string => stem !== null),
  );
  if (!stems.size) return [];
  const pattern = new RegExp(
    `\\b(?:${[...stems].map((s) => s.toLowerCase()).join("|")})-?\\d+\\b`,
    "gi",
  );
  const broken = new Set<string>();
  for (const value of prose)
    for (const match of value.match(pattern) ?? [])
      if (!known.has(match.toLowerCase())) broken.add(match);
  return [...broken].map(
    (id) => `text refers to "${id}", which does not exist`,
  );
}

/** Every person is placed at exactly one known location at the start of play. */
export function findPlacementIssues(cast: Obj): string[] {
  const locationIds = new Set(
    list(cast.locations).map((place) => text(record(place).id)),
  );
  return list(cast.suspects).flatMap((item, index) => {
    const placed = text(record(item).startLocationId);
    return locationIds.has(placed)
      ? []
      : [
          `suspect ${index + 1} needs a "startLocationId" naming the one location they are at when play begins`,
        ];
  });
}

/**
 * An item route that begins at the item's own location cannot be followed
 * before the players already know the item is there. At least one route must
 * start elsewhere.
 */
export function findCircularItemRoutes(
  routeSources: readonly string[],
  itemLocationId: string,
): string[] {
  if (!itemLocationId || !routeSources.length) return [];
  return routeSources.every((source) => source === itemLocationId)
    ? [
        `every route to the item starts at the item's own location (${itemLocationId}); start at least one elsewhere so players can reach it before they know where it is`,
      ]
    : [];
}
