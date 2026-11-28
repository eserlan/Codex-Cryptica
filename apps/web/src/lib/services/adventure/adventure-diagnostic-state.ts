import type { AdventureSession } from "@codex/adventure-engine";

export function diagnosticState(session: AdventureSession) {
  return {
    premise: session.premise,
    worldEntry: session.worldEntry,
    playerCharacter: session.playerCharacter,
    visibleState: session.visibleState,
    hiddenState: session.hiddenState,
    scenarioCollection: session.scenarioCollection ?? null,
    worldTime: session.worldTime ?? null,
    places: session.places ?? [],
    currentPlaceId: session.currentPlaceId ?? null,
    storySoFar: session.storySoFar ?? null,
    provisionalFacts: session.provisionalFacts,
    sourceRecords: session.sourceRecords,
    oocExchanges: session.oocExchanges ?? [],
    pendingRoll: session.pendingRoll ?? null,
  };
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffIdArray<T extends { id: string }>(
  prev: readonly T[] | undefined,
  next: readonly T[] | undefined,
): { added: T[]; updated: T[]; removedIds: string[] } | undefined {
  const prevList = prev ?? [];
  const nextList = next ?? [];
  const prevById = new Map(prevList.map((item) => [item.id, item]));
  const nextIds = new Set(nextList.map((item) => item.id));
  const added: T[] = [];
  const updated: T[] = [];
  for (const item of nextList) {
    const before = prevById.get(item.id);
    if (!before) {
      added.push(item);
    } else if (!jsonEqual(before, item)) {
      updated.push(item);
    }
  }
  const removedIds = prevList
    .filter((item) => !nextIds.has(item.id))
    .map((item) => item.id);
  if (added.length === 0 && updated.length === 0 && removedIds.length === 0) {
    return undefined;
  }
  return { added, updated, removedIds };
}

function diffObjectFields(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  arrayKeys: ReadonlySet<string>,
  keys: readonly string[] = Object.keys(next),
): Record<string, unknown> | undefined {
  const diff: Record<string, unknown> = {};
  for (const key of keys) {
    if (arrayKeys.has(key)) {
      const arrayDiff = diffIdArray(
        prev[key] as Array<{ id: string }> | undefined,
        next[key] as Array<{ id: string }> | undefined,
      );
      if (arrayDiff) diff[key] = arrayDiff;
    } else if (!jsonEqual(prev[key], next[key])) {
      diff[key] = next[key];
    }
  }
  return Object.keys(diff).length > 0 ? diff : undefined;
}

function diffOptionalObjectField(
  prev: unknown,
  next: unknown,
  idArrayKeys: Set<string>,
): unknown {
  if (jsonEqual(prev, next)) return undefined;
  if (!prev || !next) return next;
  return diffObjectFields(
    prev as Record<string, unknown>,
    next as Record<string, unknown>,
    idArrayKeys,
  );
}

const TOP_LEVEL_ARRAY_KEYS = [
  "places",
  "provisionalFacts",
  "sourceRecords",
  "oocExchanges",
] as const;

const NESTED_STATE_ARRAY_KEYS: Array<{
  key: "visibleState" | "hiddenState" | "scenarioCollection" | "worldTime";
  idArrayKeys: Set<string>;
}> = [
  {
    key: "visibleState",
    idArrayKeys: new Set([
      "objectives",
      "activeCharacters",
      "knownFacts",
      "relationships",
    ]),
  },
  {
    key: "hiddenState",
    idArrayKeys: new Set(["secrets", "gmThreads"]),
  },
  {
    key: "scenarioCollection",
    idArrayKeys: new Set(["items"]),
  },
  {
    key: "worldTime",
    idArrayKeys: new Set(["events"]),
  },
];

const SCALAR_STATE_KEYS = [
  "premise",
  "worldEntry",
  "playerCharacter",
  "currentPlaceId",
  "storySoFar",
  "pendingRoll",
] as const;

function diffNestedState(
  prev: ReturnType<typeof diagnosticState>,
  next: ReturnType<typeof diagnosticState>,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const { key, idArrayKeys } of NESTED_STATE_ARRAY_KEYS) {
    const diff = diffOptionalObjectField(prev[key], next[key], idArrayKeys);
    if (diff !== undefined) changes[key] = diff;
  }
  return changes;
}

export function diffDiagnosticState(
  prev: ReturnType<typeof diagnosticState>,
  next: ReturnType<typeof diagnosticState>,
): Record<string, unknown> {
  return {
    ...diffObjectFields(
      prev,
      next,
      new Set(TOP_LEVEL_ARRAY_KEYS),
      TOP_LEVEL_ARRAY_KEYS,
    ),
    ...diffNestedState(prev, next),
    ...diffObjectFields(prev, next, new Set(), SCALAR_STATE_KEYS),
  };
}

export interface DiagnosticBaseline {
  sessionId: string;
  revision: number;
  turnCount: number;
  state: ReturnType<typeof diagnosticState>;
}
