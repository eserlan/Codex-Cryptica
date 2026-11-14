import {
  CLOUD_BACKUP_LIMITS,
  CLOUD_BACKUP_SCHEMA_V2,
  CLOUD_BACKUP_OWNER_EDITOR,
  CloudBackupDeltaSchema,
  cloudBackupRevisionOf,
  cloudBackupShardOf,
  hashCloudBackupEntity,
  type CloudBackupDelta,
  type CloudBackupEntitySyncMeta,
  type CloudBackupManifest,
  type CloudBackupTombstone,
} from "../../../../packages/schema/src/publishing";
import type { EntityRecord, Shard } from "./cloud-backup-entities";
import {
  type BackupObjects,
  type CloudBackupEnv,
  absoluteKey,
  cleanupSuperseded,
  discardStaged,
  getAssetKey,
  getStagedKey,
  jsonByteLength,
  readJson,
  readManifest,
  readReferenced,
  reachableBytes,
  resolveObjects,
  writeJson,
  writeManifest,
  pruneAssets,
  type SharingRecord,
} from "./cloud-backup-storage";
import { json, isValidAssetId, sizeLimitResponse } from "./cloud-backup-http";
import { evictOldestTrash } from "./cloud-backup-trash";
import { readAuthorizedJsonBody } from "./cloud-backup-auth";
import {
  type Tombstones,
  indexRecord,
  stageIndex,
  stageShards,
  stagedName,
} from "./cloud-backup-shards";

export function conflict(
  request: Request,
  code: "full_push_required" | "diverged",
  message: string,
  lastPushedAt: string,
  revision?: number,
): Response {
  return json(
    request,
    {
      error: {
        code,
        message,
        lastPushedAt,
        ...(revision === undefined ? {} : { revision }),
      },
    },
    409,
  );
}

/**
 * A commit lost the manifest switch: drop what it staged and report the
 * winner's revision, so nothing of the loser is left reachable or pruned.
 */
export async function lostRace(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  staged: BackupObjects,
  fallback: CloudBackupManifest,
): Promise<Response> {
  await discardStaged(env, backupId, staged);
  const winner = (await readManifest(env, backupId))?.manifest ?? fallback;
  return conflict(
    request,
    "diverged",
    "The cloud backup changed since this upload was prepared.",
    winner.lastPushedAt,
    cloudBackupRevisionOf(winner),
  );
}

async function readShards(
  env: CloudBackupEnv,
  backupId: string,
  names: Iterable<string>,
  references: Record<string, string> | undefined,
): Promise<Map<string, Shard>> {
  const shards = new Map<string, Shard>();
  for (const name of names) {
    const reference = references?.[name];
    const existing = reference
      ? await readReferenced<Shard>(env, backupId, reference)
      : {};
    shards.set(name, Object.assign(Object.create(null) as Shard, existing));
  }
  return shards;
}

function touchedShardNames(delta: CloudBackupDelta): Set<string> {
  const touched = new Set<string>();
  for (const entity of delta.upserts)
    touched.add(cloudBackupShardOf(entity.id));
  for (const id of delta.deletes) touched.add(cloudBackupShardOf(id));
  return touched;
}

function tombstoneOf(
  entity: EntityRecord,
  id: string,
  stamp: CloudBackupEntitySyncMeta,
): CloudBackupTombstone {
  return {
    id,
    rev: stamp.rev,
    deletedBy: stamp.editedBy,
    deletedAt: stamp.editedAt,
    title: typeof entity.title === "string" ? entity.title : "",
  };
}

interface IndexState {
  hashes: Record<string, string>;
  meta: Record<string, CloudBackupEntitySyncMeta>;
  tombstones: Tombstones;
}

/** The base index as mutable, prototype-free maps. */
async function readIndexState(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
): Promise<IndexState> {
  const index = base.index
    ? await readReferenced<{
        entityHashes: Record<string, string>;
        entityMeta?: Record<string, CloudBackupEntitySyncMeta>;
        tombstones?: Tombstones;
      }>(env, backupId, base.index)
    : null;
  return {
    hashes: Object.assign(Object.create(null), index?.entityHashes ?? {}),
    meta: Object.assign(Object.create(null), index?.entityMeta ?? {}),
    tombstones: Object.assign(Object.create(null), index?.tombstones ?? {}),
  };
}

/** Applies a delta's upserts and deletes to only the shards they touch. */
async function applyEntityDelta(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
  base: BackupObjects,
  stamp: CloudBackupEntitySyncMeta,
): Promise<
  IndexState & { shards: Map<string, Shard>; trash: Map<string, Shard> }
> {
  const names = touchedShardNames(delta);
  const shards = await readShards(env, backupId, names, base.shards);
  const trash = await readShards(env, backupId, names, base.trash);
  const state = await readIndexState(env, backupId, base);
  const { hashes, meta, tombstones } = state;

  for (const id of delta.deletes) {
    const name = cloudBackupShardOf(id);
    const entity = shards.get(name)![id];
    if (entity) {
      tombstones[id] = tombstoneOf(entity, id, stamp);
      trash.get(name)![id] = entity;
    }
    delete shards.get(name)![id];
    delete hashes[id];
    delete meta[id];
  }
  for (const entity of delta.upserts as EntityRecord[]) {
    const name = cloudBackupShardOf(entity.id);
    shards.get(name)![entity.id] = entity;
    hashes[entity.id] = await hashCloudBackupEntity(entity);
    meta[entity.id] = stamp;
    delete tombstones[entity.id];
    delete trash.get(name)![entity.id];
  }
  return { ...state, shards, trash };
}

async function sizeOfReferenced(
  env: CloudBackupEnv,
  backupId: string,
  relative: string | undefined,
): Promise<number> {
  if (!relative) return 0;
  const existing = await env.BUCKET.head(absoluteKey(backupId, relative));
  return existing?.size ?? 0;
}

/** Bytes the changed shards add to the reachable total, for the vault ceiling. */
async function shardGrowth(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  shards: Map<string, Shard>,
): Promise<number> {
  let growth = 0;
  for (const [name, shard] of shards) {
    const next = Object.keys(shard).length === 0 ? 0 : jsonByteLength(shard);
    growth +=
      next - (await sizeOfReferenced(env, backupId, base.shards?.[name]));
  }
  return growth;
}

async function indexGrowth(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  hashes: Record<string, string>,
  meta: Record<string, CloudBackupEntitySyncMeta>,
  tombstones: Tombstones,
): Promise<number> {
  return (
    jsonByteLength(indexRecord(hashes, meta, tombstones)) -
    (await sizeOfReferenced(env, backupId, base.index))
  );
}

async function prepareBundleSections(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
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

  const [bundle, existing] = await Promise.all([
    base.bundle
      ? readJson<Record<string, unknown>>(
          env,
          absoluteKey(backupId, base.bundle),
        )
      : null,
    sizeOfReferenced(env, backupId, base.bundle),
  ]);
  const nextBundle = { ...(bundle ?? {}), ...sections };
  return {
    bundle: nextBundle,
    growth: jsonByteLength(nextBundle) - existing,
  };
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
  const revision = cloudBackupRevisionOf(manifest);
  if (
    delta.baseLastPushedAt !== manifest.lastPushedAt ||
    (delta.baseRevision !== undefined && delta.baseRevision !== revision)
  ) {
    return {
      response: conflict(
        request,
        "diverged",
        "The cloud backup changed since this upload was prepared.",
        manifest.lastPushedAt,
        revision,
      ),
    };
  }

  return { delta };
}

interface PreparedDelta {
  shards: Map<string, Shard>;
  trash: Map<string, Shard>;
  tombstones: Tombstones;
  hashes: Record<string, string>;
  meta: Record<string, CloudBackupEntitySyncMeta>;
  bundle: Record<string, unknown> | null;
  projectedBytes: number;
}

async function prepareDelta(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
  base: BackupObjects,
  stamp: CloudBackupEntitySyncMeta,
): Promise<PreparedDelta> {
  const { shards, trash, hashes, meta, tombstones } = await applyEntityDelta(
    env,
    backupId,
    delta,
    base,
    stamp,
  );
  await evictOldestTrash(env, backupId, base, trash, tombstones);
  const bundleUpdate = await prepareBundleSections(env, backupId, base, delta);
  const projected =
    (await reachableBytes(env, backupId, base)) +
    (await shardGrowth(env, backupId, base, shards)) +
    (await indexGrowth(env, backupId, base, hashes, meta, tombstones)) +
    bundleUpdate.growth;
  return {
    shards,
    trash,
    tombstones,
    hashes,
    meta,
    bundle: bundleUpdate.bundle,
    projectedBytes: projected,
  };
}

/** The base's references for untouched shards, plus the freshly staged ones. */
function carriedReferences(
  base: Record<string, string> | undefined,
  touched: Map<string, Shard>,
  staged: Record<string, string>,
): Record<string, string> {
  const untouched = Object.entries(base ?? {}).filter(
    ([name]) => !touched.has(name),
  );
  return { ...Object.fromEntries(untouched), ...staged };
}

/** Writes the delta's objects under the commit's tag and builds the new `objects`. */
async function stageDelta(
  env: CloudBackupEnv,
  backupId: string,
  tag: string,
  base: BackupObjects,
  prepared: PreparedDelta,
): Promise<{ staged: BackupObjects; objects: BackupObjects }> {
  const { shards, trash, hashes, meta, tombstones } = prepared;
  const stagedShards = await stageShards(env, backupId, tag, shards);
  const stagedTrash = await stageShards(env, backupId, tag, trash, "trash");
  const staged: BackupObjects = {
    index: await stageIndex(env, backupId, tag, hashes, meta, tombstones),
    shards: stagedShards,
    ...(Object.keys(stagedTrash).length > 0 ? { trash: stagedTrash } : {}),
  };
  if (prepared.bundle) {
    await writeJson(
      env,
      getStagedKey(backupId, tag, "bundle.json"),
      prepared.bundle,
    );
    staged.bundle = stagedName(tag, "bundle.json");
  }

  const allTrash = carriedReferences(base.trash, trash, stagedTrash);
  const objects: BackupObjects = {
    ...(staged.bundle || base.bundle
      ? { bundle: staged.bundle ?? base.bundle }
      : {}),
    index: staged.index,
    shards: carriedReferences(base.shards, shards, stagedShards),
    ...(Object.keys(allTrash).length > 0 ? { trash: allTrash } : {}),
  };
  return { staged, objects };
}

/**
 * Stages the changes under a key set owned by this commit, then switches the
 * manifest to them. Answers 409 when another commit switched it first.
 */
async function commitDelta(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
  auth: {
    manifest: CloudBackupManifest;
    ownerCodeHash: string;
    etag?: string;
    sharing?: SharingRecord;
  },
  base: BackupObjects,
  prepared: PreparedDelta,
  lastPushedAt: string,
): Promise<Response> {
  const { hashes } = prepared;
  const revision = cloudBackupRevisionOf(auth.manifest) + 1;
  const tag = `${revision}-${crypto.randomUUID()}`;
  const { staged, objects } = await stageDelta(
    env,
    backupId,
    tag,
    base,
    prepared,
  );

  const committed: CloudBackupManifest = {
    ...auth.manifest,
    vaultTitle: delta.vaultTitle,
    entityCount: Object.keys(hashes).length,
    sizeBytes: await reachableBytes(env, backupId, objects),
    lastPushedAt,
    revision,
    feedHorizon:
      auth.manifest.feedHorizon ?? cloudBackupRevisionOf(auth.manifest),
  };
  const won = await writeManifest(
    env,
    backupId,
    committed,
    auth.ownerCodeHash,
    objects,
    auth.etag,
    auth.sharing,
  );
  if (!won) {
    return lostRace(request, env, backupId, staged, auth.manifest);
  }

  await cleanupSuperseded(env, backupId, revision, objects, base);
  if (delta.assetIds) {
    await pruneAssets(
      env,
      backupId,
      new Set(delta.assetIds.map((id) => getAssetKey(backupId, id))),
    );
  }

  return json(request, { manifest: committed });
}

/**
 * POST /api/cloud-backup/{backupId}/delta (#3354) — publishes only what changed.
 *
 * Refuses (409) unless the backup is already v2 and the client computed the
 * delta against the current remote (`baseLastPushedAt`, and `baseRevision`
 * when sent), so a delta can never land on a copy it does not describe. Changes
 * are staged under keys of their own and the manifest is then switched to them
 * with an etag-conditional write; a delta that loses that switch gets the same
 * 409 and leaves nothing a reader can see. Prune runs only after a win.
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

  const base = await resolveObjects(env, backupId, auth.objects);
  const lastPushedAt = new Date().toISOString();
  const prepared = await prepareDelta(env, backupId, delta, base, {
    rev: cloudBackupRevisionOf(auth.manifest) + 1,
    editedBy: CLOUD_BACKUP_OWNER_EDITOR,
    editedAt: lastPushedAt,
  });
  const oversized = sizeLimitResponse(
    request,
    prepared.projectedBytes,
    CLOUD_BACKUP_LIMITS.maxVaultBytes,
    "This vault is too large to back up.",
  );
  if (oversized) return oversized;

  return commitDelta(
    request,
    env,
    backupId,
    delta,
    auth,
    base,
    prepared,
    lastPushedAt,
  );
}
