import { z } from "zod";
import {
  CLOUD_BACKUP_LIMITS,
  CLOUD_BACKUP_OWNER_EDITOR,
  canonicalJson,
  cloudBackupRevisionOf,
  cloudBackupShardOf,
  hashCloudBackupEntity,
  type CloudBackupEntitySyncMeta,
  type CloudBackupManifest,
  type CloudBackupTrashEviction,
} from "../../../../packages/schema/src/publishing";
import type { Shard } from "./cloud-backup-entities";
import {
  type BackupObjects,
  type CloudBackupEnv,
  absoluteKey,
  getBackupPrefix,
  jsonByteLength,
  listKeys,
  readJson,
  reachableBytes,
  resolveObjects,
} from "./cloud-backup-storage";
import {
  json,
  sizeLimitResponse,
  storageUnavailable,
} from "./cloud-backup-http";
import {
  type IndexState,
  type PreparedDelta,
  conflict,
  indexGrowth,
  lostRace,
  readIndexState,
  readShards,
  shardGrowth,
  sizeOfReferenced,
  stageDelta,
  trashEntity,
} from "./cloud-backup-delta";
import {
  type RestorePoint,
  publishCommit,
  readRestorePoint,
} from "./cloud-backup-restore-points";
import {
  type WholeChanges,
  type WholeItem,
  type WholeMetaRecord,
  applyWholeChanges,
  asItems,
  wholeShardNames,
} from "./cloud-backup-whole-items";
import { pruneTrash } from "./cloud-backup-trash";
import { readAuthorizedJsonBody } from "./cloud-backup-auth";

const RollbackBodySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dryRun: z.boolean().optional(),
    baseRevision: z.number().int().min(0).optional(),
  })
  .refine((body) => body.dryRun === true || body.baseRevision !== undefined);

interface RollbackCounts {
  changed: number;
  returning: number;
  trashed: number;
}

type Bundle = Record<string, unknown>;

const BUNDLE_SECTIONS = ["maps", "canvases", "assetManifest"] as const;

async function readBundle(
  env: CloudBackupEnv,
  backupId: string,
  objects: BackupObjects,
): Promise<{ bundle: Bundle | null; bytes: number }> {
  if (!objects.bundle) return { bundle: null, bytes: 0 };
  const bundle = await readJson<Bundle>(
    env,
    absoluteKey(backupId, objects.bundle),
  );
  return {
    bundle,
    bytes: await sizeOfReferenced(env, backupId, objects.bundle),
  };
}

const itemHash = async (item: WholeItem, meta?: WholeMetaRecord[string]) =>
  meta?.hash ?? (await hashCloudBackupEntity(item));

/** Whether a stored item and the point's item are the same, files included. */
async function sameItem(
  stored: WholeItem,
  storedMeta: WholeMetaRecord[string] | undefined,
  item: WholeItem,
  itemMeta: WholeMetaRecord[string] | undefined,
): Promise<boolean> {
  return (
    (await itemHash(stored, storedMeta)) === (await itemHash(item, itemMeta)) &&
    canonicalJson(itemMeta?.assets ?? []) ===
      canonicalJson(storedMeta?.assets ?? [])
  );
}

/** What it takes for one kind of whole item to become the point's. */
async function planWholeRollback(
  current: WholeItem[],
  currentMeta: WholeMetaRecord,
  target: WholeItem[],
  targetMeta: WholeMetaRecord,
): Promise<{ changes: WholeChanges; counts: RollbackCounts }> {
  const counts: RollbackCounts = { changed: 0, returning: 0, trashed: 0 };
  const byId = new Map(current.map((item) => [item.id, item]));
  const upserts: WholeChanges["upserts"] = [];
  for (const item of target) {
    const stored = byId.get(item.id);
    const meta = targetMeta[item.id];
    if (stored && (await sameItem(stored, currentMeta[item.id], item, meta))) {
      continue;
    }
    counts[stored ? "changed" : "returning"]++;
    upserts.push({ item, ...(meta?.assets ? { assets: meta.assets } : {}) });
  }
  const kept = new Set(target.map((item) => item.id));
  const deletes = current.filter((item) => !kept.has(item.id));
  counts.trashed = deletes.length;
  const changed = upserts.length > 0 || deletes.length > 0;
  return {
    changes: { upserts, deletes, list: changed ? target : null },
    counts,
  };
}

/** The current bundle with the point's maps, canvases and asset manifest; null when that changes nothing. */
function nextBundleFor(
  current: Bundle | null,
  point: Bundle | null,
): Bundle | null {
  const next: Bundle = { ...(current ?? {}) };
  for (const section of BUNDLE_SECTIONS) {
    if (point && section in point) next[section] = point[section];
    else delete next[section];
  }
  const same = BUNDLE_SECTIONS.every(
    (section) =>
      canonicalJson(next[section] ?? null) ===
      canonicalJson(current?.[section] ?? null),
  );
  return same ? null : next;
}

/** Which entities the point changes, brings back or trashes, with their counts. */
function diffEntities(current: IndexState, target: IndexState) {
  const counts: RollbackCounts = { changed: 0, returning: 0, trashed: 0 };
  const entityIds: string[] = [];
  for (const [id, hash] of Object.entries(target.hashes)) {
    if (!Object.hasOwn(current.hashes, id)) counts.returning++;
    else if (current.hashes[id] !== hash) counts.changed++;
    else continue;
    entityIds.push(id);
  }
  const trashedIds = Object.keys(current.hashes).filter(
    (id) => !Object.hasOwn(target.hashes, id),
  );
  counts.trashed = trashedIds.length;
  return { entityIds, trashedIds, counts };
}

/** Writes the point's entities over the current ones and trashes the rest. */
function applyEntityRollback(
  current: IndexState,
  target: IndexState,
  ids: { entityIds: string[]; trashedIds: string[] },
  stamp: CloudBackupEntitySyncMeta,
  maps: {
    shards: Map<string, Shard>;
    pointShards: Map<string, Shard>;
    trash: Map<string, Shard>;
  },
): void {
  const { hashes, meta, tombstones } = current;
  for (const id of ids.trashedIds) {
    trashEntity(id, stamp, current, maps.shards, maps.trash);
  }
  for (const id of ids.entityIds) {
    const name = cloudBackupShardOf(id);
    const entity = maps.pointShards.get(name)![id];
    if (!entity) throw new Error(`Restore point is missing entity ${id}`);
    maps.shards.get(name)![id] = entity;
    hashes[id] = target.hashes[id];
    meta[id] = stamp;
    delete tombstones[id];
    delete maps.trash.get(name)![id];
  }
}

/**
 * Works out what the point's content changes against the current vault. The
 * dry run and the commit both take their counts from here.
 */
async function planRollback(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  point: RestorePoint,
  stamp: CloudBackupEntitySyncMeta,
): Promise<{ prepared: PreparedDelta; counts: RollbackCounts }> {
  const current = await readIndexState(env, backupId, base);
  const target = await readIndexState(env, backupId, point.objects);
  const { entityIds, trashedIds, counts } = diffEntities(current, target);
  const names = new Set(
    [...entityIds, ...trashedIds].map((id) => cloudBackupShardOf(id)),
  );

  const [currentRead, pointRead] = await Promise.all([
    readBundle(env, backupId, base),
    readBundle(env, backupId, point.objects),
  ]);
  const currentBundle = currentRead.bundle;
  const pointBundle = pointRead.bundle;
  const maps = await planWholeRollback(
    asItems(currentBundle?.maps),
    current.mapMeta,
    asItems(pointBundle?.maps),
    target.mapMeta,
  );
  const canvases = await planWholeRollback(
    asItems(currentBundle?.canvases),
    current.canvasMeta,
    asItems(pointBundle?.canvases),
    target.canvasMeta,
  );
  for (const { counts: whole } of [maps, canvases]) {
    counts.changed += whole.changed;
    counts.returning += whole.returning;
    counts.trashed += whole.trashed;
  }

  const shards = await readShards(env, backupId, names, base.shards);
  const trash = await readShards(
    env,
    backupId,
    new Set([...names, ...wholeShardNames([maps.changes, canvases.changes])]),
    base.trash,
  );
  const pointShards = await readShards(
    env,
    backupId,
    names,
    point.objects.shards,
  );
  applyEntityRollback(current, target, { entityIds, trashedIds }, stamp, {
    shards,
    pointShards,
    trash,
  });
  const { hashes, meta, tombstones } = current;
  await applyWholeChanges(
    "map",
    maps.changes,
    { meta: current.mapMeta, tombstones, trash },
    stamp,
  );
  await applyWholeChanges(
    "canvas",
    canvases.changes,
    { meta: current.canvasMeta, tombstones, trash },
    stamp,
  );
  const { purgedRev, trashDrops, trashEvicted } = await pruneTrash(
    env,
    backupId,
    base,
    trash,
    tombstones,
  );

  const bundle = nextBundleFor(currentBundle, pointBundle);
  const projected =
    (await reachableBytes(env, backupId, base)) +
    (await shardGrowth(env, backupId, base, shards)) +
    (await indexGrowth(
      env,
      backupId,
      base,
      hashes,
      meta,
      tombstones,
      current,
    )) +
    (bundle ? jsonByteLength(bundle) - currentRead.bytes : 0);
  return {
    counts,
    prepared: {
      purgedRev,
      shards,
      trash,
      trashDrops,
      ...(trashEvicted ? { trashEvicted } : {}),
      tombstones,
      hashes,
      meta,
      whole: current,
      bundle,
      keptAssetIds: [],
      projectedBytes: projected,
    },
  };
}

/** Removes everything staged under a commit's tag, including a partial write. */
async function discardCommitKeys(
  env: CloudBackupEnv,
  backupId: string,
  tag: string,
): Promise<void> {
  try {
    for (const key of await listKeys(
      env,
      `${getBackupPrefix(backupId)}commits/${tag}/`,
    )) {
      await env.BUCKET.delete(key);
    }
  } catch {
    // Leftovers are unreachable and never counted.
  }
}

async function stageAndPublishRollback(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  input: {
    auth: {
      manifest: CloudBackupManifest;
      ownerCodeHash: string;
      etag?: string;
      sharing?: import("./cloud-backup-storage").SharingRecord;
    };
    base: BackupObjects;
    point: RestorePoint;
    plan: { prepared: PreparedDelta; counts: RollbackCounts };
    revision: number;
    lastPushedAt: string;
    tag: string;
  },
): Promise<Response> {
  const { auth, base, point, plan, revision, lastPushedAt, tag } = input;
  const trashEvicted: CloudBackupTrashEviction | undefined =
    plan.prepared.trashEvicted;
  let committed: CloudBackupManifest;
  let staged: BackupObjects;
  let objects: BackupObjects;
  try {
    ({ staged, objects } = await stageDelta(
      env,
      backupId,
      tag,
      base,
      plan.prepared,
    ));
    // Publish asset versions through the same manifest pointer as the content.
    // The asset route reads these immutable copies, so a failed commit cannot
    // expose the restore point's bytes as part of the still-current revision.
    objects.assetVersions = point.assets;
    committed = {
      ...auth.manifest,
      entityCount: Object.keys(plan.prepared.hashes).length,
      sizeBytes: await reachableBytes(env, backupId, objects),
      lastPushedAt,
      revision: revision + 1,
      feedHorizon: Math.max(
        auth.manifest.feedHorizon ?? revision,
        plan.prepared.purgedRev,
      ),
    };
  } catch {
    await discardCommitKeys(env, backupId, tag);
    return storageUnavailable(request);
  }

  let response: Response;
  try {
    response = await publishCommit(
      request,
      env,
      backupId,
      {
        committed,
        objects,
        staged,
        base,
        ownerCodeHash: auth.ownerCodeHash,
        etag: auth.etag,
        sharing: auth.sharing,
        assetIds: undefined,
      },
      () => lostRace(request, env, backupId, staged, auth.manifest),
    );
  } catch {
    // The manifest write may have been saved before it threw, so what it
    // points at must stay. Leftovers are unreachable and the next winning
    // commit cleans them up, as for a delta.
    return storageUnavailable(request);
  }
  return response.ok
    ? json(request, {
        manifest: committed,
        rollback: plan.counts,
        ...(trashEvicted ? { trashEvicted } : {}),
      })
    : response;
}

/**
 * POST /api/cloud-backup/{backupId}/rollback — owner only.
 *
 * Writes a restore point's content as a new revision through the same staged,
 * etag-conditional switch a delta uses. Nothing is reset: what the point lacks
 * goes to the trash and members receive the result as ordinary changes.
 * `dryRun` answers with the counts and writes nothing.
 */
export async function handleCloudBackupRollback(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  const read = await readAuthorizedJsonBody(request, env, backupId, true);
  if ("response" in read) return read.response;
  const { auth } = read;
  const parsed = RollbackBodySchema.safeParse(read.body);
  if (!parsed.success) {
    return json(request, { error: { message: "Invalid rollback" } }, 400);
  }
  const { date, dryRun, baseRevision } = parsed.data;

  const revision = cloudBackupRevisionOf(auth.manifest);
  let point: RestorePoint | null;
  try {
    point = await readRestorePoint(env, backupId, date);
  } catch {
    return storageUnavailable(request);
  }
  if (!point) {
    return json(
      request,
      {
        error: {
          code: "restore_point_not_found",
          message: "That restore point no longer exists.",
        },
      },
      404,
    );
  }
  if (!dryRun && baseRevision !== revision) {
    return conflict(
      request,
      "diverged",
      "The cloud backup changed since this rollback was checked.",
      auth.manifest.lastPushedAt,
      revision,
    );
  }

  const lastPushedAt = new Date().toISOString();
  const tag = `${revision + 1}-${crypto.randomUUID()}`;
  let base: BackupObjects;
  let plan: { prepared: PreparedDelta; counts: RollbackCounts };
  try {
    base = await resolveObjects(env, backupId, auth.objects);
    plan = await planRollback(env, backupId, base, point, {
      rev: revision + 1,
      editedBy: CLOUD_BACKUP_OWNER_EDITOR,
      editedAt: lastPushedAt,
    });
  } catch {
    return storageUnavailable(request);
  }
  const oversized = sizeLimitResponse(
    request,
    plan.prepared.projectedBytes,
    CLOUD_BACKUP_LIMITS.maxVaultBytes,
    "This vault is too large to back up.",
  );
  if (oversized) return oversized;
  if (dryRun) {
    const trashEvicted = plan.prepared.trashEvicted;
    return json(request, {
      preview: {
        date,
        revision,
        ...plan.counts,
        ...(trashEvicted ? { trashEvicted } : {}),
      },
    });
  }
  return stageAndPublishRollback(request, env, backupId, {
    auth,
    base,
    point,
    plan,
    revision,
    lastPushedAt,
    tag,
  });
}
