import {
  CLOUD_BACKUP_LIMITS,
  cloudBackupShardOf,
  type CloudBackupTombstone,
  type CloudBackupTrashEviction,
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

export interface UnloadedShardMeta {
  totalBytes: number;
  sizes: Map<string, number>;
}

export interface TrashDropPlan {
  droppedByShard: Map<string, Set<string>>;
  emptiedShards: Set<string>;
  droppedIds: Set<string>;
  unloadedMeta: Map<string, UnloadedShardMeta>;
}

export function createTrashDropPlan(): TrashDropPlan {
  return {
    droppedByShard: new Map(),
    emptiedShards: new Set(),
    droppedIds: new Set(),
    unloadedMeta: new Map(),
  };
}

function inspectUnloadedShard(
  shard: Shard,
  excludedIds?: ReadonlySet<string>,
): UnloadedShardMeta {
  const sizes = new Map<string, number>();
  let totalBytes = 0;
  for (const [id, value] of Object.entries(shard)) {
    if (excludedIds?.has(id)) continue;
    const entryBytes = jsonByteLength(id) + jsonByteLength(value) + 2;
    sizes.set(id, entryBytes);
    totalBytes += entryBytes;
  }
  if (sizes.size > 0) totalBytes += 1;
  return { totalBytes, sizes };
}

async function trashBytes(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  loaded: Map<string, Shard>,
  plan: TrashDropPlan,
): Promise<number> {
  let total = 0;
  const names = new Set([...Object.keys(base.trash ?? {}), ...loaded.keys()]);
  for (const name of names) {
    const shard = loaded.get(name);
    if (shard) {
      total += Object.keys(shard).length === 0 ? 0 : jsonByteLength(shard);
      continue;
    }
    if (plan.emptiedShards.has(name)) continue;
    const meta = plan.unloadedMeta.get(name);
    if (meta) {
      total += meta.totalBytes;
      continue;
    }
    const reference = base.trash?.[name];
    if (reference) {
      total +=
        (await env.BUCKET.head(absoluteKey(backupId, reference)))?.size ?? 0;
    }
  }
  return total;
}

/**
 * Keeps trash within `maxTrashBytes` by dropping the content of the oldest
 * tombstones (lowest `rev`) first. The tombstone records stay, since the change
 * feed needs them. `loaded` holds the trash shards already in memory; unloaded
 * shards are inspected one at a time via `plan` without accumulating in `loaded`.
 */
export async function evictOldestTrash(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  loaded: Map<string, Shard>,
  tombstones: Tombstones,
  plan: TrashDropPlan = createTrashDropPlan(),
): Promise<CloudBackupTrashEviction | undefined> {
  let total = await trashBytes(env, backupId, base, loaded, plan);
  if (total <= CLOUD_BACKUP_LIMITS.maxTrashBytes) return undefined;

  const oldestFirst = Object.values(tombstones).sort(
    (a, b) => a.rev - b.rev || (a.id < b.id ? -1 : 1),
  );
  let evictedCount = 0;
  for (const { id } of oldestFirst) {
    if (total <= CLOUD_BACKUP_LIMITS.maxTrashBytes) break;
    const name = cloudBackupShardOf(id);
    const shard = loaded.get(name);
    if (shard) {
      if (!Object.hasOwn(shard, id)) continue;
      const entryBytes = jsonByteLength(id) + jsonByteLength(shard[id]) + 2;
      const isLast = Object.keys(shard).length === 1;
      total -= entryBytes + (isLast ? 1 : 0);
      delete shard[id];
      evictedCount++;
      continue;
    }
    if (plan.emptiedShards.has(name)) continue;
    let meta = plan.unloadedMeta.get(name);
    if (!meta) {
      const reference = base.trash?.[name];
      if (!reference) continue;
      const unloaded = Object.assign(
        Object.create(null) as Shard,
        await readReferenced<Shard>(env, backupId, reference),
      );
      meta = inspectUnloadedShard(unloaded, plan.droppedByShard.get(name));
      plan.unloadedMeta.set(name, meta);
    }
    const entryBytes = meta.sizes.get(id);
    if (entryBytes === undefined) continue;
    const isLast = meta.sizes.size === 1;
    const removedBytes = entryBytes + (isLast ? 1 : 0);
    meta.sizes.delete(id);
    meta.totalBytes -= removedBytes;
    total -= removedBytes;
    const dropped = plan.droppedByShard.get(name) ?? new Set<string>();
    dropped.add(id);
    plan.droppedByShard.set(name, dropped);
    plan.droppedIds.add(id);
    if (meta.sizes.size === 0) plan.emptiedShards.add(name);
    evictedCount++;
  }
  return evictedCount > 0
    ? {
        evictedCount,
        usedBytes: total,
        maxBytes: CLOUD_BACKUP_LIMITS.maxTrashBytes,
      }
    : undefined;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a tombstone is past the retention window: strictly more than
 * `trashRetentionDays` old. One whose time cannot be parsed never expires.
 */
export function isTrashExpired(
  tombstone: CloudBackupTombstone,
  now: number,
): boolean {
  const deletedAt = Date.parse(tombstone.deletedAt);
  return (
    Number.isFinite(deletedAt) &&
    now - deletedAt > CLOUD_BACKUP_LIMITS.trashRetentionDays * DAY_MS
  );
}

/**
 * Removes every expired tombstone and its kept content. `loaded` holds the trash
 * shards already in memory; unloaded shards are inspected one at a time via
 * `plan` without accumulating in `loaded`. Returns the highest `rev` removed,
 * or 0 when nothing was.
 */
export async function purgeExpiredTrash(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  loaded: Map<string, Shard>,
  tombstones: Tombstones,
  plan: TrashDropPlan = createTrashDropPlan(),
): Promise<number> {
  const now = Date.now();
  let highest = 0;
  const expiredUnloaded = new Map<string, string[]>();
  for (const tombstone of Object.values(tombstones)) {
    if (!isTrashExpired(tombstone, now)) continue;
    const { id } = tombstone;
    const name = cloudBackupShardOf(id);
    const shard = loaded.get(name);
    if (shard) {
      delete shard[id];
    } else if (base.trash?.[name]) {
      const list = expiredUnloaded.get(name) ?? [];
      list.push(id);
      expiredUnloaded.set(name, list);
    }
    delete tombstones[id];
    highest = Math.max(highest, tombstone.rev);
  }
  for (const [name, expiredIds] of expiredUnloaded) {
    const reference = base.trash?.[name];
    if (!reference) continue;
    const shard = Object.assign(
      Object.create(null) as Shard,
      await readReferenced<Shard>(env, backupId, reference),
    );
    const dropped = plan.droppedByShard.get(name) ?? new Set<string>();
    let anyRemoved = false;
    for (const id of expiredIds) {
      if (Object.hasOwn(shard, id)) {
        dropped.add(id);
        plan.droppedIds.add(id);
        anyRemoved = true;
      }
    }
    if (anyRemoved) {
      plan.droppedByShard.set(name, dropped);
      const meta = inspectUnloadedShard(shard, dropped);
      plan.unloadedMeta.set(name, meta);
      if (meta.sizes.size === 0) plan.emptiedShards.add(name);
    }
  }
  return highest;
}
