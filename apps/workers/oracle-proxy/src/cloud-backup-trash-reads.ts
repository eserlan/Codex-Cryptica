import {
  CLOUD_BACKUP_LIMITS,
  CLOUD_BACKUP_SCHEMA_V2,
  cloudBackupRevisionOf,
  cloudBackupShardOf,
  type CloudBackupTombstone,
} from "../../../../packages/schema/src/publishing";
import type { EntityRecord, Shard } from "./cloud-backup-entities";
import {
  type BackupObjects,
  type CloudBackupEnv,
  MissingBackupObjectError,
  absoluteKey,
  readReferenced,
  resolveObjects,
} from "./cloud-backup-storage";
import { json, notFoundOrUnauthorized } from "./cloud-backup-http";
import { authorizeStoredBackup } from "./cloud-backup-auth";
import { incomplete } from "./cloud-backup-reads";
import type { Tombstones } from "./cloud-backup-shards";
import { isTrashExpired } from "./cloud-backup-trash";

/** The tombstones inside the retention window, newest delete first. */
async function readLiveTombstones(
  env: CloudBackupEnv,
  backupId: string,
  objects: BackupObjects,
): Promise<CloudBackupTombstone[]> {
  if (!objects.index) return [];
  const index = await readReferenced<{ tombstones?: Tombstones }>(
    env,
    backupId,
    objects.index,
  );
  const now = Date.now();
  return Object.values(index.tombstones ?? {})
    .filter((tombstone) => !isTrashExpired(tombstone, now))
    .sort(
      (a, b) =>
        Date.parse(b.deletedAt) - Date.parse(a.deletedAt) ||
        (a.id < b.id ? -1 : 1),
    );
}

/** Reads each trash shard the ids live in, once. A missing reference holds nothing. */
async function readTrashShards(
  env: CloudBackupEnv,
  backupId: string,
  objects: BackupObjects,
  ids: string[],
): Promise<Map<string, Shard | null>> {
  const shards = new Map<string, Shard | null>();
  for (const id of ids) {
    const name = cloudBackupShardOf(id);
    if (shards.has(name)) continue;
    const reference = objects.trash?.[name];
    shards.set(
      name,
      reference ? await readReferenced<Shard>(env, backupId, reference) : null,
    );
  }
  return shards;
}

const holds = (shard: Shard | null | undefined, id: string) =>
  !!shard && Object.hasOwn(shard, id);

/** Authorises and resolves objects; a backup without a v2 index has no trash. */
async function authorizeTrashRead(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
) {
  const auth = await authorizeStoredBackup(request, env, backupId);
  if ("response" in auth) return auth;
  const objects =
    auth.manifest.schemaVersion === CLOUD_BACKUP_SCHEMA_V2
      ? await resolveObjects(env, backupId, auth.objects)
      : {};
  return { auth, objects };
}

/**
 * GET /api/cloud-backup/{backupId}/trash — the removed entities still inside
 * the retention window, with whether their content is still kept.
 */
export async function handleListTrash(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  const read = await authorizeTrashRead(request, env, backupId);
  if ("response" in read) return read.response;
  const { auth, objects } = read;
  try {
    const tombstones = await readLiveTombstones(env, backupId, objects);
    const shards = await readTrashShards(
      env,
      backupId,
      objects,
      tombstones.map((tombstone) => tombstone.id),
    );
    let usedBytes = 0;
    for (const reference of Object.values(objects.trash ?? {})) {
      const head = await env.BUCKET.head(absoluteKey(backupId, reference));
      usedBytes += head?.size ?? 0;
    }
    return json(request, {
      revision: cloudBackupRevisionOf(auth.manifest),
      items: tombstones.map(({ id, title, deletedBy, deletedAt, kind }) => ({
        id,
        title,
        kind: kind ?? "entity",
        deletedBy,
        deletedAt,
        restorable: holds(shards.get(cloudBackupShardOf(id)), id),
      })),
      usedBytes,
      maxBytes: CLOUD_BACKUP_LIMITS.maxTrashBytes,
    });
  } catch (error) {
    if (error instanceof MissingBackupObjectError) return incomplete(request);
    throw error;
  }
}

function notRestorable(request: Request): Response {
  return json(
    request,
    {
      error: {
        code: "not_restorable",
        message: "This item can no longer be restored.",
      },
    },
    410,
  );
}

function decodeEntityId(raw: string): string | null {
  try {
    const id = decodeURIComponent(raw);
    return id && id.length <= 255 ? id : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/cloud-backup/{backupId}/trash/{entityId} — one removed entity's kept
 * content, or 410 when it is gone, restored, expired or evicted.
 */
export async function handleGetTrashItem(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  rawId: string,
): Promise<Response> {
  const read = await authorizeTrashRead(request, env, backupId);
  if ("response" in read) return read.response;
  const id = decodeEntityId(rawId);
  if (!id) return notFoundOrUnauthorized(request);
  try {
    const tombstone = (
      await readLiveTombstones(env, backupId, read.objects)
    ).find((candidate) => candidate.id === id);
    if (!tombstone) return notRestorable(request);
    const shards = await readTrashShards(env, backupId, read.objects, [id]);
    const shard = shards.get(cloudBackupShardOf(id));
    if (!shard || !holds(shard, id)) return notRestorable(request);
    const kept = shard[id] as EntityRecord;
    if (tombstone.kind) {
      const { item, assets } = kept as { item?: unknown; assets?: unknown };
      return json(request, {
        tombstone,
        entity: item,
        ...(assets ? { assets } : {}),
      });
    }
    return json(request, { tombstone, entity: kept });
  } catch (error) {
    if (error instanceof MissingBackupObjectError) return incomplete(request);
    throw error;
  }
}
