/**
 * Client for the change feed (shared vault, slice 5): what other devices
 * committed since a revision, ready to merge into the local vault.
 */
import { z } from "zod";
import {
  CloudBackupTombstoneSchema,
  CloudBackupWholeItemAssetSchema,
  type CloudBackupTombstone,
  type CloudBackupWholeItemAsset,
} from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { getLocalCloudBackupRecord } from "./backup-records";
import { cloudBackupHeaders } from "./request-headers";
import type {
  MergeEntity,
  MergeInput,
  MergeSide,
  WholeItem,
  WholeMergeInput,
  WholeSide,
} from "./merge";

const FeedEntitySchema = z.object({ id: z.string(), title: z.string() });

const FeedWholeItemSchema = z.object({
  item: z.object({ id: z.string(), name: z.string() }).passthrough(),
  meta: z
    .object({ assets: z.array(CloudBackupWholeItemAssetSchema).optional() })
    .passthrough()
    .optional(),
});

/** A map or canvas the feed carries, with the files its commit recorded. */
export interface FeedWholeItem {
  item: WholeItem;
  assets?: CloudBackupWholeItemAsset[];
}

const ChangesBodySchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("changes"),
    revision: z.number().int().nonnegative(),
    entities: z.array(
      z.object({
        entity: FeedEntitySchema.passthrough(),
        meta: z.unknown().optional(),
      }),
    ),
    maps: z.array(FeedWholeItemSchema).default([]),
    canvases: z.array(FeedWholeItemSchema).default([]),
    tombstones: z.array(CloudBackupTombstoneSchema),
  }),
  z.object({
    status: z.literal("resync"),
    revision: z.number().int().nonnegative(),
  }),
]);

export type ChangeFeedOutcome =
  | {
      kind: "changes";
      revision: number;
      entities: MergeEntity[];
      maps: FeedWholeItem[];
      canvases: FeedWholeItem[];
      /** Removed entities only; map and canvas tombstones are kept apart. */
      tombstones: CloudBackupTombstone[];
      mapTombstones: CloudBackupTombstone[];
      canvasTombstones: CloudBackupTombstone[];
    }
  | { kind: "resync"; revision: number }
  /** An older worker without the feed, or a body this client cannot read. */
  | { kind: "unsupported" }
  /** An editor's link no longer works. */
  | { kind: "linkGone" }
  /** No enabled backup for the vault; nothing was requested. */
  | { kind: "off" }
  | { kind: "failed"; error: string; status?: number; code?: string };

function wholeFeedItem(entry: z.infer<typeof FeedWholeItemSchema>) {
  return {
    item: entry.item as WholeItem,
    ...(entry.meta?.assets ? { assets: entry.meta.assets } : {}),
  };
}

/** Reads what changed in the backup since the revision this device last saw. */
export async function fetchCloudBackupChanges(
  runtime: CloudBackupRuntime,
  vaultId: string,
  signal?: AbortSignal,
): Promise<ChangeFeedOutcome> {
  const record = await getLocalCloudBackupRecord(runtime, vaultId);
  if (!record?.enabled) return { kind: "off" };
  let response;
  try {
    response = await runtime.fetch(
      `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/changes?since=${record.revision ?? 0}`,
      { headers: cloudBackupHeaders(runtime, record), signal },
    );
  } catch (error) {
    return {
      kind: "failed",
      error: error instanceof Error ? error.message : "Request failed.",
    };
  }
  if (response.status === 404) {
    return { kind: record.role === "editor" ? "linkGone" : "unsupported" };
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: unknown };
    } | null;
    const code = body?.error?.code;
    return {
      kind: "failed",
      error: `Request failed (${response.status})`,
      status: response.status,
      ...(typeof code === "string" ? { code } : {}),
    };
  }
  const parsed = ChangesBodySchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) return { kind: "unsupported" };
  const body = parsed.data;
  if (body.status === "resync") {
    return { kind: "resync", revision: body.revision };
  }
  return {
    kind: "changes",
    revision: body.revision,
    entities: body.entities.map((item) => item.entity as MergeEntity),
    maps: body.maps.map(wholeFeedItem),
    canvases: body.canvases.map(wholeFeedItem),
    tombstones: body.tombstones.filter((t) => !t.kind),
    mapTombstones: body.tombstones.filter((t) => t.kind === "map"),
    canvasTombstones: body.tombstones.filter((t) => t.kind === "canvas"),
  };
}

type Side<T> = Record<string, T | null | undefined>;

/**
 * The three sides of a merge for a feed result.
 *
 * A merge walks the union of ids, so an id missing from `theirs` reads as a
 * remote delete. A feed lists only what changed, so its sides hold only the
 * feed's ids. A resync lists every item of the backup, so there `mine` and
 * `base` stay whole and a local item the backup lacks merges as a remote
 * delete only when it has a base.
 */
function feedSides<T extends { id: string }>(input: {
  items: readonly T[];
  tombstones: readonly { id: string }[];
  mine: Side<T>;
  base: Side<T>;
  resync?: boolean;
}): { base: Side<T>; mine: Side<T>; theirs: Side<T> } {
  const theirs: Side<T> = {};
  for (const item of input.items) theirs[item.id] = item;
  for (const { id } of input.tombstones) theirs[id] = null;
  if (input.resync) {
    return { base: input.base, mine: input.mine, theirs };
  }
  const only = (side: Side<T>): Side<T> => {
    const picked: Side<T> = {};
    for (const id of Object.keys(theirs)) {
      if (side[id]) picked[id] = side[id];
    }
    return picked;
  };
  return { base: only(input.base), mine: only(input.mine), theirs };
}

/** The sides of an entity merge for a feed result. */
export function buildFeedMergeSides(input: {
  entities: readonly MergeEntity[];
  tombstones: readonly { id: string }[];
  mine: MergeSide;
  base: MergeSide;
  resync?: boolean;
}): MergeInput {
  return feedSides({ ...input, items: input.entities });
}

/** `buildFeedMergeSides` for maps or canvases, which merge as whole items. */
export function buildWholeFeedMergeSides(input: {
  items: readonly WholeItem[];
  tombstones: readonly { id: string }[];
  mine: WholeSide;
  base: WholeSide;
  mineDirty: ReadonlySet<string>;
  resync?: boolean;
}): WholeMergeInput {
  return { ...feedSides(input), mineDirty: input.mineDirty };
}

/**
 * Stores a completed pull on the local record. The revision and timestamp are
 * the remote's, so the next push is checked against what was just merged.
 * `foreignCommitSeen` is set when the revision moved past what this device had.
 */
export async function storePulledCloudBackupRecord(
  runtime: CloudBackupRuntime,
  vaultId: string,
  pulled: { revision: number; lastPushedAt: string | null },
): Promise<void> {
  const record = await getLocalCloudBackupRecord(runtime, vaultId);
  if (!record) return;
  const foreign =
    record.foreignCommitSeen === true ||
    pulled.revision > (record.revision ?? 0);
  const { foreignCommitSeen: _previous, ...rest } = record;
  await runtime.storage.write(vaultId, {
    ...rest,
    revision: pulled.revision,
    lastPushedAt: pulled.lastPushedAt ?? record.lastPushedAt,
    ...(foreign ? { foreignCommitSeen: true } : {}),
  });
}
