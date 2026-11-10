import { allocateId, type IdFactory } from "./reducer-ids";
import type {
  AdventureSession,
  CollectionPatch,
  HiddenStatePatch,
  HiddenStateProposalPatch,
  NewStateFact,
  Result,
  StateFact,
  VisibleStatePatch,
  VisibleStateProposalPatch,
} from "./types";

function materializeCollectionPatch<T extends { id: string }, TNew>(
  patch: { add: TNew[]; update: T[]; removeIds: string[] },
  ids: Set<string>,
  createId: IdFactory,
): Result<CollectionPatch<T>, string> {
  const add: T[] = [];
  for (const entry of patch.add) {
    const id = allocateId(ids, createId);
    if (!id) return { ok: false, errors: "id-allocation-failed" };
    add.push({ ...entry, id } as unknown as T);
  }
  return {
    ok: true,
    value: { add, update: patch.update, removeIds: patch.removeIds },
  };
}

function materializeOptionalFact(
  fact: NewStateFact | null | undefined,
  ids: Set<string>,
  createId: IdFactory,
): StateFact | null | undefined {
  if (fact === undefined || fact === null) return fact;
  const id = allocateId(ids, createId);
  return id ? { ...fact, id } : null;
}

export function materializeVisiblePatch(
  patch: VisibleStateProposalPatch,
  ids: Set<string>,
  createId: IdFactory,
): Result<VisibleStatePatch, string> {
  const location = materializeOptionalFact(patch.location, ids, createId);
  const situation = materializeOptionalFact(patch.situation, ids, createId);
  if ((patch.location && !location) || (patch.situation && !situation)) {
    return { ok: false, errors: "id-allocation-failed" };
  }
  const collections = materializeVisibleCollections(patch, ids, createId);
  if (!collections.ok) return collections;
  return { ok: true, value: { location, situation, ...collections.value } };
}

function materializeVisibleCollections(
  patch: VisibleStateProposalPatch,
  ids: Set<string>,
  createId: IdFactory,
): Result<Omit<VisibleStatePatch, "location" | "situation">, string> {
  const objectives = materializeCollectionPatch(
    patch.objectives,
    ids,
    createId,
  );
  const activeCharacters = materializeCollectionPatch(
    patch.activeCharacters,
    ids,
    createId,
  );
  const knownFacts = materializeCollectionPatch(
    patch.knownFacts,
    ids,
    createId,
  );
  const relationships = materializeCollectionPatch(
    patch.relationships,
    ids,
    createId,
  );
  if (!objectives.ok) return objectives;
  if (!activeCharacters.ok) return activeCharacters;
  if (!knownFacts.ok) return knownFacts;
  if (!relationships.ok) return relationships;
  return {
    ok: true,
    value: {
      objectives: objectives.value,
      activeCharacters: activeCharacters.value,
      knownFacts: knownFacts.value,
      relationships: relationships.value,
    },
  };
}

export function materializeHiddenPatch(
  patch: HiddenStateProposalPatch,
  ids: Set<string>,
  createId: IdFactory,
): Result<HiddenStatePatch, string> {
  const secrets = materializeCollectionPatch(patch.secrets, ids, createId);
  const gmThreads = materializeCollectionPatch(patch.gmThreads, ids, createId);
  if (!secrets.ok) return secrets;
  if (!gmThreads.ok) return gmThreads;
  return {
    ok: true,
    value: { secrets: secrets.value, gmThreads: gmThreads.value },
  };
}

function patchCollection<T extends { id: string }>(
  current: T[],
  patch: CollectionPatch<T>,
): Result<T[], string> {
  const ids = new Set(current.map((entry) => entry.id));
  const addIds = new Set<string>();
  for (const entry of patch.add) {
    if (ids.has(entry.id) || addIds.has(entry.id))
      return { ok: false, errors: `duplicate:${entry.id}` };
    addIds.add(entry.id);
  }
  for (const entry of patch.update) {
    if (!ids.has(entry.id) || patch.removeIds.includes(entry.id)) {
      return { ok: false, errors: `unknown-update:${entry.id}` };
    }
  }
  if (new Set(patch.removeIds).size !== patch.removeIds.length) {
    return { ok: false, errors: "duplicate-removal" };
  }
  const remove = new Set(patch.removeIds);
  return {
    ok: true,
    value: [
      ...current
        .filter((entry) => !remove.has(entry.id))
        .map(
          (entry) =>
            patch.update.find((updated) => updated.id === entry.id) ?? entry,
        ),
      ...patch.add,
    ],
  };
}

export function applyVisiblePatch(
  state: AdventureSession["visibleState"],
  patch: VisibleStatePatch,
): Result<AdventureSession["visibleState"], string> {
  const next = structuredClone(state);
  if (patch.location !== undefined) next.location = patch.location ?? undefined;
  if (patch.situation !== undefined)
    next.situation = patch.situation ?? undefined;
  for (const key of [
    "objectives",
    "activeCharacters",
    "knownFacts",
    "relationships",
  ] as const) {
    const result = patchCollection(next[key], patch[key]);
    if (!result.ok) return result;
    next[key] = result.value as never;
  }
  return { ok: true, value: next };
}

export function applyHiddenPatch(
  state: AdventureSession["hiddenState"],
  patch: HiddenStatePatch,
): Result<AdventureSession["hiddenState"], string> {
  const next = structuredClone(state);
  for (const key of ["secrets", "gmThreads"] as const) {
    const result = patchCollection(next[key], patch[key]);
    if (!result.ok) return result;
    next[key] = result.value as never;
  }
  return { ok: true, value: next };
}
