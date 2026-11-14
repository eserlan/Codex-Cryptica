/**
 * Client for the change feed (shared vault, slice 5): what other devices
 * committed since a revision, ready to merge into the local vault.
 */
import { z } from "zod";
import { CloudBackupTombstoneSchema, type CloudBackupTombstone } from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { getLocalCloudBackupRecord } from "./backup-records";
import { cloudBackupHeaders } from "./request-headers";
import type { MergeEntity, MergeInput, MergeSide } from "./merge";

const FeedEntitySchema = z.object({ id: z.string(), title: z.string() });

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
      tombstones: CloudBackupTombstone[];
    }
  | { kind: "resync"; revision: number }
  /** An older worker without the feed, or a body this client cannot read. */
  | { kind: "unsupported" }
  /** An editor's link no longer works. */
  | { kind: "linkGone" }
  /** No enabled backup for the vault; nothing was requested. */
  | { kind: "off" }
  | { kind: "failed"; error: string; status?: number; code?: string };

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
    tombstones: body.tombstones,
  };
}

/**
 * The three sides of a merge for a feed result.
 *
 * `mergeEntities` walks the union of ids, so an id missing from `theirs`
 * reads as a remote delete. A feed lists only what changed, so its sides hold
 * only the feed's ids. A resync lists every entity of the backup, so there
 * `mine` and `base` stay whole and a local entity the backup lacks merges as a
 * remote delete only when it has a base.
 */
export function buildFeedMergeSides(input: {
  entities: readonly MergeEntity[];
  tombstones: readonly { id: string }[];
  mine: MergeSide;
  base: MergeSide;
  resync?: boolean;
}): MergeInput {
  const theirs: MergeSide = {};
  for (const entity of input.entities) theirs[entity.id] = entity;
  for (const { id } of input.tombstones) theirs[id] = null;
  if (input.resync) {
    return { base: input.base, mine: input.mine, theirs };
  }
  const only = (side: MergeSide): MergeSide => {
    const picked: MergeSide = {};
    for (const id of Object.keys(theirs)) {
      if (side[id]) picked[id] = side[id];
    }
    return picked;
  };
  return { base: only(input.base), mine: only(input.mine), theirs };
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
