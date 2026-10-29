import {
  CLOUD_BACKUP_SCHEMA_V2,
  CLOUD_BACKUP_SHARD_COUNT,
  type CloudBackupManifest,
} from "../../../../packages/schema/src/publishing";
import {
  bundleEntities,
  groupByShard,
  hashEntities,
} from "./cloud-backup-entities";
import {
  type CloudBackupEnv,
  getBundleKey,
  getAssetKey,
  storedBytes,
  jsonByteLength,
  writeJson,
  writeManifest,
  pruneAssets,
} from "./cloud-backup-storage";
import { json, type BackupPayload, validatePayload } from "./cloud-backup-http";
import { readAuthorizedJsonBody } from "./cloud-backup-auth";
import { writeIndex, writeShards } from "./cloud-backup-shards";

/**
 * Commits a staged snapshot: bundle, then manifest, then prune.
 *
 * Order matters. Assets are already uploaded individually by this point, so
 * the only writes here are small. The manifest lands after the bundle because
 * until it does the backup still describes the previous, complete state; the
 * prune runs last because deleting first would leave a bundle whose media is
 * gone — a corrupt remote copy the user has no way to detect. The worst case
 * is a few orphaned assets, which the next commit clears.
 */
async function commitSnapshot(
  env: CloudBackupEnv,
  backupId: string,
  payload: BackupPayload,
  manifest: CloudBackupManifest,
  ownerCodeHash: string,
): Promise<CloudBackupManifest> {
  const entities = bundleEntities(payload.bundle);
  let committed = manifest;
  if (entities) {
    // Schema v2 (#3354): shard the entities so later uploads can be deltas.
    const { entities: _entities, ...rest } = payload.bundle as Record<
      string,
      unknown
    >;
    await writeShards(env, backupId, groupByShard(entities), true);
    await writeIndex(env, backupId, await hashEntities(entities));
    await writeJson(env, getBundleKey(backupId), rest);
    committed = {
      ...manifest,
      schemaVersion: CLOUD_BACKUP_SCHEMA_V2,
      shardCount: CLOUD_BACKUP_SHARD_COUNT,
      entityCount: entities.length,
    };
  } else {
    await writeJson(env, getBundleKey(backupId), payload.bundle);
  }

  await writeManifest(env, backupId, committed, ownerCodeHash);

  const keep = new Set(
    (payload.assetIds ?? []).map((id) => getAssetKey(backupId, id)),
  );
  await pruneAssets(env, backupId, keep);
  return committed;
}

/**
 * POST /api/cloud-backup/{backupId}/commit — publishes the staged snapshot.
 *
 * Carries the bundle, which is text only and so stays small, plus the ids of
 * the assets that belong to this snapshot. Anything else under the backup is
 * pruned, which is how a deleted image eventually leaves storage.
 */
export async function handleCommitCloudBackup(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  const read = await readAuthorizedJsonBody(request, env, backupId);
  if ("response" in read) return read.response;
  const { auth, body } = read;

  const validated = validatePayload(request, body);
  if ("response" in validated) return validated.response;
  const { payload } = validated;

  const manifest: CloudBackupManifest = {
    ...auth.manifest,
    vaultTitle: payload.vaultTitle,
    sizeBytes:
      (await storedBytes(env, backupId)) + jsonByteLength(payload.bundle),
    lastPushedAt: new Date().toISOString(),
  };

  // `authorize` already proved the presented code matches, and a commit never
  // changes it — carry the stored hash through rather than re-deriving it.
  const committed = await commitSnapshot(
    env,
    backupId,
    payload,
    manifest,
    auth.ownerCodeHash,
  );

  return json(request, { manifest: committed });
}
