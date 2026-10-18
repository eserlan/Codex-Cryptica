import {
  cloudBackupShardOf,
  hashCloudBackupEntity,
} from "../../../../packages/schema/src/publishing";

export type EntityRecord = { id: string } & Record<string, unknown>;
export type Shard = Record<string, EntityRecord>;

/** The bundle's entity list when it is shardable; otherwise stored as v1. */
export function bundleEntities(bundle: unknown): EntityRecord[] | null {
  const entities = (bundle as { entities?: unknown } | null)?.entities;
  if (!Array.isArray(entities)) return null;
  return entities.every(
    (entity) =>
      !!entity &&
      typeof entity === "object" &&
      typeof (entity as { id?: unknown }).id === "string",
  )
    ? (entities as EntityRecord[])
    : null;
}

/** Groups records by the stable shard mapping shared with the client schema. */
export function groupByShard(entities: EntityRecord[]): Map<string, Shard> {
  const shards = new Map<string, Shard>();
  for (const entity of entities) {
    const name = cloudBackupShardOf(entity.id);
    const shard = shards.get(name) ?? Object.create(null);
    shard[entity.id] = entity;
    shards.set(name, shard);
  }
  return shards;
}

/** Builds the entity hash index using the schema's canonical hashing. */
export async function hashEntities(
  entities: EntityRecord[],
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = Object.create(null);
  for (const entity of entities) {
    hashes[entity.id] = await hashCloudBackupEntity(entity);
  }
  return hashes;
}
