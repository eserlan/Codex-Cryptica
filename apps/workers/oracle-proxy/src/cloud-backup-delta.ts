import {
  CLOUD_BACKUP_LIMITS,
  CLOUD_BACKUP_SCHEMA_V2,
  CloudBackupDeltaSchema,
  cloudBackupShardOf,
  hashCloudBackupEntity,
  type CloudBackupDelta,
  type CloudBackupManifest,
} from "../../../../packages/schema/src/publishing";
import type { EntityRecord, Shard } from "./cloud-backup-entities";
import {
  type CloudBackupEnv,
  getBundleKey,
  getShardKey,
  getIndexKey,
  getAssetKey,
  storedBytes,
  jsonByteLength,
  readJson,
  writeJson,
  writeManifest,
  pruneAssets,
} from "./cloud-backup-storage";
import { json, isValidAssetId, sizeLimitResponse } from "./cloud-backup-http";
import { readAuthorizedJsonBody } from "./cloud-backup-auth";
import { writeIndex, writeShards } from "./cloud-backup-shards";

function conflict(
  request: Request,
  code: "full_push_required" | "diverged",
  message: string,
  lastPushedAt: string,
): Response {
  return json(request, { error: { code, message, lastPushedAt } }, 409);
}

async function readTouchedShards(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
): Promise<Map<string, Shard>> {
  const touched = new Set<string>();
  for (const entity of delta.upserts)
    touched.add(cloudBackupShardOf(entity.id));
  for (const id of delta.deletes) touched.add(cloudBackupShardOf(id));

  const shards = new Map<string, Shard>();
  for (const name of touched) {
    const existing = await readJson<Shard>(env, getShardKey(backupId, name));
    shards.set(
      name,
      Object.assign(Object.create(null) as Shard, existing ?? {}),
    );
  }

  return shards;
}

/** Applies a delta's upserts and deletes to only the shards they touch. */
async function applyEntityDelta(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
): Promise<{ shards: Map<string, Shard>; hashes: Record<string, string> }> {
  const shards = await readTouchedShards(env, backupId, delta);

  const index = await readJson<{ entityHashes: Record<string, string> }>(
    env,
    getIndexKey(backupId),
  );
  const hashes = Object.assign(
    Object.create(null) as Record<string, string>,
    index?.entityHashes ?? {},
  );
  for (const id of delta.deletes) {
    delete shards.get(cloudBackupShardOf(id))![id];
    delete hashes[id];
  }
  for (const entity of delta.upserts as EntityRecord[]) {
    shards.get(cloudBackupShardOf(entity.id))![entity.id] = entity;
    hashes[entity.id] = await hashCloudBackupEntity(entity);
  }
  return { shards, hashes };
}

/** Bytes the changed shards add to the stored total, for the vault ceiling. */
async function shardGrowth(
  env: CloudBackupEnv,
  backupId: string,
  shards: Map<string, Shard>,
): Promise<number> {
  let growth = 0;
  for (const [name, shard] of shards) {
    const existing = await env.BUCKET.head(getShardKey(backupId, name));
    growth += jsonByteLength(shard) - (existing?.size ?? 0);
  }
  return growth;
}

async function indexGrowth(
  env: CloudBackupEnv,
  backupId: string,
  hashes: Record<string, string>,
): Promise<number> {
  const existing = await env.BUCKET.head(getIndexKey(backupId));
  return jsonByteLength({ entityHashes: hashes }) - (existing?.size ?? 0);
}

async function prepareBundleSections(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
): Promise<{
  bundle: Record<string, unknown> | null;
  growth: number;
}> {
  const sections = {
    ...(delta.maps ? { maps: delta.maps } : {}),
    ...(delta.canvases ? { canvases: delta.canvases } : {}),
    ...(delta.assetManifest ? { assetManifest: delta.assetManifest } : {}),
  };
  if (Object.keys(sections).length === 0) return { bundle: null, growth: 0 };

  const key = getBundleKey(backupId);
  const [bundle, existing] = await Promise.all([
    readJson<Record<string, unknown>>(env, key),
    env.BUCKET.head(key),
  ]);
  const nextBundle = { ...(bundle ?? {}), ...sections };
  return {
    bundle: nextBundle,
    growth: jsonByteLength(nextBundle) - (existing?.size ?? 0),
  };
}

async function writeBundleSections(
  env: CloudBackupEnv,
  backupId: string,
  bundle: Record<string, unknown> | null,
): Promise<void> {
  if (bundle) await writeJson(env, getBundleKey(backupId), bundle);
}

function validateDelta(
  request: Request,
  body: unknown,
  manifest: CloudBackupManifest,
): { delta: CloudBackupDelta } | { response: Response } {
  const parsed = CloudBackupDeltaSchema.safeParse(body);
  if (
    !parsed.success ||
    (parsed.data.assetIds ?? []).some((id) => !isValidAssetId(id))
  ) {
    return {
      response: json(request, { error: { message: "Invalid delta" } }, 400),
    };
  }
  const delta = parsed.data;

  if (manifest.schemaVersion !== CLOUD_BACKUP_SCHEMA_V2) {
    return {
      response: conflict(
        request,
        "full_push_required",
        "This backup needs one full upload before it can accept changes.",
        manifest.lastPushedAt,
      ),
    };
  }
  if (delta.baseLastPushedAt !== manifest.lastPushedAt) {
    return {
      response: conflict(
        request,
        "diverged",
        "The cloud backup changed since this upload was prepared.",
        manifest.lastPushedAt,
      ),
    };
  }

  return { delta };
}

interface PreparedDelta {
  shards: Map<string, Shard>;
  hashes: Record<string, string>;
  bundle: Record<string, unknown> | null;
  projectedBytes: number;
}

async function prepareDelta(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
): Promise<PreparedDelta> {
  const { shards, hashes } = await applyEntityDelta(env, backupId, delta);
  const bundleUpdate = await prepareBundleSections(env, backupId, delta);
  const projected =
    (await storedBytes(env, backupId)) +
    (await shardGrowth(env, backupId, shards)) +
    (await indexGrowth(env, backupId, hashes)) +
    bundleUpdate.growth;
  return {
    shards,
    hashes,
    bundle: bundleUpdate.bundle,
    projectedBytes: projected,
  };
}

async function commitDelta(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
  auth: { manifest: CloudBackupManifest; ownerCodeHash: string },
  prepared: PreparedDelta,
): Promise<CloudBackupManifest> {
  const { shards, hashes } = prepared;
  await writeShards(env, backupId, shards, false);
  await writeIndex(env, backupId, hashes);
  await writeBundleSections(env, backupId, prepared.bundle);

  const committed: CloudBackupManifest = {
    ...auth.manifest,
    vaultTitle: delta.vaultTitle,
    entityCount: Object.keys(hashes).length,
    sizeBytes: await storedBytes(env, backupId),
    lastPushedAt: new Date().toISOString(),
  };
  await writeManifest(env, backupId, committed, auth.ownerCodeHash);

  if (delta.assetIds) {
    await pruneAssets(
      env,
      backupId,
      new Set(delta.assetIds.map((id) => getAssetKey(backupId, id))),
    );
  }

  return committed;
}

/**
 * POST /api/cloud-backup/{backupId}/delta (#3354) — publishes only what changed.
 *
 * Refuses (409) unless the backup is already v2 and the client computed the
 * delta against the current remote (`baseLastPushedAt`), so a delta can never
 * land on a copy it does not describe. Same write order as a full commit:
 * shards and index, then `bundle.json` if its sections changed, then the
 * manifest, then prune.
 */
export async function handleCloudBackupDelta(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  const read = await readAuthorizedJsonBody(request, env, backupId);
  if ("response" in read) return read.response;
  const { auth, body } = read;
  const parsed = validateDelta(request, body, auth.manifest);
  if ("response" in parsed) return parsed.response;
  const { delta } = parsed;

  const prepared = await prepareDelta(env, backupId, delta);
  const oversized = sizeLimitResponse(
    request,
    prepared.projectedBytes,
    CLOUD_BACKUP_LIMITS.maxVaultBytes,
    "This vault is too large to back up.",
  );
  if (oversized) return oversized;

  const committed = await commitDelta(env, backupId, delta, auth, prepared);
  return json(request, { manifest: committed });
}
