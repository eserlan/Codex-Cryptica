import type { AdventureJsonV1 } from "./schema";
import type { StoredAdventurePackage } from "./storage";

export const ADVENTURE_CORRESPONDENCE_EXTENSION_KEY =
  "codex-cryptica.adventure-correspondence" as const;

export const ADVENTURE_JSON_COLLECTIONS = [
  "locations",
  "actors",
  "factions",
  "scenes",
  "encounters",
  "clues",
  "rumours",
  "items",
  "secrets",
  "endings",
  "unresolved",
] as const;

export type AdventureJsonCollectionName =
  (typeof ADVENTURE_JSON_COLLECTIONS)[number];

export interface AdventureJsonCorrespondingEntry {
  previousId: string;
  currentId: string;
  collection: string;
}

export interface AdventureJsonDiffEntry {
  id: string;
  title: string;
  changedFields: string[];
  previousId?: string;
}

export interface AdventureJsonCollectionDiff {
  collection: AdventureJsonCollectionName;
  added: AdventureJsonDiffEntry[];
  removed: AdventureJsonDiffEntry[];
  changed: AdventureJsonDiffEntry[];
}

export type AdventureJsonUnresolvedKind =
  "removed" | "added" | "split" | "merge" | "invalid-mapping";

export interface AdventureJsonDiffUnresolved {
  kind: AdventureJsonUnresolvedKind;
  collection: string;
  ids: string[];
  reason: string;
}

export interface AdventureJsonDiffGroup {
  kind: "split" | "merge";
  collection: string;
  previousIds: string[];
  currentIds: string[];
  reason: string;
}

export interface AdventureJsonVersionDiff {
  packageChangedFields: string[];
  collections: Record<AdventureJsonCollectionName, AdventureJsonCollectionDiff>;
  groups: AdventureJsonDiffGroup[];
  unresolved: AdventureJsonDiffUnresolved[];
}

export interface AdventureJsonVersionCandidate {
  hash: string;
  package: AdventureJsonV1;
}

function sortKeysRecursively(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const inner = record[key];
    if (inner !== undefined) {
      sorted[key] = sortKeysRecursively(inner);
    }
  }
  return sorted;
}

function canonicalStringify(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return JSON.stringify(value) ?? "null";
  }
  return JSON.stringify(sortKeysRecursively(value));
}

function entityTitle(entity: Record<string, unknown>): string {
  for (const key of ["name", "title", "text", "description", "message"]) {
    const value = entity[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  const id = entity["id"];
  return typeof id === "string" ? id : "Untitled";
}

function changedTopLevelFields(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (key === "id") continue;
    if (canonicalStringify(previous[key]) !== canonicalStringify(next[key])) {
      changed.push(key);
    }
  }
  return changed.sort();
}

function parseSemVer(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
} | null {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.exec(
      version,
    );
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

/** Compares two strict SemVer strings. Returns -1, 0, or 1. */
export function compareAdventureJsonVersion(a: string, b: string): number {
  const pa = parseSemVer(a);
  const pb = parseSemVer(b);
  if (!pa || !pb) return a < b ? -1 : a > b ? 1 : 0;
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  if (pa.prerelease.length === 0 && pb.prerelease.length === 0) return 0;
  if (pa.prerelease.length === 0) return 1;
  if (pb.prerelease.length === 0) return -1;
  const length = Math.max(pa.prerelease.length, pb.prerelease.length);
  for (let i = 0; i < length; i += 1) {
    const xa = pa.prerelease[i];
    const xb = pb.prerelease[i];
    if (xa === undefined) return -1;
    if (xb === undefined) return 1;
    if (xa === xb) continue;
    const na = /^\d+$/.test(xa) ? Number(xa) : null;
    const nb = /^\d+$/.test(xb) ? Number(xb) : null;
    if (na !== null && nb !== null) return na < nb ? -1 : 1;
    if (na !== null) return -1;
    if (nb !== null) return 1;
    return xa < xb ? -1 : 1;
  }
  return 0;
}

export function isAdventureJsonVersionGreater(
  candidate: string,
  predecessor: string,
): boolean {
  return compareAdventureJsonVersion(candidate, predecessor) > 0;
}

/**
 * Chooses the deterministic predecessor for a diff among approved packages
 * with the same `id`: same `version` with a different hash wins, otherwise the
 * highest SemVer `version`, remaining ties broken by hash ascending.
 */
export function selectAdventureJsonPredecessor(
  candidates: AdventureJsonVersionCandidate[],
  incoming: AdventureJsonV1,
  incomingHash?: string,
): AdventureJsonVersionCandidate | null {
  const sameId = candidates.filter(
    (candidate) =>
      candidate.package.id === incoming.id &&
      (incomingHash === undefined || candidate.hash !== incomingHash),
  );
  if (sameId.length === 0) return null;
  const sameVersion = sameId
    .filter((candidate) => candidate.package.version === incoming.version)
    .sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0));
  if (sameVersion.length > 0) return sameVersion[0];
  return [...sameId].sort((a, b) => {
    const byVersion = compareAdventureJsonVersion(
      b.package.version,
      a.package.version,
    );
    if (byVersion !== 0) return byVersion;
    return a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0;
  })[0];
}

type EntityRecord = Record<string, unknown>;

function entitiesOf(
  pkg: AdventureJsonV1,
  collection: AdventureJsonCollectionName,
): EntityRecord[] {
  return (pkg[collection] as EntityRecord[]) ?? [];
}

interface MappingOutcome {
  pairs: Map<string, string>;
  groups: AdventureJsonDiffGroup[];
  groupedPrevious: Set<string>;
  groupedCurrent: Set<string>;
  invalid: AdventureJsonDiffUnresolved[];
}

function parseCorrespondence(
  previous: AdventureJsonV1,
  next: AdventureJsonV1,
): MappingOutcome {
  const pairs = new Map<string, string>();
  const groups: AdventureJsonDiffGroup[] = [];
  const groupedPrevious = new Set<string>();
  const groupedCurrent = new Set<string>();
  const invalid: AdventureJsonDiffUnresolved[] = [];

  const raw = next.extensions?.[ADVENTURE_CORRESPONDENCE_EXTENSION_KEY];
  if (raw === undefined)
    return { pairs, groups, groupedPrevious, groupedCurrent, invalid };
  if (!Array.isArray(raw)) {
    invalid.push({
      kind: "invalid-mapping",
      collection: "",
      ids: [],
      reason: `Extension "${ADVENTURE_CORRESPONDENCE_EXTENSION_KEY}" must be an array of correspondence entries.`,
    });
    return { pairs, groups, groupedPrevious, groupedCurrent, invalid };
  }

  const knownCollections = new Set<string>(ADVENTURE_JSON_COLLECTIONS);
  const byPrevious = new Map<string, string[]>();
  const byCurrent = new Map<string, string[]>();
  const validEntries: AdventureJsonCorrespondingEntry[] = [];

  for (const entry of raw) {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      typeof (entry as Record<string, unknown>)["previousId"] !== "string" ||
      typeof (entry as Record<string, unknown>)["currentId"] !== "string" ||
      typeof (entry as Record<string, unknown>)["collection"] !== "string"
    ) {
      invalid.push({
        kind: "invalid-mapping",
        collection:
          entry &&
          typeof entry === "object" &&
          typeof (entry as Record<string, unknown>)["collection"] === "string"
            ? ((entry as Record<string, unknown>)["collection"] as string)
            : "",
        ids: [],
        reason:
          "Correspondence entry is malformed; it needs string previousId, currentId, and collection fields.",
      });
      continue;
    }
    const previousId = (entry as Record<string, unknown>)[
      "previousId"
    ] as string;
    const currentId = (entry as Record<string, unknown>)["currentId"] as string;
    const collection = (entry as Record<string, unknown>)[
      "collection"
    ] as string;
    if (!knownCollections.has(collection)) {
      invalid.push({
        kind: "invalid-mapping",
        collection,
        ids: [previousId, currentId],
        reason: `Correspondence entry names unknown collection "${collection}".`,
      });
      continue;
    }
    const name = collection as AdventureJsonCollectionName;
    const previousIds = new Set(
      entitiesOf(previous, name).map((e) => e["id"] as string),
    );
    const currentIds = new Set(
      entitiesOf(next, name).map((e) => e["id"] as string),
    );
    if (!previousIds.has(previousId) || !currentIds.has(currentId)) {
      invalid.push({
        kind: "invalid-mapping",
        collection,
        ids: [previousId, currentId],
        reason: `Correspondence entry pairs "${previousId}" to "${currentId}" but at least one of those IDs does not exist in "${collection}".`,
      });
      continue;
    }
    if (
      previousId !== currentId &&
      (currentIds.has(previousId) || previousIds.has(currentId))
    ) {
      invalid.push({
        kind: "invalid-mapping",
        collection,
        ids: [previousId, currentId],
        reason: `Correspondence entry pairing "${previousId}" to "${currentId}" conflicts with a same-ID match in "${collection}".`,
      });
      continue;
    }
    if (previousId === currentId) continue;
    validEntries.push({ previousId, currentId, collection });
    const prevList = byPrevious.get(previousId) ?? [];
    prevList.push(currentId);
    byPrevious.set(previousId, prevList);
    const currList = byCurrent.get(currentId) ?? [];
    currList.push(previousId);
    byCurrent.set(currentId, currList);
  }

  for (const entry of validEntries) {
    const isSplit = (byPrevious.get(entry.previousId)?.length ?? 0) > 1;
    const isMerge = (byCurrent.get(entry.currentId)?.length ?? 0) > 1;
    if (!isSplit && !isMerge) {
      const key = `${entry.collection}:${entry.previousId}`;
      if (!pairs.has(key)) pairs.set(key, entry.currentId);
    }
  }

  const seenGroups = new Set<string>();
  for (const entry of validEntries) {
    const isSplit = (byPrevious.get(entry.previousId)?.length ?? 0) > 1;
    const isMerge = (byCurrent.get(entry.currentId)?.length ?? 0) > 1;
    if (isSplit) {
      const key = `split:${entry.collection}:${entry.previousId}`;
      if (seenGroups.has(key)) continue;
      seenGroups.add(key);
      const currentIds = [...(byPrevious.get(entry.previousId) ?? [])].sort();
      for (const id of currentIds)
        groupedCurrent.add(`${entry.collection}:${id}`);
      groupedPrevious.add(`${entry.collection}:${entry.previousId}`);
      groups.push({
        kind: "split",
        collection: entry.collection,
        previousIds: [entry.previousId],
        currentIds,
        reason: `Split in "${entry.collection}": "${entry.previousId}" corresponds to ${currentIds.length} current entries and needs reviewer confirmation.`,
      });
    }
    if (isMerge) {
      const key = `merge:${entry.collection}:${entry.currentId}`;
      if (seenGroups.has(key)) continue;
      seenGroups.add(key);
      const previousIds = [...(byCurrent.get(entry.currentId) ?? [])].sort();
      for (const id of previousIds)
        groupedPrevious.add(`${entry.collection}:${id}`);
      groupedCurrent.add(`${entry.collection}:${entry.currentId}`);
      groups.push({
        kind: "merge",
        collection: entry.collection,
        previousIds,
        currentIds: [entry.currentId],
        reason: `Merge in "${entry.collection}": ${previousIds.length} previous entries correspond to "${entry.currentId}" and need reviewer confirmation.`,
      });
    }
  }

  return { pairs, groups, groupedPrevious, groupedCurrent, invalid };
}

const PACKAGE_LEVEL_FIELDS = [
  "title",
  "version",
  "description",
  "premise",
  "source",
  "system",
] as const;

export function diffAdventureJsonVersions(
  previous: AdventureJsonV1,
  next: AdventureJsonV1,
): AdventureJsonVersionDiff {
  const previousRecord = previous as unknown as Record<string, unknown>;
  const nextRecord = next as unknown as Record<string, unknown>;
  const packageChangedFields = PACKAGE_LEVEL_FIELDS.filter(
    (field) =>
      canonicalStringify(previousRecord[field]) !==
      canonicalStringify(nextRecord[field]),
  );

  const mapping = parseCorrespondence(previous, next);
  const collections = {} as Record<
    AdventureJsonCollectionName,
    AdventureJsonCollectionDiff
  >;
  const unresolved: AdventureJsonDiffUnresolved[] = [...mapping.invalid];
  for (const group of mapping.groups) {
    unresolved.push({
      kind: group.kind,
      collection: group.collection,
      ids: [...group.previousIds, ...group.currentIds],
      reason: group.reason,
    });
  }

  for (const collection of ADVENTURE_JSON_COLLECTIONS) {
    const previousEntities = entitiesOf(previous, collection);
    const nextEntities = entitiesOf(next, collection);
    const previousById = new Map(
      previousEntities.map((e) => [e["id"] as string, e]),
    );
    const nextById = new Map(nextEntities.map((e) => [e["id"] as string, e]));

    const added: AdventureJsonDiffEntry[] = [];
    const removed: AdventureJsonDiffEntry[] = [];
    const changed: AdventureJsonDiffEntry[] = [];
    const matchedPrevious = new Set<string>();
    const matchedCurrent = new Set<string>();

    const considerPair = (previousId: string, currentId: string): void => {
      const prev = previousById.get(previousId);
      const curr = nextById.get(currentId);
      if (!prev || !curr) return;
      matchedPrevious.add(previousId);
      matchedCurrent.add(currentId);
      const fields = changedTopLevelFields(prev, curr);
      if (fields.length > 0) {
        changed.push({
          id: currentId,
          title: entityTitle(curr),
          changedFields: fields,
          previousId: previousId === currentId ? undefined : previousId,
        });
      }
    };

    for (const entity of previousEntities) {
      const id = entity["id"] as string;
      if (nextById.has(id)) considerPair(id, id);
    }
    for (const [key, currentId] of mapping.pairs) {
      const [collectionName, previousId] = key.split(/:(.+)/) as [
        string,
        string,
      ];
      if (collectionName !== collection) continue;
      considerPair(previousId, currentId);
    }

    for (const entity of previousEntities) {
      const id = entity["id"] as string;
      if (matchedPrevious.has(id)) continue;
      if (mapping.groupedPrevious.has(`${collection}:${id}`)) continue;
      removed.push({
        id,
        title: entityTitle(entity),
        changedFields: [],
      });
      unresolved.push({
        kind: "removed",
        collection,
        ids: [id],
        reason: `Removed "${id}" in "${collection}" has no same-ID or mapped correspondence in the new package.`,
      });
    }
    for (const entity of nextEntities) {
      const id = entity["id"] as string;
      if (matchedCurrent.has(id)) continue;
      if (mapping.groupedCurrent.has(`${collection}:${id}`)) continue;
      added.push({
        id,
        title: entityTitle(entity),
        changedFields: [],
      });
      unresolved.push({
        kind: "added",
        collection,
        ids: [id],
        reason: `Added "${id}" in "${collection}" has no same-ID or mapped correspondence in the previous package.`,
      });
    }

    collections[collection] = { collection, added, removed, changed };
  }

  return {
    packageChangedFields,
    collections,
    groups: mapping.groups,
    unresolved,
  };
}

export type { StoredAdventurePackage };
