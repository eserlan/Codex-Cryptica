import {
  cloudBackupShardOf,
  type CloudBackupEntitySyncMeta,
  type CloudBackupTombstone,
} from "../../../../packages/schema/src/publishing";
import type { EntityRecord, Shard } from "./cloud-backup-entities";
import type { WholeMeta } from "./cloud-backup-whole-items";
import {
  type BackupObjects,
  type CloudBackupEnv,
  getStagedKey,
  readReferenced,
  writeJson,
} from "./cloud-backup-storage";
import { isTrashExpired } from "./cloud-backup-trash";

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
  whole?: WholeMeta,
) {
  return {
    entityHashes,
    entityMeta,
    ...(whole && Object.keys(whole.mapMeta).length > 0
      ? { mapMeta: whole.mapMeta }
      : {}),
    ...(whole && Object.keys(whole.canvasMeta).length > 0
      ? { canvasMeta: whole.canvasMeta }
      : {}),
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
  whole?: WholeMeta,
): Promise<string> {
  await writeJson(
    env,
    getStagedKey(backupId, tag, "index.json"),
    indexRecord(entityHashes, entityMeta, tombstones, whole),
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

function filterLiveTombstones(
  raw: Tombstones | undefined,
  liveIds: ReadonlySet<string>,
  now: number,
): { tombstones: Tombstones; droppedShards: Set<string> } {
  const tombstones: Tombstones = Object.create(null);
  const droppedShards = new Set<string>();
  for (const [id, tombstone] of Object.entries(raw ?? {})) {
    if (!liveIds.has(id) && !isTrashExpired(tombstone, now)) {
      tombstones[id] = tombstone;
    } else {
      droppedShards.add(cloudBackupShardOf(id));
    }
  }
  return { tombstones, droppedShards };
}

async function filterAndStageTrashShard(
  env: CloudBackupEnv,
  backupId: string,
  tag: string,
  name: string,
  reference: string,
  tombstones: Tombstones,
): Promise<string | null> {
  const shard = await readReferenced<Shard>(env, backupId, reference);
  const kept: Shard = Object.create(null);
  for (const [id, entity] of Object.entries(shard)) {
    if (Object.hasOwn(tombstones, id)) kept[id] = entity;
  }
  if (Object.keys(kept).length === 0) return null;
  await writeJson(env, getStagedKey(backupId, tag, `trash/${name}.json`), kept);
  return stagedName(tag, `trash/${name}.json`);
}

/**
 * The base's tombstones and trash content, minus the ids a full upload brings
 * back as live entities. Unchanged trash shards are carried by reference
 * without reading or rewriting them; modified shards are read, filtered, and
 * staged one at a time.
 */
export async function carryTombstones(
  env: CloudBackupEnv,
  backupId: string,
  tag: string,
  base: BackupObjects,
  liveIds: ReadonlySet<string>,
): Promise<{
  tombstones: Tombstones;
  stagedTrash: Record<string, string>;
  trash: Record<string, string>;
}> {
  const stagedTrash: Record<string, string> = {};
  const trash: Record<string, string> = {};
  if (!base.index || !base.trash) {
    return { tombstones: Object.create(null), stagedTrash, trash };
  }

  const index = await readReferenced<{ tombstones?: Tombstones }>(
    env,
    backupId,
    base.index,
  );
  const { tombstones, droppedShards } = filterLiveTombstones(
    index.tombstones,
    liveIds,
    Date.now(),
  );
  for (const [name, reference] of Object.entries(base.trash)) {
    if (!droppedShards.has(name)) {
      trash[name] = reference;
      continue;
    }
    const staged = await filterAndStageTrashShard(
      env,
      backupId,
      tag,
      name,
      reference,
      tombstones,
    );
    if (staged) {
      stagedTrash[name] = staged;
      trash[name] = staged;
    }
  }
  return { tombstones, stagedTrash, trash };
}
