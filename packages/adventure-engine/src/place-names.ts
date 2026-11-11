import { MAX_PLACE_ALIASES } from "./schemas";
import type { Place } from "./types";

const MAX_NAME = 120;

/** Lower case, accents and punctuation removed, spaces collapsed, a leading "the" dropped. */
export function normalizePlaceName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/^the\s+/, "");
}

const words = (normalized: string) =>
  normalized ? normalized.split(" ").length : 0;

function namesOf(place: Place): string[] {
  return [place.name, ...(place.aliases ?? [])].map(normalizePlaceName);
}

export interface PlaceMatch {
  place: Place;
  /** True when the name only extends a known one, so it should be remembered as an alias. */
  extended: boolean;
}

/**
 * Find the place a name refers to. A name matches when it is the same as a known
 * name or alias once case, punctuation and a leading "the" are ignored. A name
 * that continues a known two-word-or-longer name at a word boundary also matches
 * ("Tiny village in the high slopes" for "Tiny village"); when it continues several,
 * the longest known name wins. A tie matches nothing, so a new place is made
 * instead of guessing.
 */
export function matchPlace(
  places: Place[],
  name: string,
): PlaceMatch | undefined {
  const wanted = normalizePlaceName(name);
  if (!wanted) return undefined;
  const exact = places.find((place) => namesOf(place).includes(wanted));
  if (exact) return { place: exact, extended: false };
  // Each place counts by its longest known name that the new name continues; the
  // place with the longest such name wins, and a tie matches nothing.
  const reach = places.map((place) => ({
    place,
    length: Math.max(
      0,
      ...namesOf(place)
        .filter((known) => words(known) >= 2 && wanted.startsWith(`${known} `))
        .map((known) => known.length),
    ),
  }));
  const best = Math.max(0, ...reach.map((entry) => entry.length));
  const winners = reach.filter((entry) => best > 0 && entry.length === best);
  return winners.length === 1
    ? { place: winners[0]!.place, extended: true }
    : undefined;
}

/** The place with one more alias, unless it is already known by that name or has no room left. */
export function withAlias(place: Place, name: string): Place {
  const alias = name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  const known = namesOf(place);
  if (
    !alias ||
    known.includes(normalizePlaceName(alias)) ||
    (place.aliases?.length ?? 0) >= MAX_PLACE_ALIASES
  )
    return place;
  return { ...place, aliases: [...(place.aliases ?? []), alias] };
}

/** What the Vault offers for linking a place to a record. */
export interface PlaceRecordCandidate {
  id: string;
  title: string;
  type: string;
}

/** The place's Vault record: kept if it still exists, dropped if it is gone, found by exact title if there is none. */
function relinked(
  place: Place,
  candidates: PlaceRecordCandidate[],
  ids: Set<string>,
): Place {
  if (place.sourceRecordId) {
    if (ids.has(place.sourceRecordId)) return place;
    const { sourceRecordId: _gone, ...rest } = place;
    return rest;
  }
  const names = new Set(namesOf(place));
  const matches = candidates.filter(
    (record) =>
      record.type === "location" && names.has(normalizePlaceName(record.title)),
  );
  // The title already equals a known name (that is how it matched), so no alias is needed.
  return matches.length === 1
    ? { ...place, sourceRecordId: matches[0]!.id }
    : place;
}

/**
 * Tie places to the Vault's location records by exact title, and drop a link whose
 * record has been deleted. Returns the new list, or undefined when nothing changed.
 * Only an exact, unique title match links: a looser match would anchor the wrong record.
 */
export function linkPlaceRecords(
  places: Place[] | undefined,
  candidates: PlaceRecordCandidate[],
): Place[] | undefined {
  if (!places?.length) return undefined;
  const ids = new Set(candidates.map((record) => record.id));
  const next = places.map((place) => relinked(place, candidates, ids));
  return next.some((place, i) => place !== places[i]) ? next : undefined;
}
