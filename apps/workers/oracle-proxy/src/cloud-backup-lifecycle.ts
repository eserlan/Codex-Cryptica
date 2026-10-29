import {
  CLOUD_BACKUP_LIMITS,
  type CloudBackupManifest,
} from "../../../../packages/schema/src/publishing";
import {
  type CloudBackupEnv,
  writeManifest,
  eraseBackupObjects,
} from "./cloud-backup-storage";
import { json, readJsonBody, storageUnavailable } from "./cloud-backup-http";
import {
  hashOwnerCode,
  generateOwnerCode,
  authorizeStoredBackup,
} from "./cloud-backup-auth";
const SCHEMA_VERSION = 1;

/**
 * POST /api/cloud-backup/enable — opens a backup; returns the code once.
 *
 * Creates the manifest and nothing else. Content arrives afterwards: assets one
 * per request, then the bundle with the commit. That keeps every request small
 * enough to stay well inside the Worker's memory ceiling, which a whole vault
 * in one body does not.
 */
export async function handleEnableCloudBackup(
  request: Request,
  env: CloudBackupEnv,
): Promise<Response> {
  if (!env.BUCKET) return storageUnavailable(request);
  const read = await readJsonBody(request);
  if ("response" in read) return read.response;
  const { body } = read;

  const candidate = body as { vaultTitle?: unknown } | null;
  const vaultTitle =
    typeof candidate?.vaultTitle === "string" ? candidate.vaultTitle : "";
  if (
    !vaultTitle.trim() ||
    vaultTitle.length > CLOUD_BACKUP_LIMITS.maxTitleLength
  ) {
    return json(
      request,
      { error: { message: "A vault title is required" } },
      400,
    );
  }

  const backupId = crypto.randomUUID();
  const ownerCode = generateOwnerCode();
  const now = new Date().toISOString();
  const manifest: CloudBackupManifest = {
    schemaVersion: SCHEMA_VERSION,
    backupId,
    vaultTitle,
    // Nothing is stored yet; the commit records the real figure.
    sizeBytes: 0,
    createdAt: now,
    lastPushedAt: now,
  };

  await writeManifest(env, backupId, manifest, await hashOwnerCode(ownerCode));

  // The only time the raw code is ever transmitted.
  return json(request, { backupId, ownerCode, manifest }, 201);
}

/** DELETE /api/cloud-backup/{backupId} — permanent erase (FR-010). */
export async function handleDeleteCloudBackup(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  const auth = await authorizeStoredBackup(request, env, backupId);
  if ("response" in auth) return auth.response;

  await eraseBackupObjects(env, backupId);

  return json(request, { deleted: true });
}
