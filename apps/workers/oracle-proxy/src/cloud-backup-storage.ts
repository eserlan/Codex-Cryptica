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
 * v2 (#3354): `{ entityHashes: { [entityId]: sha256 } }`. Kept out of the
 * manifest on purpose — every authorised request reads the manifest, and a
 * per-entity hash map would make each of them pay for the whole vault's index.
 */
export function getIndexKey(backupId: string): string {
  return `${PREFIX}${backupId}/index.json`;
}

export function getAssetKey(backupId: string, assetId: string): string {
  return `${PREFIX}${backupId}/assets/${assetId}`;
}

export function getBackupPrefix(backupId: string): string {
  return `${PREFIX}${backupId}/`;
}

export async function readManifest(
  env: CloudBackupEnv,
  backupId: string,
): Promise<{ manifest: CloudBackupManifest; ownerCodeHash?: string } | null> {
  const object = await env.BUCKET?.get(getManifestKey(backupId));
  if (!object) return null;
  try {
    const text =
      typeof object.text === "function"
        ? await object.text()
        : new TextDecoder().decode(object.body);
    const parsed = CloudBackupManifestSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return null;
    return {
      manifest: parsed.data,
      ownerCodeHash: object.customMetadata?.ownerCodeHash,
    };
  } catch {
    return null;
  }
}

/** Bytes already stored for a backup, so the vault ceiling can be enforced. */
export async function storedBytes(
  env: CloudBackupEnv,
  backupId: string,
): Promise<number> {
  let total = 0;
  const prefix = getBackupPrefix(backupId);
  let listed = await env.BUCKET.list({ prefix });
  for (;;) {
    for (const object of listed.objects) total += object.size ?? 0;
    if (!listed.truncated) break;
    listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
  }
  return total;
}

export async function readJson<T>(
  env: CloudBackupEnv,
  key: string,
): Promise<T | null> {
  const object = await env.BUCKET.get(key);
  if (!object) return null;
  const text =
    typeof object.text === "function"
      ? await object.text()
      : new TextDecoder().decode(object.body);
  return JSON.parse(text) as T;
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

export async function writeManifest(
  env: CloudBackupEnv,
  backupId: string,
  manifest: CloudBackupManifest,
  ownerCodeHash: string,
): Promise<void> {
  await env.BUCKET.put(getManifestKey(backupId), JSON.stringify(manifest), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { ownerCodeHash, vaultTitle: manifest.vaultTitle },
  });
}

export async function listKeys(
  env: CloudBackupEnv,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  let listed = await env.BUCKET.list({ prefix });
  for (;;) {
    for (const object of listed.objects) keys.push(object.key);
    if (!listed.truncated) break;
    listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
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
  let listed = await env.BUCKET.list({ prefix });
  while (listed.objects.length > 0) {
    for (const object of listed.objects) {
      if (!keep.has(object.key)) await env.BUCKET.delete(object.key);
    }
    if (!listed.truncated) break;
    listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
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
  const prefix = getBackupPrefix(backupId);
  let listed = await env.BUCKET.list({ prefix });
  while (listed.objects.length > 0) {
    for (const object of listed.objects) await env.BUCKET.delete(object.key);
    if (!listed.truncated) break;
    listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
  }
}
