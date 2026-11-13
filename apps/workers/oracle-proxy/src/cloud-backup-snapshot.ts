import {
  CLOUD_BACKUP_OWNER_EDITOR,
  CLOUD_BACKUP_SCHEMA_V2,
  CLOUD_BACKUP_SHARD_COUNT,
  cloudBackupRevisionOf,
  type CloudBackupEntitySyncMeta,
  type CloudBackupManifest,
} from "../../../../packages/schema/src/publishing";
import {
  bundleEntities,
  groupByShard,
  hashEntities,
} from "./cloud-backup-entities";
import {
  type BackupObjects,
  type CloudBackupEnv,
  cleanupSuperseded,
  getAssetKey,
  getStagedKey,
  reachableBytes,
  resolveObjects,
  writeJson,
  writeManifest,
  pruneAssets,
} from "./cloud-backup-storage";
import { json, type BackupPayload, validatePayload } from "./cloud-backup-http";
import { readAuthorizedJsonBody } from "./cloud-backup-auth";
import { lostRace } from "./cloud-backup-delta";
import {
  carryTombstones,
  stageIndex,
  stageShards,
  stagedName,
} from "./cloud-backup-shards";

/**
 * Commits a staged snapshot: bundle, then manifest, then prune.
 *
 * Order matters. Assets are already uploaded individually by this point, so
 * the only writes here are small. Everything is staged under keys of this
 * commit alone, so until the manifest switch the backup still describes the
 * previous, complete state; the switch is etag-conditional, so a commit that
 * lost a race changes nothing. The prune runs last because deleting first would
 * leave a bundle whose media is gone — a corrupt remote copy the user has no
 * way to detect. The worst case is a few orphaned assets, which the next commit
 * clears.
 */
async function commitSnapshot(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  payload: BackupPayload,
  auth: {
    manifest: CloudBackupManifest;
    ownerCodeHash: string;
    etag?: string;
    objects?: BackupObjects;
  },
): Promise<Response> {
  const lastPushedAt = new Date().toISOString();
  const revision = cloudBackupRevisionOf(auth.manifest) + 1;
  const tag = `${revision}-${crypto.randomUUID()}`;
  const entities = bundleEntities(payload.bundle);
  const staged: BackupObjects = {};
  let committed: CloudBackupManifest = {
    ...auth.manifest,
    vaultTitle: payload.vaultTitle,
    lastPushedAt,
    revision,
    // A full upload can drop entities without tombstones, so the feed restarts here.
    feedHorizon: revision,
  };
  const base = await resolveObjects(env, backupId, auth.objects);
  if (entities) {
    // Schema v2 (#3354): shard the entities so later uploads can be deltas.
    const { entities: _entities, ...rest } = payload.bundle as Record<
      string,
      unknown
    >;
    staged.shards = await stageShards(
      env,
      backupId,
      tag,
      groupByShard(entities),
    );
    const stamp: CloudBackupEntitySyncMeta = {
      rev: revision,
      editedBy: CLOUD_BACKUP_OWNER_EDITOR,
      editedAt: lastPushedAt,
    };
    const entityMeta = Object.fromEntries(
      entities.map((entity) => [entity.id, stamp]),
    );
    const carried = await carryTombstones(
      env,
      backupId,
      base,
      new Set(entities.map((entity) => entity.id)),
    );
    const trash = await stageShards(env, backupId, tag, carried.trash, "trash");
    if (Object.keys(trash).length > 0) staged.trash = trash;
    staged.index = await stageIndex(
      env,
      backupId,
      tag,
      await hashEntities(entities),
      entityMeta,
      carried.tombstones,
    );
    await writeJson(env, getStagedKey(backupId, tag, "bundle.json"), rest);
    committed = {
      ...committed,
      schemaVersion: CLOUD_BACKUP_SCHEMA_V2,
      shardCount: CLOUD_BACKUP_SHARD_COUNT,
      entityCount: entities.length,
    };
  } else {
    await writeJson(
      env,
      getStagedKey(backupId, tag, "bundle.json"),
      payload.bundle,
    );
  }
  staged.bundle = stagedName(tag, "bundle.json");
  committed.sizeBytes = await reachableBytes(env, backupId, staged);

  const won = await writeManifest(
    env,
    backupId,
    committed,
    auth.ownerCodeHash,
    staged,
    auth.etag,
  );
  if (!won) return lostRace(request, env, backupId, staged, auth.manifest);

  await cleanupSuperseded(env, backupId, revision, staged, base);
  const keep = new Set(
    (payload.assetIds ?? []).map((id) => getAssetKey(backupId, id)),
  );
  await pruneAssets(env, backupId, keep);
  return json(request, { manifest: committed });
}

/**
 * POST /api/cloud-backup/{backupId}/commit — publishes the staged snapshot.
 *
 * Carries the bundle, which is text only and so stays small, plus the ids of
 * the assets that belong to this snapshot. Anything else under the backup is
 * pruned, which is how a deleted image eventually leaves storage. Answers 409
 * `diverged` if another commit switched the manifest after this one was
 * authorised.
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

  return commitSnapshot(request, env, backupId, validated.payload, auth);
}
