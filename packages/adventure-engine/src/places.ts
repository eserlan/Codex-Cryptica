import { MAX_PLACES } from "./schemas";
import { matchPlace, withAlias } from "./place-names";
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

/** The known place a name refers to; a longer variant of its name is remembered as an alias. */
function resolveKnownName(places: Place[], name: string): Resolved | undefined {
  const match = matchPlace(places, name);
  if (!match) return undefined;
  const renamed = match.extended ? withAlias(match.place, name) : match.place;
  return {
    places:
      renamed === match.place
        ? places
        : places.map((place) => (place === match.place ? renamed : place)),
    currentId: match.place.id,
  };
}

function createPlace(
  places: Place[],
  name: string,
  relation: string | undefined,
  cues: readonly string[] | undefined,
  ids: Set<string>,
  createId: IdFactory,
): Resolved | { error: string } {
  // A full registry never fails a turn: the player is simply unplaced for now.
  if (places.length >= MAX_PLACES) return { places, currentId: undefined };
  const id = allocateId(ids, createId);
  if (!id) return { error: "id-allocation-failed" };
  const place: Place = {
    id,
    name: name.slice(0, MAX_PLACE_NAME),
    ...(relation ? { relation } : {}),
    ...(cues?.length ? { cues: [...cues] } : {}),
  };
  return { places: [...places, place], currentId: id };
}

function resolveMove(
  places: Place[],
  previousId: string | undefined,
  move: PlaceMoveProposal,
  ids: Set<string>,
  createId: IdFactory,
): Resolved | { error: string } {
  const known = move.placeId
    ? places.find((place) => place.id === move.placeId)
    : undefined;
  if (known) return { places, currentId: known.id };
  // An id the model got wrong (invented, or copied from another kind of record)
  // is ignored rather than failing the player's turn: use the name if there is
  // one, otherwise the player stays where they were.
  const name = clean(move.name ?? "");
  if (!name) return { places, currentId: previousId };
  return (
    resolveKnownName(places, name) ??
    createPlace(places, name, move.relation, move.cues, ids, createId)
  );
}

function touchedIds(patch: {
  add: StateFact[];
  update: StateFact[];
}): Set<string> {
  return new Set([...patch.add, ...patch.update].map((fact) => fact.id));
}

interface TagContext {
  touched: Set<string>;
  earlier: Map<string, StateFact>;
  moved: boolean;
  currentId: string | undefined;
  previousId: string | undefined;
  /** People not mentioned in a move turn stay where the player left them. */
  park: boolean;
}

function placeFor(fact: StateFact, c: TagContext): string | undefined {
  if (c.touched.has(fact.id)) {
    const stayed = c.moved ? undefined : c.earlier.get(fact.id)?.placeId;
    return stayed ?? c.currentId;
  }
  return c.park && c.moved ? c.previousId : undefined;
}

function tagFact(fact: StateFact, c: TagContext): StateFact {
  if (c.touched.has(fact.id)) {
    const { placeId: _modelPlaceId, ...withoutModelPlace } = fact;
    const placeId = placeFor(fact, c);
    return placeId ? { ...withoutModelPlace, placeId } : withoutModelPlace;
  }
  if (fact.placeId) return fact;
  const placeId = placeFor(fact, c);
  return placeId ? { ...fact, placeId } : fact;
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
function resolveSeededPlaces(
  previous: AdventureSession,
  ids: Set<string>,
  createId: IdFactory,
): {
  places: Place[];
  currentId: string | undefined;
  previousId: string | undefined;
} {
  if (previous.places) {
    return {
      places: previous.places,
      currentId: previous.currentPlaceId,
      previousId: previous.currentPlaceId,
    };
  }
  const seeded = seedPlaces(previous, createId);
  if (seeded.places) {
    for (const place of seeded.places) ids.add(place.id);
  }
  return {
    places: seeded.places ?? [],
    currentId: seeded.currentPlaceId,
    previousId: seeded.currentPlaceId,
  };
}

function applyActivePlaceCues(
  list: Place[],
  currentId: string | undefined,
  placeCues: readonly string[] | undefined,
  moveCues: readonly string[] | undefined,
): Place[] {
  const activeCues = placeCues?.length ? placeCues : moveCues;
  if (!currentId || !activeCues?.length) return list;
  return list.map((place) =>
    place.id === currentId && !place.cues?.length
      ? { ...place, cues: [...activeCues] }
      : place,
  );
}

export function applyPlaces(
  candidate: AdventureSession,
  previous: AdventureSession,
  move: PlaceMoveProposal | undefined,
  visiblePatch: VisibleStatePatch,
  createId: IdFactory,
  placeCues?: readonly string[],
): PlaceStepResult {
  const ids = existingIds(candidate);
  const seeded = resolveSeededPlaces(previous, ids, createId);
  let list = seeded.places;
  let currentId = seeded.currentId;
  if (move) {
    const resolved = resolveMove(list, seeded.previousId, move, ids, createId);
    if ("error" in resolved) return { ok: false, message: resolved.error };
    list = resolved.places;
    currentId = resolved.currentId;
  }
  list = applyActivePlaceCues(list, currentId, placeCues, move?.cues);
  if (list.length > 0) candidate.places = list;
  else delete candidate.places;
  if (currentId) candidate.currentPlaceId = currentId;
  else delete candidate.currentPlaceId;

  const moved = Boolean(move) && currentId !== seeded.previousId;
  const state = candidate.visibleState;
  const tag = (key: "knownFacts" | "activeCharacters", park: boolean) => {
    const context: TagContext = {
      touched: touchedIds(visiblePatch[key]),
      earlier: new Map(
        previous.visibleState[key].map((fact) => [fact.id, fact]),
      ),
      moved,
      currentId,
      previousId: seeded.previousId,
      park,
    };
    state[key] = state[key].map((fact) => tagFact(fact, context));
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
  if (!fact.placeId || !session.places?.length) return true;
  return fact.placeId === session.currentPlaceId;
}
