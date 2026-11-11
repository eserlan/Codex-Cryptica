import { MAX_PLACES } from "./schemas";
import { allocateId, existingIds, type IdFactory } from "./reducer-ids";
import type {
  AdventureSession,
  Place,
  PlaceMoveProposal,
  StateFact,
  VisibleStatePatch,
} from "./types";

const MAX_PLACE_NAME = 120;

export type PlaceStepResult = { ok: true } | { ok: false; message: string };

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const sameName = (a: string, b: string) =>
  clean(a).toLowerCase() === clean(b).toLowerCase();

/** The place the session starts in, from its world entry or its first known location text. */
function seedPlaceName(
  session: AdventureSession,
): Pick<Place, "name" | "sourceRecordId"> | undefined {
  const entry = session.worldEntry?.location;
  if (entry) {
    return {
      name: clean(entry.name).slice(0, MAX_PLACE_NAME),
      ...(entry.kind === "canonical" ? { sourceRecordId: entry.recordId } : {}),
    };
  }
  const text = session.visibleState.location?.text;
  return text ? { name: clean(text).slice(0, MAX_PLACE_NAME) } : undefined;
}

/** A new session's first place, so the opening turn's facts already belong somewhere. */
export function seedPlaces(
  session: AdventureSession,
  createId: IdFactory,
): Pick<AdventureSession, "places" | "currentPlaceId"> {
  const seed = seedPlaceName(session);
  if (!seed) return {};
  const id = allocateId(existingIds(session), createId);
  if (!id) return {};
  return { places: [{ id, ...seed }], currentPlaceId: id };
}

type Resolved = { places: Place[]; currentId: string | undefined };

function resolveMove(
  places: Place[],
  previousId: string | undefined,
  move: PlaceMoveProposal,
  ids: Set<string>,
  createId: IdFactory,
): Resolved | { error: string } {
  if (move.placeId) {
    const known = places.find((place) => place.id === move.placeId);
    return known
      ? { places, currentId: known.id }
      : { error: `unknown-place:${move.placeId}` };
  }
  const name = clean(move.name ?? "");
  if (!name) return { places, currentId: previousId };
  const existing = places.find((place) => sameName(place.name, name));
  if (existing) return { places, currentId: existing.id };
  // A full registry never fails a turn: the player is simply unplaced for now.
  if (places.length >= MAX_PLACES) return { places, currentId: undefined };
  const id = allocateId(ids, createId);
  if (!id) return { error: "id-allocation-failed" };
  const place: Place = {
    id,
    name: name.slice(0, MAX_PLACE_NAME),
    ...(move.relation ? { relation: move.relation } : {}),
  };
  return { places: [...places, place], currentId: id };
}

function touchedIds(patch: {
  add: StateFact[];
  update: StateFact[];
}): Set<string> {
  return new Set([...patch.add, ...patch.update].map((fact) => fact.id));
}

/**
 * Tag facts and people with where they belong, and move the player. The model
 * only declares a move; the engine does the bookkeeping, because a model asked
 * to maintain tags forgets them the same way it forgets to remove old facts.
 *
 * - Facts added or updated this turn belong to the place the player is in now.
 * - On a move, people not mentioned this turn stay at the place left behind.
 * Mutates `candidate` (already holding the turn's new visible state).
 */
export function applyPlaces(
  candidate: AdventureSession,
  previous: AdventureSession,
  move: PlaceMoveProposal | undefined,
  visiblePatch: VisibleStatePatch,
  createId: IdFactory,
): PlaceStepResult {
  const ids = existingIds(candidate);
  let places = previous.places;
  let previousId = previous.currentPlaceId;
  if (!places) {
    const seeded = seedPlaces(previous, createId);
    places = seeded.places;
    previousId = seeded.currentPlaceId;
    if (seeded.places) for (const place of seeded.places) ids.add(place.id);
  }
  let list = places ?? [];
  let currentId = previousId;
  if (move) {
    const resolved = resolveMove(list, previousId, move, ids, createId);
    if ("error" in resolved) return { ok: false, message: resolved.error };
    list = resolved.places;
    currentId = resolved.currentId;
  }
  if (list.length > 0) candidate.places = list;
  else delete candidate.places;
  if (currentId) candidate.currentPlaceId = currentId;
  else delete candidate.currentPlaceId;

  const moved = Boolean(move) && currentId !== previousId;
  const state = candidate.visibleState;
  const before = previous.visibleState;
  const tag = (
    key: "knownFacts" | "activeCharacters",
    parkLeftBehind: boolean,
  ) => {
    const touched = touchedIds(visiblePatch[key]);
    const earlier = new Map(before[key].map((fact) => [fact.id, fact]));
    state[key] = state[key].map((fact) => {
      if (fact.placeId) return fact;
      if (touched.has(fact.id)) {
        const stayed = !moved ? earlier.get(fact.id)?.placeId : undefined;
        const placeId = stayed ?? currentId;
        return placeId ? { ...fact, placeId } : fact;
      }
      return parkLeftBehind && moved && previousId
        ? { ...fact, placeId: previousId }
        : fact;
    });
  };
  tag("knownFacts", false);
  tag("activeCharacters", true);
  return { ok: true };
}

/** Facts with no place apply everywhere; placed facts apply only where the player is. */
export function isHere(
  fact: Pick<StateFact, "placeId">,
  session: Pick<AdventureSession, "currentPlaceId" | "places">,
): boolean {
  if (!fact.placeId || !session.currentPlaceId || !session.places?.length)
    return true;
  return fact.placeId === session.currentPlaceId;
}
