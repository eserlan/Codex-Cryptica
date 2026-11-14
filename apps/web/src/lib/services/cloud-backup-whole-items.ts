import { equalWholeContent, type WholeItem } from "@codex/cloud-backup-sync";
import type { CloudBackupWholeItemAsset } from "schema";
import { omitPrivateMapArtwork } from "./cloud-backup-artwork";

/**
 * What the delta builders need to send maps and canvases as whole items: the
 * local items, what each held when last synced, and the map file upload.
 */
export interface CloudBackupWholeSources {
  maps: readonly unknown[];
  canvases: readonly unknown[];
  /** The merge bases, keyed by the item's own id. */
  mapBases: Readonly<Record<string, unknown>>;
  canvasBases: Readonly<Record<string, unknown>>;
  /** Stores a map's files in the backup; null when one cannot be read or sent. */
  prepareMapAssets: (
    map: unknown,
  ) => Promise<CloudBackupWholeItemAsset[] | null>;
}

export interface CloudBackupWholeFields {
  mapUpserts?: { item: { id: string }; assets: CloudBackupWholeItemAsset[] }[];
  mapDeletes?: string[];
  canvasUpserts?: { item: { id: string } }[];
  canvasDeletes?: string[];
}

type Row = { kind: string; id: string; deleted: boolean };

const WHOLE_ROW_ID = "*";

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const byId = (items: readonly unknown[]): Map<string, WholeItem> =>
  new Map(
    (items as WholeItem[])
      .filter((item) => typeof item?.id === "string")
      .map((item) => [item.id, item]),
  );

const equalsBase = (local: WholeItem, base: unknown) =>
  !!base && equalWholeContent(local, base as WholeItem);

/**
 * Turns the pending `maps` and `canvas` rows into upserts and deletes by id.
 * A `maps` row for one id forces that map (a fog edit leaves its record
 * alone); the `*` row compares every map with its base. A map whose files
 * cannot be read or sent is left out, and its row stays in `held`.
 */
export async function buildWholeItemFields<T extends Row>(
  rows: readonly T[],
  sources: CloudBackupWholeSources,
  signal?: AbortSignal,
): Promise<{
  fields: CloudBackupWholeFields;
  assetIds: string[];
  sent: T[];
  held: T[];
}> {
  const fields: CloudBackupWholeFields = {};
  const assetIds: string[] = [];
  const held: T[] = [];
  const mapRows = rows.filter((row) => row.kind === "maps");
  if (mapRows.length > 0) {
    const failed = await collectMaps(
      mapRows,
      sources,
      fields,
      assetIds,
      signal,
    );
    for (const row of mapRows) {
      const stays =
        row.id === WHOLE_ROW_ID ? failed.size > 0 : failed.has(row.id);
      if (stays) held.push(row);
    }
  }
  const canvasRows = rows.filter((row) => row.kind === "canvas");
  if (canvasRows.length > 0) collectCanvases(canvasRows, sources, fields);
  return {
    fields,
    assetIds,
    held,
    sent: rows.filter(
      (row) =>
        (row.kind === "maps" || row.kind === "canvas") && !held.includes(row),
    ),
  };
}

/** The maps to look at: the named ones, or every one when the whole row is dirty. */
function mapCandidates(
  rows: readonly Row[],
  forced: ReadonlySet<string>,
  local: ReadonlyMap<string, unknown>,
  bases: Record<string, unknown>,
): Set<string> {
  if (!rows.some((row) => row.id === WHOLE_ROW_ID)) return new Set(forced);
  return new Set([...forced, ...local.keys(), ...Object.keys(bases)]);
}

function addMapUpsert(
  fields: CloudBackupWholeFields,
  assetIds: string[],
  item: WholeItem,
  assets: CloudBackupWholeItemAsset[],
): void {
  (fields.mapUpserts ??= []).push({ item, assets });
  assetIds.push(...assets.map((asset) => asset.assetId));
}

/** Reads one map into the fields; false when its files could not be prepared. */
async function collectMap(
  id: string,
  forced: boolean,
  sources: CloudBackupWholeSources,
  fields: CloudBackupWholeFields,
  assetIds: string[],
): Promise<boolean> {
  const map = byId(sources.maps).get(id);
  if (!map) {
    if (id in sources.mapBases) (fields.mapDeletes ??= []).push(id);
    return true;
  }
  if (!forced && equalsBase(map, sources.mapBases[id])) return true;
  const item = plain(omitPrivateMapArtwork(map) as WholeItem);
  const assets = await sources.prepareMapAssets(item);
  if (assets) addMapUpsert(fields, assetIds, item, assets);
  return !!assets;
}

async function collectMaps(
  rows: readonly Row[],
  sources: CloudBackupWholeSources,
  fields: CloudBackupWholeFields,
  assetIds: string[],
  signal?: AbortSignal,
): Promise<Set<string>> {
  const forced = new Set(
    rows.filter((row) => row.id !== WHOLE_ROW_ID).map((row) => row.id),
  );
  const local = byId(sources.maps);
  const candidates = mapCandidates(rows, forced, local, sources.mapBases);
  const failed = new Set<string>();
  for (const id of candidates) {
    if (signal?.aborted) break;
    const ok = await collectMap(id, forced.has(id), sources, fields, assetIds);
    if (!ok) failed.add(id);
  }
  return failed;
}

function collectCanvases(
  rows: readonly Row[],
  sources: CloudBackupWholeSources,
  fields: CloudBackupWholeFields,
): void {
  const local = byId(sources.canvases);
  for (const { id, deleted } of rows) {
    const canvas = local.get(id);
    if (deleted || !canvas) {
      (fields.canvasDeletes ??= []).push(id);
    } else if (!equalsBase(canvas, sources.canvasBases[id])) {
      (fields.canvasUpserts ??= []).push({ item: plain(canvas) });
    }
  }
}

/** True when the fields carry no map or canvas change. */
export const noWholeChanges = (fields: CloudBackupWholeFields): boolean =>
  !fields.mapUpserts?.length &&
  !fields.mapDeletes?.length &&
  !fields.canvasUpserts?.length &&
  !fields.canvasDeletes?.length;
