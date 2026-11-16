import {
  CLOUD_BACKUP_LIMITS,
  canonicalJson,
  cloudBackupShardOf,
  hashCloudBackupEntity,
  type CloudBackupDelta,
  type CloudBackupEntitySyncMeta,
  type CloudBackupTombstone,
  type CloudBackupWholeItemAsset,
  type CloudBackupWholeItemMeta,
} from "../../../../packages/schema/src/publishing";
import type { Shard } from "./cloud-backup-entities";
import {
  type BackupObjects,
  type CloudBackupEnv,
  getAssetKey,
  readReferenced,
} from "./cloud-backup-storage";
import type { Tombstones } from "./cloud-backup-shards";

/** Maps and canvases sync as whole items: one record, one revision. */
export type WholeKind = "map" | "canvas";
export type WholeItem = { id: string } & Record<string, unknown>;
export type WholeMetaRecord = Record<string, CloudBackupWholeItemMeta>;

/** The per-item metadata of both kinds, as `index.json` stores it. */
export interface WholeMeta {
  mapMeta: WholeMetaRecord;
  canvasMeta: WholeMetaRecord;
}

export const emptyWholeMeta = (): WholeMeta => ({
  mapMeta: Object.create(null),
  canvasMeta: Object.create(null),
});

/** The base index's whole-item metadata as mutable, prototype-free maps. */
export function readWholeMeta(
  index: Partial<Record<"mapMeta" | "canvasMeta", WholeMetaRecord>> | null,
): WholeMeta {
  return {
    mapMeta: Object.assign(Object.create(null), index?.mapMeta ?? {}),
    canvasMeta: Object.assign(Object.create(null), index?.canvasMeta ?? {}),
  };
}

const hasId = (item: unknown): item is WholeItem =>
  !!item &&
  typeof item === "object" &&
  typeof (item as { id?: unknown }).id === "string";

export const asItems = (list: unknown): WholeItem[] =>
  Array.isArray(list) ? list.filter(hasId) : [];

/** A stored item's name, kept as the tombstone's title. */
const nameOf = (item: WholeItem) =>
  (typeof item.name === "string" ? item.name : "").slice(
    0,
    CLOUD_BACKUP_LIMITS.maxTitleLength,
  );

/** What a delta does to one kind of item. */
export interface WholeChanges {
  upserts: Array<{ item: WholeItem; assets?: CloudBackupWholeItemAsset[] }>;
  deletes: WholeItem[];
  /** The kind's new list, or null when the delta leaves it alone. */
  list: WholeItem[] | null;
}

async function sameAsStored(
  upsert: { item: WholeItem; assets?: CloudBackupWholeItemAsset[] },
  stored: WholeItem | undefined,
  meta: CloudBackupWholeItemMeta | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const storedHash = meta?.hash ?? (await hashCloudBackupEntity(stored));
  return (
    storedHash === (await hashCloudBackupEntity(upsert.item)) &&
    canonicalJson(upsert.assets ?? []) === canonicalJson(meta?.assets ?? [])
  );
}

type Upsert = WholeChanges["upserts"][number];

/** The upserts that differ from what is stored. */
async function changedUpserts(
  upserts: readonly Upsert[],
  byId: ReadonlyMap<string, WholeItem>,
  meta: WholeMetaRecord,
): Promise<Upsert[]> {
  const changed: Upsert[] = [];
  for (const upsert of upserts) {
    const id = upsert.item.id;
    if (!(await sameAsStored(upsert, byId.get(id), meta[id]))) {
      changed.push(upsert);
    }
  }
  return changed;
}

/** An older client's whole list: what changed in it, and what it dropped. */
async function planLegacyList(
  legacy: unknown[],
  stored: WholeItem[],
  meta: WholeMetaRecord,
): Promise<WholeChanges> {
  const list = asItems(legacy);
  const kept = new Set(list.map((item) => item.id));
  const byId = new Map(stored.map((item) => [item.id, item]));
  // The list carries no files, so a stored item keeps the ones it has.
  const candidates = list.map((item) => ({
    item,
    assets: meta[item.id]?.assets,
  }));
  const changed = await changedUpserts(candidates, byId, meta);
  return {
    upserts: changed.map(({ item }) => ({ item })),
    deletes: stored.filter((item) => !kept.has(item.id)),
    // Stored as sent, so an older client's list is never reshaped.
    list: legacy as WholeItem[],
  };
}

/** Works out what a delta changes for `kind`, in either of its two forms. */
export async function planWholeItems(
  kind: WholeKind,
  delta: CloudBackupDelta,
  stored: WholeItem[],
  meta: WholeMetaRecord,
): Promise<WholeChanges> {
  const legacy = kind === "map" ? delta.maps : delta.canvases;
  if (legacy) return planLegacyList(legacy, stored, meta);

  const upserts = (
    kind === "map"
      ? delta.mapUpserts
      : delta.canvasUpserts?.map((entry) => ({ item: entry.item }))
  ) as Upsert[] | undefined;
  const deletes =
    (kind === "map" ? delta.mapDeletes : delta.canvasDeletes) ?? [];
  if (!upserts?.length && deletes.length === 0) {
    return { upserts: [], deletes: [], list: null };
  }

  const byId = new Map(stored.map((item) => [item.id, item]));
  const changed = await changedUpserts(upserts ?? [], byId, meta);
  const removed = deletes
    .map((id) => byId.get(id))
    .filter((item): item is WholeItem => !!item);
  const next = new Map(byId);
  for (const item of removed) next.delete(item.id);
  for (const { item } of changed) next.set(item.id, item);
  return { upserts: changed, deletes: removed, list: [...next.values()] };
}

/**
 * Stamps the changed items, tombstones the removed ones and moves their
 * content to the trash. Mutates `meta`, `tombstones` and `trash`.
 */
export async function applyWholeChanges(
  kind: WholeKind,
  changes: WholeChanges,
  state: {
    meta: WholeMetaRecord;
    tombstones: Tombstones;
    trash: Map<string, Shard>;
  },
  stamp: CloudBackupEntitySyncMeta,
): Promise<void> {
  const { meta, tombstones, trash } = state;
  for (const item of changes.deletes) {
    const tombstone: CloudBackupTombstone = {
      id: item.id,
      rev: stamp.rev,
      deletedBy: stamp.editedBy,
      deletedAt: stamp.editedAt,
      title: nameOf(item),
      kind,
    };
    tombstones[item.id] = tombstone;
    const assets = meta[item.id]?.assets;
    trash.get(cloudBackupShardOf(item.id))![item.id] = {
      id: item.id,
      item,
      ...(assets ? { assets } : {}),
    };
    delete meta[item.id];
  }
  for (const { item, assets } of changes.upserts) {
    meta[item.id] = {
      ...stamp,
      hash: await hashCloudBackupEntity(item),
      ...(assets ? { assets } : {}),
    };
    delete tombstones[item.id];
    delete trash.get(cloudBackupShardOf(item.id))?.[item.id];
  }
}

/** The trash shards that changes to these items touch. */
export function wholeShardNames(changes: WholeChanges[]): Set<string> {
  const names = new Set<string>();
  for (const { upserts, deletes } of changes) {
    for (const { item } of upserts) names.add(cloudBackupShardOf(item.id));
    for (const item of deletes) names.add(cloudBackupShardOf(item.id));
  }
  return names;
}

/** Replaces the manifest entries of the paths a map's new files cover. */
export function replaceManifestEntries(
  manifest: unknown,
  upserts: WholeChanges["upserts"],
): unknown[] {
  const replaced = new Map<string, CloudBackupWholeItemAsset>();
  for (const { assets } of upserts) {
    for (const asset of assets ?? []) replaced.set(asset.path, asset);
  }
  if (replaced.size === 0) return Array.isArray(manifest) ? manifest : [];
  const kept = (Array.isArray(manifest) ? manifest : []).filter(
    (entry) => !replaced.has((entry as { path?: string })?.path ?? ""),
  );
  return [
    ...kept,
    ...[...replaced.values()].map(({ assetId, path, mimeType }) => ({
      assetId,
      path,
      mimeType,
    })),
  ];
}

/** The first asset id of the delta's maps that the backup does not store. */
export async function findMissingAsset(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
): Promise<string | null> {
  const ids = new Set(
    (delta.mapUpserts ?? []).flatMap((upsert) =>
      (upsert.assets ?? []).map((asset) => asset.assetId),
    ),
  );
  for (const id of ids) {
    if (!(await env.BUCKET.head(getAssetKey(backupId, id)))) return id;
  }
  return null;
}

/** Every asset id a live map, or a trashed map whose content is kept, references. */
export async function keptMapAssetIds(
  env: CloudBackupEnv,
  backupId: string,
  base: BackupObjects,
  mapMeta: WholeMetaRecord,
  tombstones: Tombstones,
  trash: Map<string, Shard>,
  droppedTrashIds?: ReadonlySet<string>,
): Promise<string[]> {
  const ids = new Set<string>();
  for (const meta of Object.values(mapMeta)) {
    for (const asset of meta.assets ?? []) ids.add(asset.assetId);
  }
  for (const tombstone of Object.values(tombstones)) {
    if (tombstone.kind !== "map") continue;
    if (droppedTrashIds?.has(tombstone.id)) continue;
    const name = cloudBackupShardOf(tombstone.id);
    let shard = trash.get(name);
    const reference = base.trash?.[name];
    if (!shard && reference) {
      shard = await readReferenced<Shard>(env, backupId, reference);
    }
    const kept = shard?.[tombstone.id] as
      { assets?: CloudBackupWholeItemAsset[] } | undefined;
    for (const asset of kept?.assets ?? []) ids.add(asset.assetId);
  }
  return [...ids];
}
