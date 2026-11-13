import {
  CLOUD_BACKUP_LIMITS,
  cloudBackupShardOf,
} from "../../../../packages/schema/src/publishing";
import type { Shard } from "./cloud-backup-entities";
import type { Tombstones } from "./cloud-backup-shards";
import {
  type BackupObjects,
  type CloudBackupEnv,
  absoluteKey,
  jsonByteLength,
  readReferenced,
} from "./cloud-backup-storage";

async function trashBytes(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  loaded: Map<string, Shard>,
): Promise<number> {
  let total = 0;
  const names = new Set([...Object.keys(base.trash ?? {}), ...loaded.keys()]);
  for (const name of names) {
    const shard = loaded.get(name);
    const reference = base.trash?.[name];
    total += shard
      ? Object.keys(shard).length === 0
        ? 0
        : jsonByteLength(shard)
      : ((await env.BUCKET.head(absoluteKey(backupId, reference!)))?.size ?? 0);
  }
  return total;
}

/**
 * Keeps trash within `maxTrashBytes` by dropping the content of the oldest
 * tombstones (lowest `rev`) first. The tombstone records stay, since the change
 * feed needs them. `loaded` holds the trash shards already in memory; an
 * evicted entity in any other shard has that shard read and added to it.
 */
export async function evictOldestTrash(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  loaded: Map<string, Shard>,
  tombstones: Tombstones,
): Promise<void> {
  let total = await trashBytes(env, backupId, base, loaded);
  const oldestFirst = Object.values(tombstones).sort(
    (a, b) => a.rev - b.rev || (a.id < b.id ? -1 : 1),
  );
  for (const { id } of oldestFirst) {
    if (total <= CLOUD_BACKUP_LIMITS.maxTrashBytes) return;
    const name = cloudBackupShardOf(id);
    let shard = loaded.get(name);
    if (!shard) {
      const reference = base.trash?.[name];
      if (!reference) continue;
      shard = Object.assign(
        Object.create(null) as Shard,
        await readReferenced<Shard>(env, backupId, reference),
      );
      loaded.set(name, shard);
    }
    if (!Object.hasOwn(shard, id)) continue;
    total -= jsonByteLength(shard[id]);
    delete shard[id];
  }
}
