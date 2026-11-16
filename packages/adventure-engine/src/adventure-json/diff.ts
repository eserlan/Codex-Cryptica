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
  entrySceneChange: {
    previousId: string | null;
    currentId: string | null;
  } | null;
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
  core: [string, string, string];
  prerelease: string[];
}

function parseSemVer(version: string): ParsedVersion | null {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.exec(
      version,
    );
  if (!match) return null;
  return {
    core: [match[1]!, match[2]!, match[3]!],
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function compareNumbers(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

function compareNumericStrings(a: string, b: string): number {
  const na = a.replace(/^0+(?=\d)/, "");
  const nb = b.replace(/^0+(?=\d)/, "");
  if (na.length !== nb.length) return na.length < nb.length ? -1 : 1;
  return na < nb ? -1 : na > nb ? 1 : 0;
}

function comparePrereleaseIdentifier(a: string, b: string): number {
  if (a === b) return 0;
  const isNumA = /^\d+$/.test(a);
  const isNumB = /^\d+$/.test(b);
  if (isNumA && isNumB) return compareNumericStrings(a, b);
  if (isNumA !== isNumB) return isNumA ? -1 : 1;
  return a < b ? -1 : 1;
}

/** SemVer precedence of prerelease identifier lists; no prerelease outranks. */
function comparePrerelease(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) {
    return compareNumbers(b.length, a.length);
  }
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const xa = a[i];
    const xb = b[i];
    if (xa === undefined || xb === undefined) {
      return compareNumbers(a.length, b.length);
    }
    const byIdentifier = comparePrereleaseIdentifier(xa, xb);
    if (byIdentifier !== 0) return byIdentifier;
  }
  return compareNumbers(a.length, b.length);
}

/** Compares two strict SemVer strings. Returns -1, 0, or 1. */
export function compareAdventureJsonVersion(a: string, b: string): number {
  const pa = parseSemVer(a);
  const pb = parseSemVer(b);
  if (!pa || !pb) return a < b ? -1 : a > b ? 1 : 0;
  for (let i = 0; i < 3; i += 1) {
    const byCore = compareNumericStrings(pa.core[i]!, pb.core[i]!);
    if (byCore !== 0) return byCore;
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

/** Existence and same-ID-conflict checks for one well-formed entry. */
function checkEntryEvidence(
  entry: AdventureJsonCorrespondingEntry,
  previousIds: ReadonlySet<string>,
  currentIds: ReadonlySet<string>,
): AdventureJsonDiffUnresolved | null {
  const { previousId, currentId, collection } = entry;
  if (!previousIds.has(previousId) || !currentIds.has(currentId)) {
    return invalidMapping(
      collection,
      [previousId, currentId],
      `Correspondence entry pairs "${previousId}" to "${currentId}" but at least one of those IDs does not exist in "${collection}".`,
    );
  }
  if (
    previousId !== currentId &&
    (currentIds.has(previousId) || previousIds.has(currentId))
  ) {
    return invalidMapping(
      collection,
      [previousId, currentId],
      `Correspondence entry pairing "${previousId}" to "${currentId}" conflicts with a same-ID match in "${collection}".`,
    );
  }
  return null;
}

function parseEntryShape(raw: unknown): {
  entry?: AdventureJsonCorrespondingEntry;
  collection: string;
} {
  if (
    !isRecord(raw) ||
    typeof raw["previousId"] !== "string" ||
    typeof raw["currentId"] !== "string" ||
    typeof raw["collection"] !== "string"
  ) {
    return {
      collection:
        isRecord(raw) && typeof raw["collection"] === "string"
          ? raw["collection"]
          : "",
    };
  }
  return {
    entry: {
      previousId: raw["previousId"],
      currentId: raw["currentId"],
      collection: raw["collection"],
    },
    collection: raw["collection"],
  };
}

function validateCorrespondenceEntry(
  raw: unknown,
  idsByCollection: ReadonlyMap<
    AdventureJsonCollectionName,
    { previous: ReadonlySet<string>; current: ReadonlySet<string> }
  >,
): EntryValidation {
  const { entry, collection } = parseEntryShape(raw);
  if (!entry) {
    return {
      ok: false,
      unresolved: invalidMapping(
        collection,
        [],
        "Correspondence entry is malformed; it needs string previousId, currentId, and collection fields.",
      ),
    };
  }
  if (!KNOWN_COLLECTIONS.has(collection)) {
    return {
      ok: false,
      unresolved: invalidMapping(
        collection,
        [entry.previousId, entry.currentId],
        `Correspondence entry names unknown collection "${collection}".`,
      ),
    };
  }
  const ids = idsByCollection.get(collection as AdventureJsonCollectionName)!;
  const evidence = checkEntryEvidence(entry, ids.previous, ids.current);
  if (evidence) return { ok: false, unresolved: evidence };
  return { ok: true, entry };
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
    const previousKey = `${entry.collection}:${entry.previousId}`;
    const currentKey = `${entry.collection}:${entry.currentId}`;
    const prevList = byPrevious.get(previousKey) ?? [];
    prevList.push(entry.currentId);
    byPrevious.set(previousKey, prevList);
    const currList = byCurrent.get(currentKey) ?? [];
    currList.push(entry.previousId);
    byCurrent.set(currentKey, currList);
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
    collectGroup(entry, byPrevious, byCurrent, seen, {
      groups,
      groupedPrevious,
      groupedCurrent,
    });
    const previousKey = `${entry.collection}:${entry.previousId}`;
    const currentKey = `${entry.collection}:${entry.currentId}`;
    const isSplit = (byPrevious.get(previousKey)?.length ?? 0) > 1;
    const isMerge = (byCurrent.get(currentKey)?.length ?? 0) > 1;
    if (!isSplit && !isMerge) {
      if (!pairs.has(previousKey)) pairs.set(previousKey, entry.currentId);
    }
  }
  return { pairs, groups, groupedPrevious, groupedCurrent };
}

interface GroupSink {
  groups: AdventureJsonDiffGroup[];
  groupedPrevious: Set<string>;
  groupedCurrent: Set<string>;
}

function collectSplit(
  entry: AdventureJsonCorrespondingEntry,
  byPrevious: Map<string, string[]>,
  seen: Set<string>,
  sink: GroupSink,
): void {
  const key = `split:${entry.collection}:${entry.previousId}`;
  const entryKey = `${entry.collection}:${entry.previousId}`;
  if ((byPrevious.get(entryKey)?.length ?? 0) <= 1 || seen.has(key)) {
    return;
  }
  seen.add(key);
  const currentIds = [...(byPrevious.get(entryKey) ?? [])].sort();
  for (const id of currentIds) {
    sink.groupedCurrent.add(`${entry.collection}:${id}`);
  }
  sink.groupedPrevious.add(`${entry.collection}:${entry.previousId}`);
  sink.groups.push({
    kind: "split",
    collection: entry.collection,
    previousIds: [entry.previousId],
    currentIds,
    reason: `Split in "${entry.collection}": "${entry.previousId}" corresponds to ${currentIds.length} current entries and needs reviewer confirmation.`,
  });
}

function collectMerge(
  entry: AdventureJsonCorrespondingEntry,
  byCurrent: Map<string, string[]>,
  seen: Set<string>,
  sink: GroupSink,
): void {
  const key = `merge:${entry.collection}:${entry.currentId}`;
  const entryKey = `${entry.collection}:${entry.currentId}`;
  if ((byCurrent.get(entryKey)?.length ?? 0) <= 1 || seen.has(key)) {
    return;
  }
  seen.add(key);
  const previousIds = [...(byCurrent.get(entryKey) ?? [])].sort();
  for (const id of previousIds) {
    sink.groupedPrevious.add(`${entry.collection}:${id}`);
  }
  sink.groupedCurrent.add(`${entry.collection}:${entry.currentId}`);
  sink.groups.push({
    kind: "merge",
    collection: entry.collection,
    previousIds,
    currentIds: [entry.currentId],
    reason: `Merge in "${entry.collection}": ${previousIds.length} previous entries correspond to "${entry.currentId}" and need reviewer confirmation.`,
  });
}

function collectGroup(
  entry: AdventureJsonCorrespondingEntry,
  byPrevious: Map<string, string[]>,
  byCurrent: Map<string, string[]>,
  seen: Set<string>,
  sink: GroupSink,
): void {
  collectSplit(entry, byPrevious, seen, sink);
  collectMerge(entry, byCurrent, seen, sink);
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
  const idsByCollection = new Map(
    ADVENTURE_JSON_COLLECTIONS.map((collection) => [
      collection,
      {
        previous: new Set(
          entitiesOf(previous, collection).map(
            (entity) => entity["id"] as string,
          ),
        ),
        current: new Set(
          entitiesOf(next, collection).map((entity) => entity["id"] as string),
        ),
      },
    ]),
  );
  const seenEdges = new Set<string>();
  for (const rawEntry of raw) {
    const validated = validateCorrespondenceEntry(rawEntry, idsByCollection);
    if (
      validated.ok &&
      validated.entry.previousId !== validated.entry.currentId
    ) {
      const edge = JSON.stringify([
        validated.entry.collection,
        validated.entry.previousId,
        validated.entry.currentId,
      ]);
      if (!seenEdges.has(edge)) {
        seenEdges.add(edge);
        validEntries.push(validated.entry);
      }
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

  collectUnmatched(
    collection,
    previousEntities,
    matchedPrevious,
    mapping.groupedPrevious,
    "removed",
    removed,
    unresolved,
  );
  collectUnmatched(
    collection,
    nextEntities,
    matchedCurrent,
    mapping.groupedCurrent,
    "added",
    added,
    unresolved,
  );

  return { diff: { collection, added, removed, changed }, unresolved };
}

function collectUnmatched(
  collection: AdventureJsonCollectionName,
  entities: EntityRecord[],
  matched: Set<string>,
  grouped: Set<string>,
  kind: "removed" | "added",
  sink: AdventureJsonDiffEntry[],
  unresolved: AdventureJsonDiffUnresolved[],
): void {
  for (const entity of entities) {
    const id = entity["id"] as string;
    if (matched.has(id)) continue;
    if (grouped.has(`${collection}:${id}`)) continue;
    sink.push({ id, title: entityTitle(entity), changedFields: [] });
    unresolved.push({
      kind,
      collection,
      ids: [id],
      reason:
        kind === "removed"
          ? `Removed "${id}" in "${collection}" has no same-ID or mapped correspondence in the new package.`
          : `Added "${id}" in "${collection}" has no same-ID or mapped correspondence in the previous package.`,
    });
  }
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

  const previousEntrySceneId = previous.scenes[0]?.id ?? null;
  const currentEntrySceneId = next.scenes[0]?.id ?? null;

  return {
    packageChangedFields,
    entrySceneChange:
      previousEntrySceneId !== currentEntrySceneId
        ? {
            previousId: previousEntrySceneId,
            currentId: currentEntrySceneId,
          }
        : null,
    collections,
    groups: mapping.groups,
    unresolved,
  };
}

export type { StoredAdventurePackage };
