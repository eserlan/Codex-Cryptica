import { CLOUD_BACKUP_SCHEMA_V2 } from "../../../../packages/schema/src/publishing";
import {
  type CloudBackupEnv,
  MissingBackupObjectError,
  absoluteKey,
  readJson,
  readReferenced,
  resolveObjects,
} from "./cloud-backup-storage";
import { json, notFoundOrUnauthorized } from "./cloud-backup-http";
import { authorizeStoredBackup } from "./cloud-backup-auth";
import { readAllEntities } from "./cloud-backup-shards";

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
