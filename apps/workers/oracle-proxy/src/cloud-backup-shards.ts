import type { EntityRecord, Shard } from "./cloud-backup-entities";
import {
  type CloudBackupEnv,
  getIndexKey,
  getShardKey,
  getBackupPrefix,
  listKeys,
  readJson,
  writeJson,
} from "./cloud-backup-storage";

export async function writeIndex(
  env: CloudBackupEnv,
  backupId: string,
  entityHashes: Record<string, string>,
): Promise<void> {
  await writeJson(env, getIndexKey(backupId), { entityHashes });
}

/**
 * Writes the given shards; an empty shard is deleted rather than stored. With
 * `replaceAll`, any existing shard not in the map is removed too, which is how
 * a full commit drops entities that no longer exist.
 */
export async function writeShards(
  env: CloudBackupEnv,
  backupId: string,
  shards: Map<string, Shard>,
  replaceAll: boolean,
): Promise<void> {
  for (const [name, shard] of shards) {
    const key = getShardKey(backupId, name);
    if (Object.keys(shard).length === 0) await env.BUCKET.delete(key);
    else await writeJson(env, key, shard);
  }
  if (!replaceAll) return;
  const keep = new Set(
    [...shards.keys()].map((name) => getShardKey(backupId, name)),
  );
  for (const key of await listKeys(
    env,
    `${getBackupPrefix(backupId)}entities/`,
  )) {
    if (!keep.has(key)) await env.BUCKET.delete(key);
  }
}

/** Every entity of a v2 backup, assembled from its shards. */
export async function readAllEntities(
  env: CloudBackupEnv,
  backupId: string,
): Promise<EntityRecord[]> {
  const entities: EntityRecord[] = [];
  const keys = await listKeys(env, `${getBackupPrefix(backupId)}entities/`);
  for (const key of keys.sort()) {
    const shard = await readJson<Shard>(env, key);
    if (shard) entities.push(...Object.values(shard));
  }
  return entities;
}
