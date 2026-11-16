import type { AdventureJsonV1 } from "./schema";
import { sortKeysRecursively } from "./canonical";
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

interface ParsedVersion {
  core: [number, number, number];
  prerelease: string[];
}

function parseSemVer(version: string): ParsedVersion | null {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.exec(
      version,
    );
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function comparePrerelease(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const xa = a[i];
    const xb = b[i];
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

/** Compares two strict SemVer strings. Returns -1, 0, or 1. */
export function compareAdventureJsonVersion(a: string, b: string): number {
  const pa = parseSemVer(a);
  const pb = parseSemVer(b);
  if (!pa || !pb) return a < b ? -1 : a > b ? 1 : 0;
  for (let i = 0; i < 3; i += 1) {
    if (pa.core[i] !== pb.core[i]) return pa.core[i] < pb.core[i] ? -1 : 1;
  }
  return comparePrerelease(pa.prerelease, pb.prerelease);
}

export function isAdventureJsonVersionGreater(
  candidate: string,
  predecessor: string,
): boolean {
  return compareAdventureJsonVersion(candidate, predecessor) > 0;
}

/**
 * Orders version candidates highest SemVer first, breaking ties by hash
 * ascending. Shared by predecessor selection (engine) and the approved
 * packages list (web).
 */
export function compareAdventureJsonVersionCandidates(
  a: AdventureJsonVersionCandidate,
  b: AdventureJsonVersionCandidate,
): number {
  const byVersion = compareAdventureJsonVersion(
    b.package.version,
    a.package.version,
  );
  if (byVersion !== 0) return byVersion;
  return a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0;
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
  return [...sameId].sort(compareAdventureJsonVersionCandidates)[0];
}

type EntityRecord = Record<string, unknown>;

function entitiesOf(
  pkg: AdventureJsonV1,
  collection: AdventureJsonCollectionName,
): EntityRecord[] {
  return (pkg[collection] as EntityRecord[]) ?? [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function invalidMapping(
  collection: string,
  ids: string[],
  reason: string,
): AdventureJsonDiffUnresolved {
  return { kind: "invalid-mapping", collection, ids, reason };
}

const KNOWN_COLLECTIONS = new Set<string>(ADVENTURE_JSON_COLLECTIONS);

type EntryValidation =
  | { ok: true; entry: AdventureJsonCorrespondingEntry }
  | { ok: false; unresolved: AdventureJsonDiffUnresolved };

function validateCorrespondenceEntry(
  raw: unknown,
  previous: AdventureJsonV1,
  next: AdventureJsonV1,
): EntryValidation {
  if (
    !isRecord(raw) ||
    typeof raw["previousId"] !== "string" ||
    typeof raw["currentId"] !== "string" ||
    typeof raw["collection"] !== "string"
  ) {
    return {
      ok: false,
      unresolved: invalidMapping(
        isRecord(raw) && typeof raw["collection"] === "string"
          ? raw["collection"]
          : "",
        [],
        "Correspondence entry is malformed; it needs string previousId, currentId, and collection fields.",
      ),
    };
  }
  const previousId = raw["previousId"];
  const currentId = raw["currentId"];
  const collection = raw["collection"];
  if (!KNOWN_COLLECTIONS.has(collection)) {
    return {
      ok: false,
      unresolved: invalidMapping(
        collection,
        [previousId, currentId],
        `Correspondence entry names unknown collection "${collection}".`,
      ),
    };
  }
  const name = collection as AdventureJsonCollectionName;
  const previousIds = new Set(
    entitiesOf(previous, name).map((e) => e["id"] as string),
  );
  const currentIds = new Set(
    entitiesOf(next, name).map((e) => e["id"] as string),
  );
  if (!previousIds.has(previousId) || !currentIds.has(currentId)) {
    return {
      ok: false,
      unresolved: invalidMapping(
        collection,
        [previousId, currentId],
        `Correspondence entry pairs "${previousId}" to "${currentId}" but at least one of those IDs does not exist in "${collection}".`,
      ),
    };
  }
  if (
    previousId !== currentId &&
    (currentIds.has(previousId) || previousIds.has(currentId))
  ) {
    return {
      ok: false,
      unresolved: invalidMapping(
        collection,
        [previousId, currentId],
        `Correspondence entry pairing "${previousId}" to "${currentId}" conflicts with a same-ID match in "${collection}".`,
      ),
    };
  }
  return { ok: true, entry: { previousId, currentId, collection } };
}

interface MappingOutcome {
  pairs: Map<string, string>;
  groups: AdventureJsonDiffGroup[];
  groupedPrevious: Set<string>;
  groupedCurrent: Set<string>;
  invalid: AdventureJsonDiffUnresolved[];
}

function indexEntries(entries: AdventureJsonCorrespondingEntry[]): {
  byPrevious: Map<string, string[]>;
  byCurrent: Map<string, string[]>;
} {
  const byPrevious = new Map<string, string[]>();
  const byCurrent = new Map<string, string[]>();
  for (const entry of entries) {
    const prevList = byPrevious.get(entry.previousId) ?? [];
    prevList.push(entry.currentId);
    byPrevious.set(entry.previousId, prevList);
    const currList = byCurrent.get(entry.currentId) ?? [];
    currList.push(entry.previousId);
    byCurrent.set(entry.currentId, currList);
  }
  return { byPrevious, byCurrent };
}

function buildGroups(
  entries: AdventureJsonCorrespondingEntry[],
  byPrevious: Map<string, string[]>,
  byCurrent: Map<string, string[]>,
): {
  pairs: Map<string, string>;
  groups: AdventureJsonDiffGroup[];
  groupedPrevious: Set<string>;
  groupedCurrent: Set<string>;
} {
  const pairs = new Map<string, string>();
  const groups: AdventureJsonDiffGroup[] = [];
  const groupedPrevious = new Set<string>();
  const groupedCurrent = new Set<string>();
  const seen = new Set<string>();

  for (const entry of entries) {
    const isSplit = (byPrevious.get(entry.previousId)?.length ?? 0) > 1;
    const isMerge = (byCurrent.get(entry.currentId)?.length ?? 0) > 1;
    if (isSplit && !seen.has(`split:${entry.collection}:${entry.previousId}`)) {
      seen.add(`split:${entry.collection}:${entry.previousId}`);
      const currentIds = [...(byPrevious.get(entry.previousId) ?? [])].sort();
      for (const id of currentIds) {
        groupedCurrent.add(`${entry.collection}:${id}`);
      }
      groupedPrevious.add(`${entry.collection}:${entry.previousId}`);
      groups.push({
        kind: "split",
        collection: entry.collection,
        previousIds: [entry.previousId],
        currentIds,
        reason: `Split in "${entry.collection}": "${entry.previousId}" corresponds to ${currentIds.length} current entries and needs reviewer confirmation.`,
      });
    }
    if (isMerge && !seen.has(`merge:${entry.collection}:${entry.currentId}`)) {
      seen.add(`merge:${entry.collection}:${entry.currentId}`);
      const previousIds = [...(byCurrent.get(entry.currentId) ?? [])].sort();
      for (const id of previousIds) {
        groupedPrevious.add(`${entry.collection}:${id}`);
      }
      groupedCurrent.add(`${entry.collection}:${entry.currentId}`);
      groups.push({
        kind: "merge",
        collection: entry.collection,
        previousIds,
        currentIds: [entry.currentId],
        reason: `Merge in "${entry.collection}": ${previousIds.length} previous entries correspond to "${entry.currentId}" and need reviewer confirmation.`,
      });
    }
    if (!isSplit && !isMerge) {
      const key = `${entry.collection}:${entry.previousId}`;
      if (!pairs.has(key)) pairs.set(key, entry.currentId);
    }
  }
  return { pairs, groups, groupedPrevious, groupedCurrent };
}

function parseCorrespondence(
  previous: AdventureJsonV1,
  next: AdventureJsonV1,
): MappingOutcome {
  const empty: MappingOutcome = {
    pairs: new Map(),
    groups: [],
    groupedPrevious: new Set(),
    groupedCurrent: new Set(),
    invalid: [],
  };
  const raw = next.extensions?.[ADVENTURE_CORRESPONDENCE_EXTENSION_KEY];
  if (raw === undefined) return empty;
  if (!Array.isArray(raw)) {
    return {
      ...empty,
      invalid: [
        invalidMapping(
          "",
          [],
          `Extension "${ADVENTURE_CORRESPONDENCE_EXTENSION_KEY}" must be an array of correspondence entries.`,
        ),
      ],
    };
  }
  const validEntries: AdventureJsonCorrespondingEntry[] = [];
  const invalid: AdventureJsonDiffUnresolved[] = [];
  for (const rawEntry of raw) {
    const validated = validateCorrespondenceEntry(rawEntry, previous, next);
    if (
      validated.ok &&
      validated.entry.previousId !== validated.entry.currentId
    ) {
      validEntries.push(validated.entry);
    } else if (!validated.ok) {
      invalid.push(validated.unresolved);
    }
  }
  const { byPrevious, byCurrent } = indexEntries(validEntries);
  return { ...buildGroups(validEntries, byPrevious, byCurrent), invalid };
}

const PACKAGE_LEVEL_FIELDS = [
  "title",
  "version",
  "description",
  "premise",
  "source",
  "system",
] as const;

function diffCollection(
  collection: AdventureJsonCollectionName,
  previous: AdventureJsonV1,
  next: AdventureJsonV1,
  mapping: MappingOutcome,
): {
  diff: AdventureJsonCollectionDiff;
  unresolved: AdventureJsonDiffUnresolved[];
} {
  const previousEntities = entitiesOf(previous, collection);
  const nextEntities = entitiesOf(next, collection);
  const previousById = new Map(
    previousEntities.map((e) => [e["id"] as string, e]),
  );
  const nextById = new Map(nextEntities.map((e) => [e["id"] as string, e]));
  const added: AdventureJsonDiffEntry[] = [];
  const removed: AdventureJsonDiffEntry[] = [];
  const changed: AdventureJsonDiffEntry[] = [];
  const unresolved: AdventureJsonDiffUnresolved[] = [];
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
    const separator = key.indexOf(":");
    if (key.slice(0, separator) !== collection) continue;
    considerPair(key.slice(separator + 1), currentId);
  }

  for (const entity of previousEntities) {
    const id = entity["id"] as string;
    if (matchedPrevious.has(id)) continue;
    if (mapping.groupedPrevious.has(`${collection}:${id}`)) continue;
    removed.push({ id, title: entityTitle(entity), changedFields: [] });
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
    added.push({ id, title: entityTitle(entity), changedFields: [] });
    unresolved.push({
      kind: "added",
      collection,
      ids: [id],
      reason: `Added "${id}" in "${collection}" has no same-ID or mapped correspondence in the previous package.`,
    });
  }

  return { diff: { collection, added, removed, changed }, unresolved };
}

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
    const { diff, unresolved: collectionUnresolved } = diffCollection(
      collection,
      previous,
      next,
      mapping,
    );
    collections[collection] = diff;
    unresolved.push(...collectionUnresolved);
  }

  return {
    packageChangedFields,
    collections,
    groups: mapping.groups,
    unresolved,
  };
}

export type { StoredAdventurePackage };
