import { reconcileDuplicateActiveCharacters } from "./npc-presence";
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
  ...(place.aliases?.length ? { aliases: place.aliases } : {}),
  ...(place.sourceRecordId ? { canonical: true } : {}),
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
  const knownPeople = session.people?.length
    ? {
        knownPeople: session.people.map((person) => ({
          id: person.id,
          name: person.name,
          ...(person.aliases.length ? { aliases: person.aliases } : {}),
        })),
      }
    : {};
  const here = places?.find((place) => place.id === session.currentPlaceId);
  if (!places?.length) {
    return Object.keys(knownPeople).length > 0
      ? { ...session.visibleState, ...knownPeople }
      : session.visibleState;
  }
  const state = session.visibleState;
  const activeCharacters = reconcileDuplicateActiveCharacters(
    state.activeCharacters,
    session.people,
  );
  const elsewhere = places
    .filter((place) => place.id !== here?.id)
    .map((place) => ({
      ...describe(place),
      people: activeCharacters
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
    activeCharacters: activeCharacters
      .filter((fact) => isHere(fact, session))
      .map(withoutPlaceTag),
    knownFacts: state.knownFacts
      .filter((fact) => isHere(fact, session))
      .map(withoutPlaceTag),
    knownPlaces: places.map(describe),
    ...(here ? { currentPlace: describe(here) } : {}),
    ...(elsewhere.length > 0 ? { elsewhere } : {}),
    ...knownPeople,
    ...(session.scenes?.length
      ? {
          knownScenes: session.scenes.map((scene) => ({
            id: scene.id,
            placeId: scene.placeId,
            ...(scene.title ? { title: scene.title } : {}),
          })),
        }
      : {}),
  };
}

const MAX_PROMPT_ITEM_TEXT_CHARS = 1_200;
const MAX_PROMPT_STORY_CHARS = 6_000;

function trimHead(text: string, limit: number): string {
  if (text.length <= limit) return text;
  if (limit <= 0) return "";
  return `${text.slice(0, limit - 1)}…`;
}

function trimTail(text: string, limit: number): string {
  if (text.length <= limit) return text;
  if (limit <= 0) return "";
  return `…${text.slice(-(limit - 1))}`;
}

function capEntryText(entry: unknown, limit: number): unknown {
  if (!entry || typeof entry !== "object") return entry;
  const record = entry as Record<string, unknown>;
  let next: Record<string, unknown> | undefined;
  if (typeof record.text === "string" && record.text.length > limit) {
    next = { ...record, text: trimHead(record.text, limit) };
  }
  if (typeof record.summary === "string" && record.summary.length > limit) {
    next = { ...(next ?? record), summary: trimHead(record.summary, limit) };
  }
  return next ?? entry;
}

function largestFit(max: number, fits: (count: number) => boolean): number {
  let low = 0;
  let high = max;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(mid)) low = mid;
    else high = mid - 1;
  }
  return low;
}

function serializedFits(value: unknown, maxChars: number): boolean {
  return JSON.stringify(value).length <= maxChars;
}

type KeepFrom = "start" | "end";
type ArrayTarget = [Record<string, unknown> | undefined, string, KeepFrom];

function shrinkArrayTarget(
  root: Record<string, unknown>,
  maxChars: number,
  [container, key, keepFrom]: ArrayTarget,
): void {
  if (!container) return;
  const items = container[key];
  if (
    !Array.isArray(items) ||
    !items.length ||
    serializedFits(root, maxChars)
  ) {
    return;
  }
  const slice = (count: number) =>
    count <= 0
      ? []
      : keepFrom === "end"
        ? items.slice(items.length - count)
        : items.slice(0, count);
  container[key] = [];
  if (!serializedFits(root, maxChars)) return;
  const keep = largestFit(items.length, (count) => {
    container[key] = slice(count);
    return serializedFits(root, maxChars);
  });
  container[key] = slice(keep);
}

function capObjectArrayKeys(
  container: Record<string, unknown> | undefined,
  keys: readonly string[],
  limit: number,
): void {
  if (!container) return;
  for (const key of keys) {
    const items = container[key];
    if (Array.isArray(items)) {
      container[key] = items.map((item) => capEntryText(item, limit));
    }
  }
}

function cloneObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? { ...(value as Record<string, unknown>) }
    : undefined;
}

function shrinkStorySoFar(
  bounded: Record<string, unknown>,
  maxChars: number,
): boolean {
  if (typeof bounded.storySoFar !== "string" || !bounded.storySoFar) {
    return false;
  }
  const story = bounded.storySoFar;
  bounded.storySoFar = undefined;
  if (!serializedFits(bounded, maxChars)) return false;
  const keep = largestFit(story.length, (len) => {
    bounded.storySoFar = len === 0 ? undefined : trimTail(story, len);
    return serializedFits(bounded, maxChars);
  });
  bounded.storySoFar = keep === 0 ? undefined : trimTail(story, keep);
  return true;
}

function shrinkVisibleTextFact(
  bounded: Record<string, unknown>,
  visible: Record<string, unknown>,
  key: "situation" | "location",
  maxChars: number,
): boolean {
  const fact = cloneObject(visible[key]);
  if (!fact || typeof fact.text !== "string") return false;
  const original = fact.text;
  visible[key] = { ...fact, text: "" };
  if (!serializedFits(bounded, maxChars)) return false;
  const keep = largestFit(original.length, (len) => {
    visible[key] = { ...fact, text: trimHead(original, len) };
    return serializedFits(bounded, maxChars);
  });
  visible[key] = { ...fact, text: trimHead(original, keep) };
  return true;
}

function shrinkFallbackStrings(
  bounded: Record<string, unknown>,
  visible: Record<string, unknown> | undefined,
  maxChars: number,
): void {
  if (shrinkStorySoFar(bounded, maxChars) || !visible) return;
  if (shrinkVisibleTextFact(bounded, visible, "situation", maxChars)) return;
  shrinkVisibleTextFact(bounded, visible, "location", maxChars);
}

/**
 * Bounds a projected prompt-state payload to `maxChars` without mutating the
 * durable session. Only activates when the full projection exceeds `maxChars`.
 */
export function boundPromptState<T extends Record<string, unknown>>(
  state: T,
  maxChars: number,
): T {
  if (serializedFits(state, maxChars)) return state;

  const bounded: Record<string, unknown> = { ...state };
  const visible = cloneObject(bounded.playerVisibleState);
  if (visible) bounded.playerVisibleState = visible;
  const gmState = cloneObject(bounded["GM-ONLY state"]);
  if (gmState) bounded["GM-ONLY state"] = gmState;
  const playerScenarios = cloneObject(bounded.playerScenarios);
  if (playerScenarios) bounded.playerScenarios = playerScenarios;

  if (
    typeof bounded.storySoFar === "string" &&
    bounded.storySoFar.length > MAX_PROMPT_STORY_CHARS
  ) {
    bounded.storySoFar = trimTail(bounded.storySoFar, MAX_PROMPT_STORY_CHARS);
  }
  capObjectArrayKeys(
    visible,
    ["knownFacts", "objectives", "activeCharacters", "relationships"],
    MAX_PROMPT_ITEM_TEXT_CHARS,
  );
  capObjectArrayKeys(bounded, ["provisionalFacts"], MAX_PROMPT_ITEM_TEXT_CHARS);
  capObjectArrayKeys(
    gmState,
    ["secrets", "gmThreads"],
    MAX_PROMPT_ITEM_TEXT_CHARS,
  );
  if (serializedFits(bounded, maxChars)) return bounded as T;

  const targets: ArrayTarget[] = [
    [visible, "elsewhere", "end"],
    [visible, "knownScenes", "end"],
    [visible, "knownPlaces", "end"],
    [visible, "knownPeople", "end"],
    [bounded, "oocExchanges", "end"],
    [bounded, "provisionalFacts", "end"],
    [visible, "knownFacts", "end"],
    [visible, "relationships", "end"],
    [visible, "activeCharacters", "end"],
    [visible, "objectives", "end"],
    [gmState, "gmThreads", "end"],
    [gmState, "secrets", "end"],
    [playerScenarios, "scenarios", "start"],
    [bounded, "GM-ONLY scenarios", "start"],
  ];
  for (const target of targets) {
    shrinkArrayTarget(bounded, maxChars, target);
    if (serializedFits(bounded, maxChars)) return bounded as T;
  }

  shrinkFallbackStrings(bounded, visible, maxChars);
  return bounded as T;
}
