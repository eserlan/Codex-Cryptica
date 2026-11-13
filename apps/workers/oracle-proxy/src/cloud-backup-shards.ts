import type {
  CloudBackupEntitySyncMeta,
  CloudBackupTombstone,
} from "../../../../packages/schema/src/publishing";
import type { EntityRecord, Shard } from "./cloud-backup-entities";
import {
  type BackupObjects,
  type CloudBackupEnv,
  getStagedKey,
  readReferenced,
  writeJson,
} from "./cloud-backup-storage";

/** The relative key a commit stages an object at, as stored in `objects`. */
export function stagedName(tag: string, name: string): string {
  return `commits/${tag}/${name}`;
}

export type Tombstones = Record<string, CloudBackupTombstone>;

/** The index object; `tombstones` is written only when there are any. */
export function indexRecord(
  entityHashes: Record<string, string>,
  entityMeta: Record<string, CloudBackupEntitySyncMeta>,
  tombstones: Tombstones,
) {
  return {
    entityHashes,
    entityMeta,
    ...(Object.keys(tombstones).length > 0 ? { tombstones } : {}),
  };
}

export async function stageIndex(
  env: CloudBackupEnv,
  backupId: string,
  tag: string,
  entityHashes: Record<string, string>,
  entityMeta: Record<string, CloudBackupEntitySyncMeta>,
  tombstones: Tombstones = {},
): Promise<string> {
  await writeJson(
    env,
    getStagedKey(backupId, tag, "index.json"),
    indexRecord(entityHashes, entityMeta, tombstones),
  );
  return stagedName(tag, "index.json");
}

/**
 * Stages the non-empty shards under the commit's tag and returns their
 * references; an empty shard is left out, so the new manifest drops it.
 */
export async function stageShards(
  env: CloudBackupEnv,
  backupId: string,
  tag: string,
  shards: Map<string, Shard>,
  directory: "entities" | "trash" = "entities",
): Promise<Record<string, string>> {
  const staged: Record<string, string> = {};
  for (const [name, shard] of shards) {
    if (Object.keys(shard).length === 0) continue;
    await writeJson(
      env,
      getStagedKey(backupId, tag, `${directory}/${name}.json`),
      shard,
    );
    staged[name] = stagedName(tag, `${directory}/${name}.json`);
  }
  return staged;
}

/** Every entity of a v2 backup, assembled from the shards `objects` references. */
export async function readAllEntities(
  env: CloudBackupEnv,
  backupId: string,
  objects: BackupObjects,
): Promise<EntityRecord[]> {
  const entities: EntityRecord[] = [];
  const shards = objects.shards ?? {};
  for (const name of Object.keys(shards).sort()) {
    const shard = await readReferenced<Shard>(env, backupId, shards[name]);
    entities.push(...Object.values(shard));
  }
  return entities;
}

/**
 * The base's tombstones and trash content, minus the ids a full upload brings
 * back as live entities. Trash is read only when the base has any.
 */
export async function carryTombstones(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  liveIds: ReadonlySet<string>,
): Promise<{ tombstones: Tombstones; trash: Map<string, Shard> }> {
  const tombstones: Tombstones = {};
  const trash = new Map<string, Shard>();
  if (!base.index || !base.trash) return { tombstones, trash };

  const index = await readReferenced<{ tombstones?: Tombstones }>(
    env,
    backupId,
    base.index,
  );
  for (const [id, tombstone] of Object.entries(index.tombstones ?? {})) {
    if (!liveIds.has(id)) tombstones[id] = tombstone;
  }
  for (const [name, reference] of Object.entries(base.trash)) {
    const shard = await readReferenced<Shard>(env, backupId, reference);
    for (const [id, entity] of Object.entries(shard)) {
      if (!(id in tombstones)) continue;
      const kept = trash.get(name) ?? Object.create(null);
      kept[id] = entity;
      trash.set(name, kept);
    }
  }
  return { tombstones, trash };
}
