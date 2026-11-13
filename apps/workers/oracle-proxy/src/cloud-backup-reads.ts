import {
  CLOUD_BACKUP_SCHEMA_V2,
  cloudBackupRevisionOf,
  cloudBackupShardOf,
  type CloudBackupEntitySyncMeta,
  type CloudBackupManifest,
} from "../../../../packages/schema/src/publishing";
import type { Shard } from "./cloud-backup-entities";
import {
  type BackupObjects,
  type CloudBackupEnv,
  MissingBackupObjectError,
  absoluteKey,
  readJson,
  readReferenced,
  resolveObjects,
} from "./cloud-backup-storage";
import { json, notFoundOrUnauthorized } from "./cloud-backup-http";
import { authorizeStoredBackup } from "./cloud-backup-auth";
import { type Tombstones, readAllEntities } from "./cloud-backup-shards";

/** A referenced object is gone: fail rather than return a partial backup. */
function incomplete(request: Request): Response {
  return json(request, { error: { message: "Backup is incomplete" } }, 500);
}

/** Authorises a read and resolves the objects the manifest currently references. */
async function authorizeWithObjects(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
) {
  const auth = await authorizeStoredBackup(request, env, backupId);
  if ("response" in auth) return auth;
  return { auth, objects: await resolveObjects(env, backupId, auth.objects) };
}

/** GET /api/cloud-backup/{backupId}/status */
export async function handleGetCloudBackupStatus(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  const auth = await authorizeStoredBackup(request, env, backupId);
  if ("response" in auth) return auth.response;

  // "syncing" is a client-local transient; the server only knows idle or error.
  return json(request, {
    status: "idle",
    lastPushedAt: auth.manifest.lastPushedAt,
    sizeBytes: auth.manifest.sizeBytes,
  });
}

/** GET /api/cloud-backup/{backupId}/bundle — restore read (FR-006). */
export async function handleGetCloudBackupBundle(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  const read = await authorizeWithObjects(request, env, backupId);
  if ("response" in read) return read.response;
  const { auth, objects } = read;
  const bundle = objects.bundle
    ? await readJson<Record<string, unknown>>(
        env,
        absoluteKey(backupId, objects.bundle),
      )
    : null;
  if (!bundle) return notFoundOrUnauthorized(request);

  // v2 keeps entities in shards; restore clients see the same shape either way.
  if (auth.manifest.schemaVersion === CLOUD_BACKUP_SCHEMA_V2) {
    try {
      bundle.entities = await readAllEntities(env, backupId, objects);
    } catch (error) {
      if (error instanceof MissingBackupObjectError) return incomplete(request);
      throw error;
    }
  }

  // A pure read: lastPushedAt is deliberately untouched.
  return json(request, { manifest: auth.manifest, bundle });
}

/**
 * GET /api/cloud-backup/{backupId}/index (#3354) — per-entity content hashes of
 * a v2 backup, for the client's idle consistency check. Hashes only, never
 * content. A v1 backup has no index and returns an empty map.
 */
export async function handleGetCloudBackupIndex(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  const read = await authorizeWithObjects(request, env, backupId);
  if ("response" in read) return read.response;
  const { auth, objects } = read;
  let index: { entityHashes: Record<string, string> } | null = null;
  if (objects.index) {
    try {
      index = await readReferenced(env, backupId, objects.index);
    } catch (error) {
      if (error instanceof MissingBackupObjectError) return incomplete(request);
      throw error;
    }
  }
  return json(request, {
    lastPushedAt: auth.manifest.lastPushedAt,
    entityHashes: index?.entityHashes ?? {},
  });
}

interface ChangeFeedIndex {
  entityHashes: Record<string, string>;
  entityMeta?: Record<string, CloudBackupEntitySyncMeta>;
  tombstones?: Tombstones;
}

const byId = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

function parseSince(request: Request): number | null {
  const raw = new URL(request.url).searchParams.get("since");
  const since = raw !== null && /^\d+$/.test(raw) ? Number(raw) : NaN;
  return Number.isSafeInteger(since) ? since : null;
}

/** Whether the feed can serve `since`: "up to date", "resync", or "serve". */
function feedVerdict(
  manifest: CloudBackupManifest,
  since: number,
): "current" | "resync" | "serve" {
  const revision = cloudBackupRevisionOf(manifest);
  const horizon = manifest.feedHorizon ?? revision;
  // since=0 is a device with nothing, so a backup at revision 0 is not "up to date".
  if (since > 0 && since === revision) return "current";
  if (since > revision || manifest.schemaVersion !== CLOUD_BACKUP_SCHEMA_V2) {
    return "resync";
  }
  return since !== 0 && since < horizon ? "resync" : "serve";
}

/** Live ids stamped after `since`; an id with no meta counts as revision 0. */
function changedIds(index: ChangeFeedIndex | null, since: number): string[] {
  const meta = index?.entityMeta ?? {};
  const ids = Object.keys(index?.entityHashes ?? {});
  return since === 0 ? ids : ids.filter((id) => (meta[id]?.rev ?? 0) > since);
}

/** Groups ids by the shard that holds them. */
function groupIdsByShard(ids: string[]): Map<string, string[]> {
  const byShard = new Map<string, string[]>();
  for (const id of ids) {
    const name = cloudBackupShardOf(id);
    byShard.set(name, [...(byShard.get(name) ?? []), id]);
  }
  return byShard;
}

/** The live entities stamped after `since`, read from only the shards that hold them. */
async function readChangedEntities(
  env: CloudBackupEnv,
  backupId: string,
  objects: BackupObjects,
  index: ChangeFeedIndex | null,
  since: number,
): Promise<Array<{ entity: { id: string }; meta?: unknown }>> {
  const meta = index?.entityMeta ?? {};
  const entities: Array<{ entity: { id: string }; meta?: unknown }> = [];
  for (const [name, ids] of groupIdsByShard(changedIds(index, since))) {
    const reference = objects.shards?.[name];
    if (!reference) throw new MissingBackupObjectError(name);
    const shard = await readReferenced<Shard>(env, backupId, reference);
    for (const id of ids) {
      if (!(id in shard)) throw new MissingBackupObjectError(id);
      entities.push({
        entity: shard[id],
        ...(meta[id] ? { meta: meta[id] } : {}),
      });
    }
  }
  return entities.sort((a, b) => byId(a.entity, b.entity));
}

/**
 * GET /api/cloud-backup/{backupId}/changes?since=N — the live entities and
 * tombstones stamped after revision N, or `resync` when the feed cannot vouch
 * for every change since N. Reads only what the manifest references.
 */
export async function handleGetCloudBackupChanges(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  const read = await authorizeWithObjects(request, env, backupId);
  if ("response" in read) return read.response;
  const { auth, objects } = read;

  const since = parseSince(request);
  if (since === null) {
    return json(request, { error: { message: "Invalid since" } }, 400);
  }
  const revision = cloudBackupRevisionOf(auth.manifest);
  const verdict = feedVerdict(auth.manifest, since);
  if (verdict === "resync") {
    return json(request, { status: "resync", revision });
  }
  if (verdict === "current") {
    return json(request, {
      status: "changes",
      revision,
      entities: [],
      tombstones: [],
    });
  }

  try {
    const index = objects.index
      ? await readReferenced<ChangeFeedIndex>(env, backupId, objects.index)
      : null;
    const entities = await readChangedEntities(
      env,
      backupId,
      objects,
      index,
      since,
    );
    const tombstones = Object.values(index?.tombstones ?? {})
      .filter((tombstone) => since === 0 || tombstone.rev > since)
      .sort(byId);
    return json(request, { status: "changes", revision, entities, tombstones });
  } catch (error) {
    if (error instanceof MissingBackupObjectError) return incomplete(request);
    throw error;
  }
}
