import type { CloudBackupEntitySyncMeta } from "../../../../packages/schema/src/publishing";
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

export async function stageIndex(
  env: CloudBackupEnv,
  backupId: string,
  tag: string,
  entityHashes: Record<string, string>,
  entityMeta: Record<string, CloudBackupEntitySyncMeta>,
): Promise<string> {
  await writeJson(env, getStagedKey(backupId, tag, "index.json"), {
    entityHashes,
    entityMeta,
  });
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
): Promise<Record<string, string>> {
  const staged: Record<string, string> = {};
  for (const [name, shard] of shards) {
    if (Object.keys(shard).length === 0) continue;
    await writeJson(
      env,
      getStagedKey(backupId, tag, `entities/${name}.json`),
      shard,
    );
    staged[name] = stagedName(tag, `entities/${name}.json`);
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
