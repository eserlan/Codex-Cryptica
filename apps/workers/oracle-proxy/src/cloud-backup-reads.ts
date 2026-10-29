import { CLOUD_BACKUP_SCHEMA_V2 } from "../../../../packages/schema/src/publishing";
import {
  type CloudBackupEnv,
  getBundleKey,
  getIndexKey,
  readJson,
} from "./cloud-backup-storage";
import { json, notFoundOrUnauthorized } from "./cloud-backup-http";
import { authorizeStoredBackup } from "./cloud-backup-auth";
import { readAllEntities } from "./cloud-backup-shards";

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
  const auth = await authorizeStoredBackup(request, env, backupId);
  if ("response" in auth) return auth.response;

  const bundle = await readJson<Record<string, unknown>>(
    env,
    getBundleKey(backupId),
  );
  if (!bundle) return notFoundOrUnauthorized(request);

  // v2 keeps entities in shards; restore clients see the same shape either way.
  if (auth.manifest.schemaVersion === CLOUD_BACKUP_SCHEMA_V2) {
    bundle.entities = await readAllEntities(env, backupId);
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
  const auth = await authorizeStoredBackup(request, env, backupId);
  if ("response" in auth) return auth.response;

  const index = await readJson<{ entityHashes: Record<string, string> }>(
    env,
    getIndexKey(backupId),
  );
  return json(request, {
    lastPushedAt: auth.manifest.lastPushedAt,
    entityHashes: index?.entityHashes ?? {},
  });
}
