/**
 * Three-way merge of entities by top-level field (shared vault, slice 4).
 *
 * Pure and synchronous: it merges what the device last synced (`base`) with
 * the local copy (`mine`) and the received copy (`theirs`). When both sides
 * changed the same field to different values, theirs stays and mine becomes a
 * copy, so nothing is ever lost or overwritten.
 */

export interface MergeEntity {
  id: string;
  title: string;
  [key: string]: unknown;
}

export type MergeSide = Record<string, MergeEntity | null | undefined>;

export interface MergeInput {
  base: MergeSide;
  mine: MergeSide;
  theirs: MergeSide;
}

export interface MergeOptions {
  /** The "Name" in "Title (Name's version)". */
  copyAuthorName: string;
  newId: () => string;
}

export interface MergeSummary {
  combined: string[];
  editsKeptOverDelete: string[];
  copies: { originalId: string; copyId: string; title: string }[];
  deleted: string[];
}

export interface MergeResult {
  entities: Record<string, MergeEntity>;
  deletes: string[];
  copies: MergeEntity[];
  summary: MergeSummary;
}

const BOOKKEEPING = ["lastUpdated", "updatedAt", "createdAt", "modifiedAt"];

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  if (ak.length !== Object.keys(bo).length) return false;
  return ak.every((k) => k in bo && deepEqual(ao[k], bo[k]));
}

const isContentKey = (key: string) =>
  key !== "id" && !BOOKKEEPING.includes(key);

function contentKeys(...entities: MergeEntity[]): string[] {
  const keys = new Set<string>();
  for (const entity of entities) {
    for (const key of Object.keys(entity)) {
      if (isContentKey(key)) keys.add(key);
    }
  }
  return [...keys];
}

function differs(a: MergeEntity, b: MergeEntity, key: string): boolean {
  return key in a !== key in b || !deepEqual(a[key], b[key]);
}

function changedKeys(base: MergeEntity, side: MergeEntity): string[] {
  return contentKeys(base, side).filter((key) => differs(base, side, key));
}

function equalContent(a: MergeEntity, b: MergeEntity): boolean {
  return changedKeys(a, b).length === 0;
}

function larger(a: unknown, b: unknown): number | undefined {
  const nums = [a, b].filter((v): v is number => typeof v === "number");
  return nums.length ? Math.max(...nums) : undefined;
}

function combine(
  base: MergeEntity,
  mine: MergeEntity,
  theirs: MergeEntity,
  mineKeys: string[],
  theirKeys: string[],
): MergeEntity {
  const result: MergeEntity = { ...base };
  const apply = (from: MergeEntity, keys: string[]) => {
    for (const key of keys) {
      if (key in from) result[key] = from[key];
      else delete result[key];
    }
  };
  apply(mine, mineKeys);
  apply(theirs, theirKeys);
  for (const key of BOOKKEEPING) {
    const value = larger(mine[key], theirs[key]);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function makeCopy(mine: MergeEntity, options: MergeOptions): MergeEntity {
  const suffix = ` (${options.copyAuthorName}'s version)`;
  const copy: MergeEntity = { ...mine };
  copy.id = options.newId();
  copy.title = mine.title.endsWith(suffix) ? mine.title : mine.title + suffix;
  delete copy._path;
  return copy;
}

export function mergeEntities(
  input: MergeInput,
  options: MergeOptions,
): MergeResult {
  const result: MergeResult = {
    entities: {},
    deletes: [],
    copies: [],
    summary: { combined: [], editsKeptOverDelete: [], copies: [], deleted: [] },
  };
  const ids = new Set([
    ...Object.keys(input.base),
    ...Object.keys(input.mine),
    ...Object.keys(input.theirs),
  ]);

  const clash = (id: string, mine: MergeEntity, theirs: MergeEntity) => {
    const copy = makeCopy(mine, options);
    result.entities[id] = theirs;
    result.copies.push(copy);
    result.summary.copies.push({
      originalId: id,
      copyId: copy.id,
      title: copy.title,
    });
  };

  for (const id of ids) {
    const base = input.base[id] ?? null;
    const mine = input.mine[id] ?? null;
    const theirs = input.theirs[id] ?? null;

    if (!mine && !theirs) {
      result.deletes.push(id);
      if (base) result.summary.deleted.push(id);
    } else if (!base) {
      if (!mine || !theirs) result.entities[id] = (mine ?? theirs)!;
      else if (equalContent(mine, theirs)) result.entities[id] = theirs;
      else clash(id, mine, theirs);
    } else if (!mine || !theirs) {
      const present = (mine ?? theirs)!;
      if (changedKeys(base, present).length > 0) {
        result.entities[id] = present;
        result.summary.editsKeptOverDelete.push(id);
      } else {
        result.deletes.push(id);
        result.summary.deleted.push(id);
      }
    } else {
      const mineKeys = changedKeys(base, mine);
      const theirKeys = changedKeys(base, theirs);
      const clashing = mineKeys.some(
        (key) => theirKeys.includes(key) && differs(mine, theirs, key),
      );
      if (clashing) {
        clash(id, mine, theirs);
      } else {
        result.entities[id] = combine(base, mine, theirs, mineKeys, theirKeys);
        if (mineKeys.length > 0 && theirKeys.length > 0) {
          result.summary.combined.push(id);
        }
      }
    }
  }
  return result;
}
