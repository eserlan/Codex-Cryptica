import { z } from "zod";
import type { CloudBackupManifest } from "../../../../packages/schema/src/publishing";
import {
  BackupObjectsSchema,
  type BackupObjects,
  type CloudBackupEnv,
  type SharingRecord,
  acquireBackupMutationLock,
  cleanupSuperseded,
  discardStaged,
  getAssetKey,
  getBackupPrefix,
  listKeys,
  listObjectPages,
  pruneAssets,
  readJson,
  referencedKeys,
  writeManifest,
} from "./cloud-backup-storage";
import { authorizeOwner } from "./cloud-backup-auth";
import { json, storageUnavailable } from "./cloud-backup-http";

/** One point per UTC day, today included. */
const RESTORE_POINT_DAYS = 30;
const DAY_MS = 86_400_000;

/**
 * A restore point is a record of references to objects the commit already
 * stored. Only assets, which are overwritten in place, are ever copied.
 */
const RestorePointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  takenAt: z.string(),
  revision: z.number().int().min(0),
  entityCount: z.number().int().min(0),
  objects: BackupObjectsSchema,
  assets: z.record(z.string(), z.string()),
});
type RestorePoint = z.infer<typeof RestorePointSchema>;

const POINTS_DIR = "restore-points/points/";
const ASSETS_DIR = "restore-points/assets/";

function getRestorePointKey(backupId: string, date: string): string {
  return `${getBackupPrefix(backupId)}${POINTS_DIR}${date}.json`;
}

function getPreservedAssetKey(
  backupId: string,
  assetId: string,
  etag: string,
): string {
  return `${getBackupPrefix(backupId)}${ASSETS_DIR}${assetId}/${etag}`;
}

const utcDate = (time: number) => new Date(time).toISOString().slice(0, 10);

/** Reads every live point. Throws on any failure, so callers can fail safe. */
async function loadPoints(
  env: CloudBackupEnv,
  backupId: string,
): Promise<Array<{ key: string; record: RestorePoint }>> {
  const points: Array<{ key: string; record: RestorePoint }> = [];
  for (const key of await listKeys(
    env,
    `${getBackupPrefix(backupId)}${POINTS_DIR}`,
  )) {
    const stored = await readJson<unknown>(env, key);
    if (stored !== null) {
      points.push({ key, record: RestorePointSchema.parse(stored) });
    }
  }
  return points;
}

function pointKeys(
  backupId: string,
  points: Array<{ record: RestorePoint }>,
): Set<string> {
  const kept = new Set<string>();
  for (const { record } of points) {
    for (const relative of referencedKeys(record.objects)) kept.add(relative);
  }
  return kept;
}

async function listAssetEtags(
  env: CloudBackupEnv,
  backupId: string,
): Promise<Record<string, string>> {
  const prefix = `${getBackupPrefix(backupId)}assets/`;
  const etags: Record<string, string> = {};
  for await (const listed of listObjectPages(env, prefix)) {
    for (const object of listed) {
      if (object.etag) etags[object.key.slice(prefix.length)] = object.etag;
    }
  }
  return etags;
}

/** Deletes expired points, then asset copies no remaining point references. */
async function applyRetention(
  env: CloudBackupEnv,
  backupId: string,
  today: string,
): Promise<void> {
  const cutoff = utcDate(
    Date.parse(`${today}T00:00:00Z`) - (RESTORE_POINT_DAYS - 1) * DAY_MS,
  );
  const live: Array<{ key: string; record: RestorePoint }> = [];
  for (const point of await loadPoints(env, backupId)) {
    if (point.record.date < cutoff) await env.BUCKET.delete(point.key);
    else live.push(point);
  }
  const referenced = new Set(
    live.flatMap(({ record }) =>
      Object.entries(record.assets).map(([id, etag]) =>
        getPreservedAssetKey(backupId, id, etag),
      ),
    ),
  );
  for (const key of await listKeys(
    env,
    `${getBackupPrefix(backupId)}${ASSETS_DIR}`,
  )) {
    if (!referenced.has(key)) await env.BUCKET.delete(key);
  }
}

/** Writes today's point unless one exists. Never overwrites a point. */
async function takePoint(
  env: CloudBackupEnv,
  backupId: string,
  committed: CloudBackupManifest,
  objects: BackupObjects,
  assetIds: string[] | undefined,
): Promise<void> {
  const now = new Date();
  const date = utcDate(now.getTime());
  const key = getRestorePointKey(backupId, date);
  if (await env.BUCKET.head(key)) return;

  const listed = await listAssetEtags(env, backupId);
  const wanted = assetIds ? new Set(assetIds) : null;
  const assets = Object.fromEntries(
    Object.entries(listed).filter(([id]) => !wanted || wanted.has(id)),
  );
  const record: RestorePoint = {
    date,
    takenAt: now.toISOString(),
    revision: committed.revision ?? 0,
    entityCount: committed.entityCount ?? 0,
    objects,
    assets,
  };
  const written = await env.BUCKET.put(key, JSON.stringify(record), {
    httpMetadata: { contentType: "application/json" },
    onlyIf: { etagDoesNotMatch: "*" },
  });
  if (written !== null) await applyRetention(env, backupId, date);
}

/**
 * Deletes every asset copy no live point references, except `keepKey`. Reads
 * the points again first, so a point taken meanwhile is respected. With this
 * run after each overwrite (keeping the copy just made) and each prune
 * (keeping none), unreferenced copies never total more than one asset version.
 * Narrow gap: a point taken between the reload and a delete can lose its copy
 * only if it references a version already overwritten without a copy.
 */
async function dropUnreferencedCopies(
  env: CloudBackupEnv,
  backupId: string,
  keepKey?: string,
): Promise<void> {
  const referenced = new Set(
    (await loadPoints(env, backupId)).flatMap(({ record }) =>
      Object.entries(record.assets).map(([id, etag]) =>
        getPreservedAssetKey(backupId, id, etag),
      ),
    ),
  );
  for (const key of await listKeys(
    env,
    `${getBackupPrefix(backupId)}${ASSETS_DIR}`,
  )) {
    if (key !== keepKey && !referenced.has(key)) await env.BUCKET.delete(key);
  }
}

/**
 * Copies the bytes of an asset version a point may still need, unless a copy
 * exists. Returns false when the copy failed and the version must stay put.
 */
async function preserveAsset(
  env: CloudBackupEnv,
  backupId: string,
  assetId: string,
  etag: string,
  shared: boolean,
  points: Array<{ record: RestorePoint }>,
): Promise<boolean> {
  const needed =
    shared || points.some(({ record }) => record.assets[assetId] === etag);
  if (!needed) return true;
  try {
    if (await env.BUCKET.head(getPreservedAssetKey(backupId, assetId, etag))) {
      return true;
    }
    const object = await env.BUCKET.get(getAssetKey(backupId, assetId));
    if (!object) return true;
    const copyKey = getPreservedAssetKey(
      backupId,
      assetId,
      object.etag ?? etag,
    );
    await env.BUCKET.put(copyKey, object.body, {
      httpMetadata: object.httpMetadata,
    });
    if (!points.some(({ record }) => record.assets[assetId] === etag)) {
      await dropUnreferencedCopies(env, backupId, copyKey);
    }
    return true;
  } catch {
    return false;
  }
}

/** Before `assets/<id>` is overwritten. False means do not overwrite. */
export async function preserveBeforeOverwrite(
  env: CloudBackupEnv,
  backupId: string,
  assetId: string,
  etag: string,
  shared: boolean,
): Promise<boolean> {
  try {
    const points = await loadPoints(env, backupId);
    return await preserveAsset(env, backupId, assetId, etag, shared, points);
  } catch {
    return false;
  }
}

/**
 * Everything a winning commit does after the manifest switch: take today's
 * point when shared, then clean up and prune without touching what a live point
 * references. If the points cannot be read, nothing is deleted.
 * `assetIds` undefined means the commit sent no asset list: no prune.
 */
export async function finishCommit(
  env: CloudBackupEnv,
  backupId: string,
  commit: {
    committed: CloudBackupManifest;
    objects: BackupObjects;
    base: BackupObjects;
    shared: boolean;
    assetIds: string[] | undefined;
  },
  releaseMutationLock?: () => Promise<void>,
): Promise<void> {
  const { committed, objects, base, shared, assetIds } = commit;
  try {
    if (shared) {
      try {
        await takePoint(env, backupId, committed, objects, assetIds);
      } catch {
        // Best effort: the next commit today tries again.
      }
    }
  } finally {
    await releaseMutationLock?.();
  }
  let points: Awaited<ReturnType<typeof loadPoints>>;
  try {
    points = await loadPoints(env, backupId);
  } catch {
    return;
  }
  await cleanupSuperseded(
    env,
    backupId,
    committed.revision ?? 0,
    objects,
    base,
    pointKeys(backupId, points),
  );
  if (!assetIds) return;
  const prefix = `${getBackupPrefix(backupId)}assets/`;
  await pruneAssets(
    env,
    backupId,
    new Set(assetIds.map((id) => getAssetKey(backupId, id))),
    ({ key, etag }) =>
      etag
        ? preserveAsset(
            env,
            backupId,
            key.slice(prefix.length),
            etag,
            // Only a version a live point references is copied on prune;
            // anything else is simply deleted.
            false,
            points,
          )
        : Promise.resolve(false),
  );
  try {
    await dropUnreferencedCopies(env, backupId);
  } catch {
    // Best effort: the next prune or overwrite sweeps again.
  }
}

/** Publishes a commit while serializing its point with other backup mutations. */
export async function publishCommit(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  input: {
    committed: CloudBackupManifest;
    objects: BackupObjects;
    staged: BackupObjects;
    base: BackupObjects;
    ownerCodeHash: string;
    etag?: string;
    sharing?: SharingRecord;
    assetIds: string[] | undefined;
  },
  onLostRace: () => Promise<Response>,
): Promise<Response> {
  const {
    committed,
    objects,
    staged,
    base,
    ownerCodeHash,
    etag,
    sharing,
    assetIds,
  } = input;
  const releaseMutationLock = sharing
    ? await acquireBackupMutationLock(env, backupId)
    : undefined;
  if (sharing && !releaseMutationLock) {
    await discardStaged(env, backupId, staged);
    return json(request, { error: { message: "Try again shortly." } }, 503);
  }

  let won: boolean;
  try {
    won = await writeManifest(
      env,
      backupId,
      committed,
      ownerCodeHash,
      objects,
      etag,
      sharing,
    );
  } catch (error) {
    await releaseMutationLock?.();
    throw error;
  }
  if (!won) {
    await releaseMutationLock?.();
    return onLostRace();
  }

  await finishCommit(
    env,
    backupId,
    { committed, objects, base, shared: sharing !== undefined, assetIds },
    releaseMutationLock,
  );
  return json(request, { manifest: committed });
}

/** GET /api/cloud-backup/{backupId}/restore-points — owner only. */
export async function handleListRestorePoints(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  const auth = await authorizeOwner(request, env, backupId);
  if ("response" in auth) return auth.response;
  try {
    const points = await loadPoints(env, backupId);
    return json(request, {
      restorePoints: points
        .map(({ record }) => ({
          date: record.date,
          revision: record.revision,
          entityCount: record.entityCount,
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    });
  } catch {
    return storageUnavailable(request);
  }
}
