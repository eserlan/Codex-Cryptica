import { isHere } from "./places";
import type {
  AdventureSession,
  Place,
  StateFact,
  VisibleAdventureState,
} from "./types";

const MAX_ELSEWHERE_PER_PLACE = 5;
const MAX_ELSEWHERE_TEXT = 120;

const describe = (place: Place) => ({
  id: place.id,
  name: place.name,
  ...(place.relation ? { relation: place.relation } : {}),
});

const brief = (text: string) =>
  text.length <= MAX_ELSEWHERE_TEXT
    ? text
    : `${text.slice(0, MAX_ELSEWHERE_TEXT - 1)}…`;

function withoutPlaceTag(fact: StateFact): StateFact {
  const { placeId: _placeId, ...rest } = fact;
  return rest;
}

/**
 * What the model sees of the player-visible state. People and facts tied to the
 * place the player is in (or tied to none) are sent in full; those tied to other
 * places are sent as short notes grouped by place, so a long adventure does not
 * keep every old place at full weight. If the registry is full and the player is
 * unplaced, only untagged records are sent in full and all known places stay brief.
 */
export function projectVisibleState(
  session: AdventureSession,
): VisibleAdventureState | Record<string, unknown> {
  const places = session.places;
  const here = places?.find((place) => place.id === session.currentPlaceId);
  if (!places?.length) return session.visibleState;
  const state = session.visibleState;
  const elsewhere = places
    .filter((place) => place.id !== here?.id)
    .map((place) => ({
      ...describe(place),
      people: state.activeCharacters
        .filter((fact) => fact.placeId === place.id)
        .slice(-MAX_ELSEWHERE_PER_PLACE)
        .map((fact) => brief(fact.text)),
      facts: state.knownFacts
        .filter((fact) => fact.placeId === place.id)
        .slice(-MAX_ELSEWHERE_PER_PLACE)
        .map((fact) => brief(fact.text)),
    }))
    .filter((place) => place.people.length > 0 || place.facts.length > 0);
  return {
    ...state,
    activeCharacters: state.activeCharacters
      .filter((fact) => isHere(fact, session))
      .map(withoutPlaceTag),
    knownFacts: state.knownFacts
      .filter((fact) => isHere(fact, session))
      .map(withoutPlaceTag),
    knownPlaces: places.map(describe),
    ...(here ? { currentPlace: describe(here) } : {}),
    ...(elsewhere.length > 0 ? { elsewhere } : {}),
  };
}
