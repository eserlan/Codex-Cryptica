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

function contentKeys(
  ignored: readonly string[],
  ...entities: Record<string, unknown>[]
): string[] {
  const keys = new Set<string>();
  for (const entity of entities) {
    for (const key of Object.keys(entity)) {
      if (key !== "id" && !ignored.includes(key)) keys.add(key);
    }
  }
  return [...keys];
}

function differs(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  key: string,
): boolean {
  return key in a !== key in b || !deepEqual(a[key], b[key]);
}

function changedKeys(
  base: Record<string, unknown>,
  side: Record<string, unknown>,
  ignored: readonly string[] = BOOKKEEPING,
): string[] {
  return contentKeys(ignored, base, side).filter((key) =>
    differs(base, side, key),
  );
}

/** True when two entities hold the same content, ignoring `id` and bookkeeping stamps. */
export function equalContent(a: MergeEntity, b: MergeEntity): boolean {
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

/** A keep-both copy: a new id and "Title (Name's version)", never suffixed twice. */
function makeCopy<T extends { id: string }>(
  mine: T,
  options: MergeOptions,
  titleField: "title" | "name" = "title",
): T {
  const suffix = ` (${options.copyAuthorName}'s version)`;
  const title = String((mine as Record<string, unknown>)[titleField] ?? "");
  const copy: Record<string, unknown> = { ...mine };
  copy.id = options.newId();
  copy[titleField] = title.endsWith(suffix) ? title : title + suffix;
  delete copy._path;
  return copy as T;
}

type Ctx = { result: MergeResult; options: MergeOptions };

/** Makes the keep-both copy of `mine`, records it in the result and returns it. */
function recordCopy<T extends { id: string }>(
  result: { copies: T[]; summary: MergeSummary },
  originalId: string,
  mine: T,
  options: MergeOptions,
  titleField: "title" | "name",
): void {
  const copy = makeCopy(mine, options, titleField);
  result.copies.push(copy);
  result.summary.copies.push({
    originalId,
    copyId: copy.id,
    title: String((copy as Record<string, unknown>)[titleField]),
  });
}

function clash(
  ctx: Ctx,
  id: string,
  mine: MergeEntity,
  theirs: MergeEntity,
): void {
  recordCopy(ctx.result, id, mine, ctx.options, "title");
  ctx.result.entities[id] = theirs;
}

function mergeOneSideGone(
  ctx: Ctx,
  id: string,
  base: MergeEntity | null,
  present: MergeEntity,
): void {
  const { result } = ctx;
  if (!base) {
    result.entities[id] = present;
  } else if (changedKeys(base, present).length > 0) {
    result.entities[id] = present;
    result.summary.editsKeptOverDelete.push(id);
  } else {
    result.deletes.push(id);
    result.summary.deleted.push(id);
  }
}

function mergeAgainstBase(
  ctx: Ctx,
  id: string,
  base: MergeEntity,
  mine: MergeEntity,
  theirs: MergeEntity,
): void {
  const mineKeys = changedKeys(base, mine);
  const theirKeys = changedKeys(base, theirs);
  const clashing = mineKeys.some(
    (key) => theirKeys.includes(key) && differs(mine, theirs, key),
  );
  if (clashing) return clash(ctx, id, mine, theirs);
  ctx.result.entities[id] = combine(base, mine, theirs, mineKeys, theirKeys);
  if (mineKeys.length > 0 && theirKeys.length > 0) {
    ctx.result.summary.combined.push(id);
  }
}

function mergeBothPresent(
  ctx: Ctx,
  id: string,
  base: MergeEntity | null,
  mine: MergeEntity,
  theirs: MergeEntity,
): void {
  if (base) mergeAgainstBase(ctx, id, base, mine, theirs);
  else if (equalContent(mine, theirs)) ctx.result.entities[id] = theirs;
  else clash(ctx, id, mine, theirs);
}

function mergeOne(
  ctx: Ctx,
  id: string,
  base: MergeEntity | null,
  mine: MergeEntity | null,
  theirs: MergeEntity | null,
): void {
  if (mine && theirs) return mergeBothPresent(ctx, id, base, mine, theirs);
  const present = mine ?? theirs;
  if (present) return mergeOneSideGone(ctx, id, base, present);
  ctx.result.deletes.push(id);
  if (base) ctx.result.summary.deleted.push(id);
}

const emptySummary = (): MergeSummary => ({
  combined: [],
  editsKeptOverDelete: [],
  copies: [],
  deleted: [],
});

const unionIds = (...sides: object[]): Set<string> =>
  new Set(sides.flatMap((side) => Object.keys(side)));

export function mergeEntities(
  input: MergeInput,
  options: MergeOptions,
): MergeResult {
  const ctx: Ctx = {
    options,
    result: {
      entities: {},
      deletes: [],
      copies: [],
      summary: emptySummary(),
    },
  };
  for (const id of unionIds(input.base, input.mine, input.theirs)) {
    mergeOne(
      ctx,
      id,
      input.base[id] ?? null,
      input.mine[id] ?? null,
      input.theirs[id] ?? null,
    );
  }
  return ctx.result;
}

/** A map or canvas: one whole item, named by `name`. */
export interface WholeItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

export type WholeSide = Record<string, WholeItem | null | undefined>;

export interface WholeMergeInput {
  base: WholeSide;
  mine: WholeSide;
  theirs: WholeSide;
  /** Ids with a local change the content does not show, such as a fog mask. */
  mineDirty: ReadonlySet<string>;
}

export interface WholeMergeOptions extends MergeOptions {
  /** Content keys to ignore besides the entity ones; `lastModified` always is. */
  bookkeeping?: readonly string[];
}

export interface WholeMergeResult {
  items: Record<string, WholeItem>;
  deletes: string[];
  copies: WholeItem[];
  summary: MergeSummary;
}

/** True when two maps or canvases hold the same content, ignoring `lastModified`. */
export function equalWholeContent(a: WholeItem, b: WholeItem): boolean {
  return changedKeys(a, b, [...BOOKKEEPING, "lastModified"]).length === 0;
}

type WholeCtx = {
  result: WholeMergeResult;
  options: WholeMergeOptions;
  ignored: readonly string[];
};

/** Mine and theirs are both here; theirs stays unless mine changed and differs. */
function mergeWholeBothPresent(
  ctx: WholeCtx,
  id: string,
  mine: WholeItem,
  theirs: WholeItem,
  mineChanged: boolean,
): void {
  ctx.result.items[id] = theirs;
  if (mineChanged && changedKeys(mine, theirs, ctx.ignored).length > 0) {
    recordCopy(ctx.result, id, mine, ctx.options, "name");
  }
}

/** Their side is gone: an unchanged item goes, an edited or new one stays. */
function mergeWholeTheirsGone(
  ctx: WholeCtx,
  id: string,
  base: WholeItem | null,
  mine: WholeItem,
  mineChanged: boolean,
): void {
  const { result } = ctx;
  if (base && !mineChanged) {
    result.deletes.push(id);
    result.summary.deleted.push(id);
    return;
  }
  result.items[id] = mine;
  if (base) result.summary.editsKeptOverDelete.push(id);
}

function mergeWholeOne(
  ctx: WholeCtx,
  id: string,
  sides: {
    base: WholeItem | null;
    mine: WholeItem | null;
    theirs: WholeItem | null;
  },
  dirty: boolean,
): void {
  const { base, mine, theirs } = sides;
  const mineChanged =
    !!mine &&
    (dirty || !base || changedKeys(base, mine, ctx.ignored).length > 0);
  if (mine && theirs) {
    return mergeWholeBothPresent(ctx, id, mine, theirs, mineChanged);
  }
  if (mine) return mergeWholeTheirsGone(ctx, id, base, mine, mineChanged);
  if (theirs) {
    // Mine was deleted: theirs, changed or not, comes back.
    ctx.result.items[id] = theirs;
    return;
  }
  ctx.result.deletes.push(id);
  if (base) ctx.result.summary.deleted.push(id);
}

/**
 * Merges maps or canvases, which never merge field by field: an item is
 * either taken whole from theirs or, when both sides changed it, theirs stays
 * and mine becomes a keep-both copy.
 */
export function mergeWholeItems(
  input: WholeMergeInput,
  options: WholeMergeOptions,
): WholeMergeResult {
  const ctx: WholeCtx = {
    options,
    ignored: [...BOOKKEEPING, "lastModified", ...(options.bookkeeping ?? [])],
    result: { items: {}, deletes: [], copies: [], summary: emptySummary() },
  };
  for (const id of unionIds(input.base, input.mine, input.theirs)) {
    mergeWholeOne(
      ctx,
      id,
      {
        base: input.base[id] ?? null,
        mine: input.mine[id] ?? null,
        theirs: input.theirs[id] ?? null,
      },
      input.mineDirty.has(id),
    );
  }
  return ctx.result;
}
