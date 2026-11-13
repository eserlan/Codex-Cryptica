import { z } from "zod";
import {
  CloudBackupManifestSchema,
  type CloudBackupManifest,
} from "../../../../packages/schema/src/publishing";

export interface CloudBackupEnv {
  BUCKET?: any;
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
  CLOUD_BACKUP_ADMIN_TOKEN?: string;
}

export const PREFIX = "cloud-backup/";

/** A key relative to the backup prefix: a legacy key or one staged by a commit. */
const OBJECT_KEY = z
  .string()
  .regex(
    /^(?:(?:commits\/[A-Za-z0-9-]+\/)?(?:bundle\.json|index\.json|entities\/[A-Za-z0-9_-]+\.json)|commits\/[A-Za-z0-9-]+\/trash\/[A-Za-z0-9_-]+\.json)$/,
  );

/**
 * Worker-only manifest field: which stored objects are current. Never part of
 * the shared schema and never returned in a response.
 */
const BackupObjectsSchema = z.object({
  bundle: OBJECT_KEY.optional(),
  index: OBJECT_KEY.optional(),
  shards: z.record(z.string(), OBJECT_KEY).optional(),
  /** Last content of removed entities, one object per shard; never counted in sizeBytes. */
  trash: z.record(z.string(), OBJECT_KEY).optional(),
});
export type BackupObjects = z.infer<typeof BackupObjectsSchema>;

/**
 * Worker-only manifest field: the editor link. Holds only the token's hash, and
 * is never returned in a response.
 */
const SharingRecordSchema = z.object({
  editorTokenHash: z.string(),
  linkVersion: z.number().int().min(1),
  enabledAt: z.string(),
});
export type SharingRecord = z.infer<typeof SharingRecordSchema>;

const StoredManifestSchema = CloudBackupManifestSchema.extend({
  objects: BackupObjectsSchema.optional(),
  sharing: SharingRecordSchema.optional(),
});

/** Thrown when an object the manifest references is not in storage. */
export class MissingBackupObjectError extends Error {}

export function jsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export function getManifestKey(backupId: string): string {
  return `${PREFIX}${backupId}/manifest.json`;
}

export function getBundleKey(backupId: string): string {
  return `${PREFIX}${backupId}/bundle.json`;
}

/** v2 (#3354): one shard of entities, `{ [entityId]: entity }`. */
export function getShardKey(backupId: string, shard: string): string {
  return `${PREFIX}${backupId}/entities/${shard}.json`;
}

/**
 * v2 (#3354): `{ entityHashes: { [entityId]: sha256 }, entityMeta?: {
 * [entityId]: { rev, editedBy, editedAt } } }`. Kept out of the
 * manifest on purpose — every authorised request reads the manifest, and a
 * per-entity hash map would make each of them pay for the whole vault's index.
 */
export function getIndexKey(backupId: string): string {
  return `${PREFIX}${backupId}/index.json`;
}

/** Seen editor devices; kept out of the manifest so bookkeeping never moves its etag. */
export function getSharingDevicesKey(backupId: string): string {
  return `${PREFIX}${backupId}/sharing-devices.json`;
}

export function getAssetKey(backupId: string, assetId: string): string {
  return `${PREFIX}${backupId}/assets/${assetId}`;
}

/** Where one commit stages `bundle.json`, `index.json` or `entities/<shard>.json`. */
export function getStagedKey(
  backupId: string,
  tag: string,
  name: string,
): string {
  return `${PREFIX}${backupId}/commits/${tag}/${name}`;
}

/** A key relative to the backup prefix, as stored in `objects`. */
export function absoluteKey(backupId: string, relative: string): string {
  return `${PREFIX}${backupId}/${relative}`;
}

export function getBackupPrefix(backupId: string): string {
  return `${PREFIX}${backupId}/`;
}

export async function readManifest(
  env: CloudBackupEnv,
  backupId: string,
): Promise<{
  manifest: CloudBackupManifest;
  ownerCodeHash?: string;
  etag?: string;
  objects?: BackupObjects;
  sharing?: SharingRecord;
} | null> {
  const object = await env.BUCKET?.get(getManifestKey(backupId));
  if (!object) return null;
  try {
    const text = await objectText(object);
    const parsed = StoredManifestSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return null;
    const { objects, sharing, ...manifest } = parsed.data;
    return {
      manifest,
      ownerCodeHash: object.customMetadata?.ownerCodeHash,
      etag: object.etag,
      objects,
      sharing,
    };
  } catch {
    return null;
  }
}

const LEGACY_KEY = /^(?:bundle\.json|index\.json|entities\/[^/]+\.json)$/;

/**
 * The objects a manifest without `objects` stands for: today's fixed keys and
 * the shards found by listing `entities/`.
 */
export async function legacyObjects(
  env: CloudBackupEnv,
  backupId: string,
): Promise<BackupObjects> {
  const prefix = getBackupPrefix(backupId);
  const objects: BackupObjects = {};
  const shards: Record<string, string> = {};
  for (const key of await listKeys(env, prefix)) {
    const relative = key.slice(prefix.length);
    if (relative === "bundle.json") objects.bundle = relative;
    else if (relative === "index.json") objects.index = relative;
    else if (/^entities\/[^/]+\.json$/.test(relative)) {
      shards[relative.slice("entities/".length, -".json".length)] = relative;
    }
  }
  return { ...objects, shards };
}

/** The current objects: the manifest's own, or the legacy set when it has none. */
export async function resolveObjects(
  env: CloudBackupEnv,
  backupId: string,
  objects: BackupObjects | undefined,
): Promise<BackupObjects> {
  return objects ?? legacyObjects(env, backupId);
}

export function referencedKeys(objects: BackupObjects): Set<string> {
  return new Set(
    [
      objects.bundle,
      objects.index,
      ...Object.values(objects.shards ?? {}),
      ...Object.values(objects.trash ?? {}),
    ].filter((key): key is string => key !== undefined),
  );
}

/** Reads a referenced object; a reference with no object behind it is an error. */
export async function readReferenced<T>(
  env: CloudBackupEnv,
  backupId: string,
  relative: string,
): Promise<T> {
  const value = await readJson<T>(env, absoluteKey(backupId, relative));
  if (value === null) throw new MissingBackupObjectError(relative);
  return value;
}

/**
 * Bytes a backup holds that a reader can reach: the referenced objects plus
 * every asset. Trash, staged orphans and the grace generation do not count.
 */
export async function reachableBytes(
  env: CloudBackupEnv,
  backupId: string,
  objects: BackupObjects,
): Promise<number> {
  // Trash is kept for restore, not billed: a delete must never grow the size.
  const keep = referencedKeys({ ...objects, trash: undefined });
  let total = 0;
  const prefix = getBackupPrefix(backupId);
  for await (const listed of listObjectPages(env, prefix)) {
    for (const object of listed) {
      const relative = object.key.slice(prefix.length);
      if (relative.startsWith("assets/") || keep.has(relative)) {
        total += object.size ?? 0;
      }
    }
  }
  return total;
}

export async function readJson<T>(
  env: CloudBackupEnv,
  key: string,
): Promise<T | null> {
  const object = await env.BUCKET.get(key);
  if (!object) return null;
  const text = await objectText(object);
  return JSON.parse(text) as T;
}

async function objectText(object: {
  text?: () => Promise<string>;
  body: AllowSharedBufferSource;
}): Promise<string> {
  return typeof object.text === "function"
    ? object.text()
    : new TextDecoder().decode(object.body);
}

export async function writeJson(
  env: CloudBackupEnv,
  key: string,
  value: unknown,
): Promise<void> {
  await env.BUCKET.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
  });
}

/**
 * Writes the manifest only if it is still the one that was read (`etag`), or
 * only if none exists yet. Returns false when another writer got there first.
 */
export async function writeManifest(
  env: CloudBackupEnv,
  backupId: string,
  manifest: CloudBackupManifest,
  ownerCodeHash: string,
  objects: BackupObjects | undefined,
  etag?: string,
  sharing?: SharingRecord,
): Promise<boolean> {
  const written = await env.BUCKET.put(
    getManifestKey(backupId),
    JSON.stringify({
      ...manifest,
      ...(objects ? { objects } : {}),
      ...(sharing ? { sharing } : {}),
    }),
    {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { ownerCodeHash, vaultTitle: manifest.vaultTitle },
      onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: "*" },
    },
  );
  return written !== null;
}

export async function listKeys(
  env: CloudBackupEnv,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  for await (const objects of listObjectPages(env, prefix)) {
    for (const object of objects) keys.push(object.key);
  }
  return keys;
}

/** Removes assets under the backup that the new snapshot does not include. */
export async function pruneAssets(
  env: CloudBackupEnv,
  backupId: string,
  keep: Set<string>,
): Promise<void> {
  const prefix = `${getBackupPrefix(backupId)}assets/`;
  await deleteListedObjects(env, prefix, keep);
}

/** Best-effort removal of the objects a losing commit staged. */
export async function discardStaged(
  env: CloudBackupEnv,
  backupId: string,
  staged: BackupObjects,
): Promise<void> {
  for (const relative of referencedKeys(staged)) {
    try {
      await env.BUCKET.delete(absoluteKey(backupId, relative));
    } catch {
      // Leftovers are unreachable and never counted.
    }
  }
}

/**
 * After a winning switch to revision `revision`: deletes superseded objects that
 * neither the new manifest nor its base references. Staged objects of a later
 * revision are left alone, since an in-flight commit could still win with them.
 */
export async function cleanupSuperseded(
  env: CloudBackupEnv,
  backupId: string,
  revision: number,
  current: BackupObjects,
  base: BackupObjects,
): Promise<void> {
  try {
    const kept = new Set([...referencedKeys(current), ...referencedKeys(base)]);
    const prefix = getBackupPrefix(backupId);
    for (const key of await listKeys(env, prefix)) {
      const relative = key.slice(prefix.length);
      if (kept.has(relative)) continue;
      const staged = /^commits\/(\d+)-[^/]+\//.exec(relative);
      const superseded = staged
        ? Number(staged[1]) <= revision
        : LEGACY_KEY.test(relative);
      if (superseded) await env.BUCKET.delete(key);
    }
  } catch {
    // Best effort: the commit has already won.
  }
}

/**
 * Erases every object under a backup's prefix: manifest, bundle and assets.
 *
 * Shared by the owner and admin delete routes on purpose. Two copies of this
 * loop is how one of them ends up leaving orphaned assets behind after the
 * manifest is gone — unreachable, unbilled to anyone, and invisible.
 */
export async function eraseBackupObjects(
  env: CloudBackupEnv,
  backupId: string,
): Promise<void> {
  await deleteListedObjects(env, getBackupPrefix(backupId), new Set());
}

async function deleteListedObjects(
  env: CloudBackupEnv,
  prefix: string,
  keep: ReadonlySet<string>,
): Promise<void> {
  for await (const objects of listObjectPages(env, prefix, true)) {
    for (const object of objects) {
      if (!keep.has(object.key)) await env.BUCKET.delete(object.key);
    }
  }
}

async function* listObjectPages(
  env: CloudBackupEnv,
  prefix: string,
  stopWhenEmpty = false,
): AsyncGenerator<Array<{ key: string; size?: number }>> {
  let listed = await env.BUCKET.list({ prefix });
  for (;;) {
    // Destructive listings historically stop at an empty page; read listings
    // continue through it. Keep both behaviours while sharing cursor handling.
    if (stopWhenEmpty && listed.objects.length === 0) break;
    yield listed.objects;
    if (!listed.truncated) break;
    listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
  }
}
