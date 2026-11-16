import {
  CLOUD_BACKUP_LIMITS,
  CLOUD_BACKUP_SCHEMA_V2,
  CLOUD_BACKUP_MEMBER_EDITOR,
  CLOUD_BACKUP_OWNER_EDITOR,
  CloudBackupDeltaSchema,
  cloudBackupRevisionOf,
  cloudBackupShardOf,
  hashCloudBackupEntity,
  type CloudBackupDelta,
  type CloudBackupEntitySyncMeta,
  type CloudBackupManifest,
  type CloudBackupTombstone,
  type CloudBackupTrashEviction,
} from "../../../../packages/schema/src/publishing";
import type { EntityRecord, Shard } from "./cloud-backup-entities";
import {
  type BackupObjects,
  type CloudBackupEnv,
  absoluteKey,
  discardStaged,
  getStagedKey,
  jsonByteLength,
  readJson,
  readManifest,
  readReferenced,
  reachableBytes,
  resolveObjects,
  writeJson,
  type SharingRecord,
} from "./cloud-backup-storage";
import { json, isValidAssetId, sizeLimitResponse } from "./cloud-backup-http";
import {
  type WholeChanges,
  type WholeMeta,
  type WholeMetaRecord,
  applyWholeChanges,
  asItems,
  findMissingAsset,
  keptMapAssetIds,
  planWholeItems,
  readWholeMeta,
  replaceManifestEntries,
  wholeShardNames,
} from "./cloud-backup-whole-items";
import { publishCommit } from "./cloud-backup-restore-points";
import { type TrashDropPlan, pruneTrash } from "./cloud-backup-trash";
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

export async function readShards(
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

export function tombstoneOf(
  entity: EntityRecord,
  id: string,
  stamp: CloudBackupEntitySyncMeta,
): CloudBackupTombstone {
  return {
    id,
    rev: stamp.rev,
    deletedBy: stamp.editedBy,
    deletedAt: stamp.editedAt,
    title: (typeof entity.title === "string" ? entity.title : "").slice(
      0,
      CLOUD_BACKUP_LIMITS.maxTitleLength,
    ),
  };
}

export interface IndexState extends WholeMeta {
  hashes: Record<string, string>;
  meta: Record<string, CloudBackupEntitySyncMeta>;
  tombstones: Tombstones;
}

/** The base index as mutable, prototype-free maps. */
export async function readIndexState(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
): Promise<IndexState> {
  const index = base.index
    ? await readReferenced<{
        entityHashes: Record<string, string>;
        entityMeta?: Record<string, CloudBackupEntitySyncMeta>;
        tombstones?: Tombstones;
        mapMeta?: WholeMetaRecord;
        canvasMeta?: WholeMetaRecord;
      }>(env, backupId, base.index)
    : null;
  return {
    ...readWholeMeta(index),
    hashes: Object.assign(Object.create(null), index?.entityHashes ?? {}),
    meta: Object.assign(Object.create(null), index?.entityMeta ?? {}),
    tombstones: Object.assign(Object.create(null), index?.tombstones ?? {}),
  };
}

/** Tombstones an entity and moves its content to the trash, like a delete. */
export function trashEntity(
  id: string,
  stamp: CloudBackupEntitySyncMeta,
  { hashes, meta, tombstones }: IndexState,
  shards: Map<string, Shard>,
  trash: Map<string, Shard>,
): void {
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

/**
 * Applies a delta's entity upserts and deletes to only the shards they touch.
 * `trashNames` adds trash shards that map and canvas deletes will write to.
 */
async function applyEntityDelta(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
  base: BackupObjects,
  stamp: CloudBackupEntitySyncMeta,
  state: IndexState,
  trashNames: Set<string>,
): Promise<{ shards: Map<string, Shard>; trash: Map<string, Shard> }> {
  const names = touchedShardNames(delta);
  const shards = await readShards(env, backupId, names, base.shards);
  const trash = await readShards(
    env,
    backupId,
    new Set([...names, ...trashNames]),
    base.trash,
  );
  const { hashes, meta, tombstones } = state;

  for (const id of delta.deletes) {
    trashEntity(id, stamp, state, shards, trash);
  }
  for (const entity of delta.upserts as EntityRecord[]) {
    const name = cloudBackupShardOf(entity.id);
    shards.get(name)![entity.id] = entity;
    hashes[entity.id] = await hashCloudBackupEntity(entity);
    meta[entity.id] = stamp;
    delete tombstones[entity.id];
    delete trash.get(name)![entity.id];
  }
  return { shards, trash };
}

export async function sizeOfReferenced(
  env: CloudBackupEnv,
  backupId: string,
  relative: string | undefined,
): Promise<number> {
  if (!relative) return 0;
  const existing = await env.BUCKET.head(absoluteKey(backupId, relative));
  return existing?.size ?? 0;
}

/** Bytes the changed shards add to the reachable total, for the vault ceiling. */
export async function shardGrowth(
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

export async function indexGrowth(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  hashes: Record<string, string>,
  meta: Record<string, CloudBackupEntitySyncMeta>,
  tombstones: Tombstones,
  whole: WholeMeta,
): Promise<number> {
  return (
    jsonByteLength(indexRecord(hashes, meta, tombstones, whole)) -
    (await sizeOfReferenced(env, backupId, base.index))
  );
}

/** Whether the delta touches the bundle's maps, canvases or asset manifest. */
const changesBundle = (delta: CloudBackupDelta) =>
  [
    delta.maps,
    delta.canvases,
    delta.assetManifest,
    delta.mapUpserts,
    delta.mapDeletes,
    delta.canvasUpserts,
    delta.canvasDeletes,
  ].some((section) => section !== undefined);

async function readBundleFor(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  delta: CloudBackupDelta,
): Promise<{ bundle: Record<string, unknown> | null; existing: number }> {
  if (!changesBundle(delta) || !base.bundle) {
    return { bundle: null, existing: 0 };
  }
  const [bundle, existing] = await Promise.all([
    readJson<Record<string, unknown>>(env, absoluteKey(backupId, base.bundle)),
    sizeOfReferenced(env, backupId, base.bundle),
  ]);
  return { bundle, existing };
}

function validateDelta(
  request: Request,
  body: unknown,
  manifest: CloudBackupManifest,
): { delta: CloudBackupDelta } | { response: Response } {
  const parsed = CloudBackupDeltaSchema.safeParse(body);
  if (
    !parsed.success ||
    [
      ...(parsed.data.assetIds ?? []),
      ...(parsed.data.mapUpserts ?? []).flatMap((upsert) =>
        (upsert.assets ?? []).map((asset) => asset.assetId),
      ),
    ].some((id) => !isValidAssetId(id))
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

export interface PreparedDelta {
  /** The highest `rev` of a tombstone the purge removed, or 0. */
  purgedRev: number;
  shards: Map<string, Shard>;
  trash: Map<string, Shard>;
  trashDrops?: TrashDropPlan;
  trashEvicted?: CloudBackupTrashEviction;
  tombstones: Tombstones;
  hashes: Record<string, string>;
  meta: Record<string, CloudBackupEntitySyncMeta>;
  whole: WholeMeta;
  bundle: Record<string, unknown> | null;
  /** Asset ids that live or trashed maps reference; the prune must keep them. */
  keptAssetIds: string[];
  projectedBytes: number;
}

/** The bundle with the delta's maps, canvases and asset manifest, or null when it is unchanged. */
function nextBundleFor(
  delta: CloudBackupDelta,
  bundle: Record<string, unknown> | null,
  mapChanges: WholeChanges,
  canvasChanges: WholeChanges,
): Record<string, unknown> | null {
  const sections: Record<string, unknown> = {
    ...(mapChanges.list ? { maps: mapChanges.list } : {}),
    ...(canvasChanges.list ? { canvases: canvasChanges.list } : {}),
  };
  if (delta.assetManifest || mapChanges.upserts.some((u) => u.assets)) {
    sections.assetManifest = replaceManifestEntries(
      delta.assetManifest ?? bundle?.assetManifest,
      mapChanges.upserts,
    );
  }
  return Object.keys(sections).length > 0
    ? { ...(bundle ?? {}), ...sections }
    : null;
}

/** The asset ids of live and trashed maps, which a prune must keep. */
async function keptAssetsFor(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  delta: CloudBackupDelta,
  mapMeta: WholeMetaRecord,
  tombstones: Tombstones,
  trash: Map<string, Shard>,
  droppedTrashIds?: ReadonlySet<string>,
): Promise<string[]> {
  if (!delta.assetIds) return [];
  return keptMapAssetIds(
    env,
    backupId,
    base,
    mapMeta,
    tombstones,
    trash,
    droppedTrashIds,
  );
}

async function prepareDelta(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
  base: BackupObjects,
  stamp: CloudBackupEntitySyncMeta,
): Promise<PreparedDelta> {
  const state = await readIndexState(env, backupId, base);
  const { bundle, existing } = await readBundleFor(env, backupId, base, delta);
  const storedMaps = asItems(bundle?.maps);
  const storedCanvases = asItems(bundle?.canvases);
  const mapChanges = await planWholeItems(
    "map",
    delta,
    storedMaps,
    state.mapMeta,
  );
  const canvasChanges = await planWholeItems(
    "canvas",
    delta,
    storedCanvases,
    state.canvasMeta,
  );
  const { shards, trash } = await applyEntityDelta(
    env,
    backupId,
    delta,
    base,
    stamp,
    state,
    wholeShardNames([mapChanges, canvasChanges]),
  );
  const { hashes, meta, tombstones } = state;
  await applyWholeChanges(
    "map",
    mapChanges,
    { meta: state.mapMeta, tombstones, trash },
    stamp,
  );
  await applyWholeChanges(
    "canvas",
    canvasChanges,
    { meta: state.canvasMeta, tombstones, trash },
    stamp,
  );
  const { purgedRev, trashDrops, trashEvicted } = await pruneTrash(
    env,
    backupId,
    base,
    trash,
    tombstones,
  );

  const nextBundle = nextBundleFor(delta, bundle, mapChanges, canvasChanges);
  const bundleGrowth = nextBundle ? jsonByteLength(nextBundle) - existing : 0;
  const keptAssetIds = await keptAssetsFor(
    env,
    backupId,
    base,
    delta,
    state.mapMeta,
    tombstones,
    trash,
    trashDrops.droppedIds,
  );

  const projected =
    (await reachableBytes(env, backupId, base)) +
    (await shardGrowth(env, backupId, base, shards)) +
    (await indexGrowth(env, backupId, base, hashes, meta, tombstones, state)) +
    bundleGrowth;
  return {
    purgedRev,
    shards,
    trash,
    trashDrops,
    ...(trashEvicted ? { trashEvicted } : {}),
    tombstones,
    hashes,
    meta,
    whole: state,
    bundle: nextBundle,
    keptAssetIds,
    projectedBytes: projected,
  };
}

/** The base's references for untouched shards, plus the freshly staged ones. */
function carriedReferences(
  base: Record<string, string> | undefined,
  touched: { has(name: string): boolean },
  staged: Record<string, string>,
): Record<string, string> {
  const untouched = Object.entries(base ?? {}).filter(
    ([name]) => !touched.has(name),
  );
  return { ...Object.fromEntries(untouched), ...staged };
}

/** Reads, filters, and stages affected unloaded trash shards one at a time. */
async function stageDroppedTrashShards(
  env: CloudBackupEnv,
  backupId: string,
  tag: string,
  base: BackupObjects,
  trashDrops: TrashDropPlan | undefined,
  stagedTrash: Record<string, string>,
): Promise<void> {
  if (!trashDrops) return;
  for (const [name, droppedIds] of trashDrops.droppedByShard) {
    if (trashDrops.emptiedShards.has(name)) continue;
    const reference = base.trash?.[name];
    if (!reference) continue;
    const shard = await readReferenced<Shard>(env, backupId, reference);
    const filtered: Shard = Object.create(null);
    for (const [id, value] of Object.entries(shard)) {
      if (!droppedIds.has(id)) filtered[id] = value;
    }
    if (Object.keys(filtered).length > 0) {
      await writeJson(
        env,
        getStagedKey(backupId, tag, `trash/${name}.json`),
        filtered,
      );
      stagedTrash[name] = stagedName(tag, `trash/${name}.json`);
    }
  }
}

/** Writes the delta's objects under the commit's tag and builds the new `objects`. */
export async function stageDelta(
  env: CloudBackupEnv,
  backupId: string,
  tag: string,
  base: BackupObjects,
  prepared: PreparedDelta,
): Promise<{ staged: BackupObjects; objects: BackupObjects }> {
  const { shards, trash, trashDrops, hashes, meta, tombstones, whole } =
    prepared;
  const stagedShards = await stageShards(env, backupId, tag, shards);
  const stagedTrash = await stageShards(env, backupId, tag, trash, "trash");
  await stageDroppedTrashShards(
    env,
    backupId,
    tag,
    base,
    trashDrops,
    stagedTrash,
  );
  const staged: BackupObjects = {
    index: await stageIndex(
      env,
      backupId,
      tag,
      hashes,
      meta,
      tombstones,
      whole,
    ),
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

  const touchedTrash = new Set<string>([
    ...trash.keys(),
    ...(trashDrops?.droppedByShard.keys() ?? []),
    ...(trashDrops?.emptiedShards ?? []),
  ]);
  const allTrash = carriedReferences(base.trash, touchedTrash, stagedTrash);
  const objects: BackupObjects = {
    ...(staged.bundle || base.bundle
      ? { bundle: staged.bundle ?? base.bundle }
      : {}),
    index: staged.index,
    shards: carriedReferences(base.shards, shards, stagedShards),
    ...(Object.keys(allTrash).length > 0 ? { trash: allTrash } : {}),
    ...(base.assetVersions ? { assetVersions: base.assetVersions } : {}),
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
    feedHorizon: Math.max(
      auth.manifest.feedHorizon ?? cloudBackupRevisionOf(auth.manifest),
      prepared.purgedRev,
    ),
  };
  return publishCommit(
    request,
    env,
    backupId,
    {
      committed,
      objects,
      staged,
      base,
      ownerCodeHash: auth.ownerCodeHash,
      etag: auth.etag,
      sharing: auth.sharing,
      assetIds: delta.assetIds && [
        ...new Set([...delta.assetIds, ...prepared.keptAssetIds]),
      ],
      trashEvicted: prepared.trashEvicted,
    },
    () => lostRace(request, env, backupId, staged, auth.manifest),
  );
}

/**
 * Who a commit is stamped as: the owner for the owner key, otherwise the
 * editor's cleaned name, or "member" when it is missing or could pass as a role.
 */
function editedByFor(role: "owner" | "editor", editorName?: string): string {
  if (role === "owner") return CLOUD_BACKUP_OWNER_EDITOR;
  const name = (editorName ?? "").replace(/\p{Cc}/gu, "").trim();
  const reserved = [CLOUD_BACKUP_OWNER_EDITOR, CLOUD_BACKUP_MEMBER_EDITOR];
  return name && !reserved.includes(name.toLowerCase())
    ? name
    : CLOUD_BACKUP_MEMBER_EDITOR;
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

  const missing = await findMissingAsset(env, backupId, delta);
  if (missing) {
    return json(
      request,
      {
        error: {
          code: "missing_asset",
          message: "A file this change refers to is not in the backup.",
          assetId: missing,
        },
      },
      409,
    );
  }

  const base = await resolveObjects(env, backupId, auth.objects);
  const lastPushedAt = new Date().toISOString();
  const prepared = await prepareDelta(env, backupId, delta, base, {
    rev: cloudBackupRevisionOf(auth.manifest) + 1,
    editedBy: editedByFor(auth.role, delta.editorName),
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
