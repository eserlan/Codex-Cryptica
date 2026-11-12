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
  return patchCollections(next, patch, [
    "objectives",
    "activeCharacters",
    "knownFacts",
    "relationships",
  ]);
}

export function applyHiddenPatch(
  state: AdventureSession["hiddenState"],
  patch: HiddenStatePatch,
): Result<AdventureSession["hiddenState"], string> {
  const next = structuredClone(state);
  return patchCollections(next, patch, ["secrets", "gmThreads"]);
}

function patchCollections<
  K extends string,
  T extends Record<K, { id: string }[]>,
>(
  current: T,
  patch: { [P in K]: CollectionPatch<T[P][number]> },
  keys: readonly K[],
): Result<T, string> {
  for (const key of keys) {
    const result = patchCollection(current[key], patch[key]);
    if (!result.ok) return result;
    current[key] = result.value as T[K];
  }
  return { ok: true, value: current };
}

/**
 * Drop the parts of a collection patch that cannot apply: an update to an entry
 * that is not there (or is removed in the same patch) and a repeated removal. Each
 * is a model slip that corrupts nothing, so the rest of the patch still applies.
 */
function sanitizeCollectionPatch<T extends { id: string }>(
  label: string,
  current: T[],
  patch: CollectionPatch<T>,
  dropped: string[],
): CollectionPatch<T> {
  const ids = new Set(current.map((entry) => entry.id));
  const removeIds = [...new Set(patch.removeIds)];
  if (removeIds.length !== patch.removeIds.length)
    dropped.push(`${label}: repeated removal`);
  const update = patch.update.filter((entry) => {
    const ok = ids.has(entry.id) && !removeIds.includes(entry.id);
    if (!ok) dropped.push(`${label}: update of unknown entry ${entry.id}`);
    return ok;
  });
  return { add: patch.add, update, removeIds };
}

export function sanitizeVisiblePatch(
  state: AdventureSession["visibleState"],
  patch: VisibleStatePatch,
  dropped: string[],
): VisibleStatePatch {
  return {
    ...patch,
    objectives: sanitizeCollectionPatch(
      "objectives",
      state.objectives,
      patch.objectives,
      dropped,
    ),
    activeCharacters: sanitizeCollectionPatch(
      "activeCharacters",
      state.activeCharacters,
      patch.activeCharacters,
      dropped,
    ),
    knownFacts: sanitizeCollectionPatch(
      "knownFacts",
      state.knownFacts,
      patch.knownFacts,
      dropped,
    ),
    relationships: sanitizeCollectionPatch(
      "relationships",
      state.relationships,
      patch.relationships,
      dropped,
    ),
  };
}

export function sanitizeHiddenPatch(
  state: AdventureSession["hiddenState"],
  patch: HiddenStatePatch,
  dropped: string[],
): HiddenStatePatch {
  return {
    secrets: sanitizeCollectionPatch(
      "secrets",
      state.secrets,
      patch.secrets,
      dropped,
    ),
    gmThreads: sanitizeCollectionPatch(
      "gmThreads",
      state.gmThreads,
      patch.gmThreads,
      dropped,
    ),
  };
}
