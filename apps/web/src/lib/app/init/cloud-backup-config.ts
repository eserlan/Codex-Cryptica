import type {
  AssetDownload,
  CloudBackupDeps,
  PulledWholeChanges,
} from "#lib/stores/cloud-backup-types.js";
import {
  sha256Hex,
  type CloudBackupRuntime,
  type CloudBackupTiming,
  type MergeEntity,
  type WholeItem,
} from "@codex/cloud-backup-sync";
import { resolveOracleProxyUrl } from "../../config/oracle-proxy";
import { vault } from "#lib/stores/vault.svelte.js";
import { mapRegistry } from "#lib/stores/map-registry.svelte.js";
import { mapStore } from "#lib/stores/map.svelte.js";
import { canvasRegistry } from "#lib/stores/canvas-registry.svelte.js";
import { deleteCanvasFromDisk } from "#lib/stores/vault/io.js";
import { toRouteSlug } from "#lib/utils/slug.js";
import { CanvasSchema } from "@codex/canvas-engine";
import { MapSchema } from "schema";
import { getDB } from "#lib/utils/idb.js";
import {
  cloudBackupStore,
  cloudBackupBrowserStorage,
} from "#lib/stores/cloud-backup.svelte.js";
import {
  assetIdForPath,
  buildCloudBackupDelta,
  buildCloudBackupEditorDelta,
  buildCloudBackupPayload,
  collectAssetPaths,
  isLocalAssetPath,
} from "#lib/services/cloud-backup-payload.js";
import {
  CloudBackupBaseStore,
  type WholeKind,
} from "#lib/stores/cloud-backup-base.js";
import { CloudBackupDirtyStore } from "#lib/stores/cloud-backup-dirty.js";
import { createCloudBackupRestore } from "./cloud-backup-restore";
import { createArtworkBackupRuntime } from "#lib/stores/cloud-backup-artwork-runtime.js";
import {
  AdventureSessionRepository,
  adventureSessionRepository,
} from "#lib/services/adventure/adventure-session-repository.js";
import { browserStorage, systemIdGenerator } from "#lib/utils/runtime-deps.js";
import { vaultRegistry } from "#lib/stores/vault-registry.svelte.js";
import { SharedVaultJoin } from "#lib/stores/shared-vault-join.js";
import { isPrivateArtworkSnapshotPath } from "schema";
import { omitArtworkForBackup } from "#lib/services/cloud-backup-artwork.js";
import { isSafeRestoredAssetPath } from "#lib/services/cloud-backup-restore-path.js";
import {
  hasSafeMapPaths,
  isMapMediaPath,
} from "#lib/services/map-media-path.js";
import { entityEditingRegistry } from "#lib/stores/entity-editing-registry.js";
import { readOpfsBlob, writeOpfsFile } from "#lib/utils/opfs.js";
import { sharedVaultIdentity } from "#lib/stores/shared-vault-identity.js";
import { deleteNoticeText } from "#lib/stores/cloud-backup-delete-notice.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

const dirty = new CloudBackupDirtyStore();
const base = new CloudBackupBaseStore();
const artworkRuntime = createArtworkBackupRuntime({
  read: async (key) => (await getDB()).get("settings", key),
  write: async (key, value) => {
    await (await getDB()).put("settings", value, key);
  },
  locks: typeof navigator === "undefined" ? undefined : navigator.locks,
  requireFullPush: (vaultId) => dirty.requireFullPush(vaultId),
  newRemovalId: () => systemIdGenerator.uuid(),
});
const adventures = new AdventureSessionRepository(async (vaultId) => {
  const root = await vault.getSpecificVaultHandle(vaultId);
  if (!root) throw new Error("Vault unavailable for backup");
  return root;
});

/**
 * Silent stage timings for the worker-or-not question (counts, bytes and ms
 * only — never content). `console.debug` stays hidden unless Verbose logging
 * is on, so this ships without noise and reads with numbers when profiling.
 */
function timeCloudBackupSave(timing: CloudBackupTiming): void {
  console.debug(
    `[CloudBackup:${timing.stage}] ${timing.durationMs.toFixed(1)}ms` +
      (timing.count !== undefined ? ` count=${timing.count}` : "") +
      (timing.bytes !== undefined ? ` bytes=${timing.bytes}` : ""),
  );
}

function createEntityHydrator() {
  return {
    isContentLoaded: (id: string) => vault.isContentLoaded(id),
    readFullEntity: (id: string) => vault.readFullEntity(id),
  };
}

async function resolveAdventureInclusion(
  vaultId: string,
  signal: AbortSignal | undefined,
  includeAdventures: boolean | undefined,
) {
  if (!includeAdventures) return undefined;
  if (
    vault.activeVaultId !== vaultId ||
    !(await artworkRuntime.consent.read(vaultId)).enabled
  ) {
    throw new Error("Adventure backup inclusion is not authorised.");
  }
  return {
    consented: true as const,
    readAdventures: () => {
      if (vault.activeVaultId !== vaultId) {
        throw new Error("The active Vault changed.");
      }
      return adventures.readAllForBackup(vaultId, signal);
    },
  };
}

function buildBackupPayloadDeps(
  signal: AbortSignal | undefined,
  adventureInclusion: Awaited<ReturnType<typeof resolveAdventureInclusion>>,
) {
  return {
    resolveImageUrl: (path: string) => vault.resolveImageUrl(path),
    // Without this the snapshot stores whatever `content` is in memory,
    // and a warm start seeds that from the cache with a 280-character
    // preview rather than the entity's markdown.
    hydrateEntities: createEntityHydrator(),
    signal,
    onTiming: timeCloudBackupSave,
    ...(adventureInclusion ? { adventureInclusion } : {}),
  };
}

function buildBackupContent(sessionJournals: { startedAt: number }[]) {
  return {
    maps: mapRegistry.allMaps ?? [],
    canvases: canvasRegistry.allCanvases ?? [],
    // Session journals are only part of a full backup, never a delta.
    sessionJournals: sessionJournals.sort((a, b) => b.startedAt - a.startedAt),
  };
}

const buildVaultBackupPayload: CloudBackupDeps["buildPayload"] = async (
  vaultId,
  signal,
  artwork,
) => {
  const adventureInclusion = await resolveAdventureInclusion(
    vaultId,
    signal,
    artwork?.includeAdventures,
  );
  // Do not use the store's reactive snapshot here: its initial vault read
  // is asynchronous, so a backup requested immediately after app startup
  // could otherwise omit existing journals. Read the requested vault's
  // persisted records directly for this full snapshot.
  const sessionJournals = await (
    await getDB()
  ).getAllFromIndex("session_journals", "by-vault", vaultId);
  return buildCloudBackupPayload(
    vault.vaultName || "Vault",
    Object.values(vault.entities ?? {}),
    buildBackupPayloadDeps(signal, adventureInclusion),
    buildBackupContent(sessionJournals),
  );
};

function deltaDeps(uploadedAssetIds: ReadonlySet<string>, signal: AbortSignal) {
  return {
    // Same boundary widening as the full payload above: the store's
    // record is structurally compatible but not nominally LocalEntity.
    getEntity: (id: string) => vault.entities?.[id] as never,
    hydrateEntities: createEntityHydrator(),
    uploadedAssetIds,
    onTiming: timeCloudBackupSave,
    referencedAssetIds: collectAssetPaths(
      Object.values(vault.entities ?? {}) as never[],
      mapRegistry.allMaps ?? [],
    )
      .filter((path) => !isPrivateArtworkSnapshotPath(path))
      .map(assetIdForPath),
    signal,
  };
}

/** The maps and canvases a delta compares with what each held when last synced. */
async function wholeContent(
  vaultId: string,
  prepareMapAssets: Parameters<NonNullable<CloudBackupDeps["buildDelta"]>>[4],
) {
  return {
    maps: mapRegistry.allMaps ?? [],
    canvases: canvasRegistry.allCanvases ?? [],
    mapBases: await base.listWhole(vaultId, "map"),
    canvasBases: await base.listWhole(vaultId, "canvas"),
    prepareMapAssets,
  };
}

const buildVaultBackupDelta: NonNullable<
  CloudBackupDeps["buildDelta"]
> = async (vaultId, changes, uploadedAssetIds, signal, prepareMapAssets) =>
  buildCloudBackupDelta(
    vault.vaultName || "Vault",
    changes,
    deltaDeps(uploadedAssetIds, signal),
    await wholeContent(vaultId, prepareMapAssets),
  );

const buildMemberDelta: NonNullable<
  CloudBackupDeps["buildEditorDelta"]
> = async (vaultId, changes, uploadedAssetIds, signal, prepareMapAssets) =>
  buildCloudBackupEditorDelta(
    vault.vaultName || "Vault",
    changes,
    deltaDeps(uploadedAssetIds, signal),
    await wholeContent(vaultId, prepareMapAssets),
  );

const MIME_BY_EXTENSION: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  avif: "image/avif",
};

/** Plain JSON copy of an entity in the form the delta builder uploads. */
async function readLocalForMerge(
  vaultId: string,
  ids: readonly string[] | null,
): Promise<Record<string, MergeEntity>> {
  assertActiveVault(vaultId);
  const local: Record<string, MergeEntity> = {};
  for (const id of ids ?? Object.keys(vault.entities ?? {})) {
    const current = vault.entities?.[id];
    if (!current) continue;
    // A body that cannot be read must fail the pull: merging a preview as if
    // it were the entity would look like a local edit.
    const full = vault.isContentLoaded(id)
      ? current
      : await vault.readFullEntity(id);
    assertActiveVault(vaultId);
    if (!full) throw new Error(`Could not read ${id} for the merge.`);
    local[id] = JSON.parse(
      JSON.stringify(omitArtworkForBackup(full as never)),
    ) as MergeEntity;
  }
  return local;
}

function assertActiveVault(vaultId: string): void {
  if (vault.activeVaultId !== vaultId) throw new Error("The vault changed.");
}

/** The fields to write for a merged entity; fields it lacks are removed. */
function mergedFields(merged: MergeEntity): Record<string, unknown> {
  const local = vault.entities?.[merged.id] as Record<string, unknown>;
  const fields: Record<string, unknown> = { ...merged };
  delete fields.id;
  for (const key of Object.keys(local ?? {})) {
    if (key !== "id" && !key.startsWith("_") && !(key in merged)) {
      fields[key] = undefined;
    }
  }
  return fields;
}

const applyPulledChanges: NonNullable<
  NonNullable<CloudBackupDeps["remote"]>["apply"]
> = async (vaultId, { updates, creates, deletes }) => {
  for (const merged of updates) {
    assertActiveVault(vaultId);
    const done = await vault.updateEntity(merged.id, mergedFields(merged));
    assertActiveVault(vaultId);
    if (!done) throw new Error(`Could not update ${merged.id}.`);
  }
  if (creates.length > 0) {
    assertActiveVault(vaultId);
    await vault.batchCreateEntities(
      creates.map(({ _path: _omitted, ...entity }) => entity as never),
    );
    assertActiveVault(vaultId);
  }
  if (deletes.length > 0) {
    assertActiveVault(vaultId);
    const result = await vault.bulkDelete(deletes, vaultId);
    assertActiveVault(vaultId);
    if (result.failedIds.length > 0) {
      throw new Error("Could not delete every removed entity.");
    }
  }
};

async function vaultHasFile(vaultId: string, path: string): Promise<boolean> {
  const root = await vault.getSpecificVaultHandle(vaultId);
  if (!root) return false;
  try {
    await readOpfsBlob(path.split("/").filter(Boolean), root);
    return true;
  } catch {
    return false;
  }
}

/** Vault-owned image paths the pulled entities point at. */
function pulledImagePaths(entities: readonly MergeEntity[]): string[] {
  const paths = new Set<string>();
  for (const entity of entities) {
    for (const path of [entity.image, entity.thumbnail]) {
      if (
        typeof path === "string" &&
        isLocalAssetPath(path) &&
        isSafeRestoredAssetPath(path) &&
        !isPrivateArtworkSnapshotPath(path)
      ) {
        paths.add(path);
      }
    }
  }
  return [...paths];
}

/** Stores one downloaded image; returns its SHA-256 by asset id. */
async function storePulledImage(
  vaultId: string,
  path: string,
  bytes: Uint8Array,
): Promise<[string, string]> {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  await createCloudBackupRestore().importAsset!(
    path,
    bytes,
    MIME_BY_EXTENSION[extension] ?? "application/octet-stream",
    vaultId,
  );
  return [assetIdForPath(path), await sha256Hex(bytes)];
}

const ensurePulledAssets: NonNullable<
  NonNullable<CloudBackupDeps["remote"]>["ensureAssets"]
> = async (vaultId, entities, download) => {
  const hashes: Record<string, string> = {};
  for (const path of pulledImagePaths(entities)) {
    try {
      assertActiveVault(vaultId);
      if (await vaultHasFile(vaultId, path)) continue;
      assertActiveVault(vaultId);
      const bytes = await download(assetIdForPath(path));
      assertActiveVault(vaultId);
      if (!bytes) continue;
      const [assetId, hash] = await storePulledImage(vaultId, path, bytes);
      assertActiveVault(vaultId);
      hashes[assetId] = hash;
    } catch (error) {
      console.warn("[CloudBackup] Could not store a pulled image", error);
    }
  }
  return hashes;
};

const mimeOf = (path: string) =>
  MIME_BY_EXTENSION[path.split(".").pop()?.toLowerCase() ?? ""] ??
  "application/octet-stream";

/** One vault-owned file's bytes, read from the vault itself rather than a cached URL. */
const readLocalFile: NonNullable<CloudBackupDeps["readLocalFile"]> = async (
  vaultId,
  path,
) => {
  if (!isMapMediaPath(path)) return null;
  const root = await vault.getSpecificVaultHandle(vaultId);
  if (!root) return null;
  try {
    const blob = await readOpfsBlob(path.split("/").filter(Boolean), root);
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      mimeType: blob.type || mimeOf(path),
    };
  } catch {
    return null;
  }
};

/** Plain copies of the local maps or canvases, as the delta builder reads them. */
async function readLocalWhole(
  vaultId: string,
  kind: WholeKind,
  ids: readonly string[] | null,
): Promise<Record<string, WholeItem>> {
  assertActiveVault(vaultId);
  const source: Record<string, unknown> =
    kind === "map" ? mapRegistry.maps : canvasRegistry.canvases;
  const local: Record<string, WholeItem> = {};
  for (const id of ids ?? Object.keys(source)) {
    if (source[id]) local[id] = JSON.parse(JSON.stringify(source[id]));
  }
  return local;
}

const extensionOf = (path: string) =>
  /\.[a-z0-9]+$/i.exec(path)?.[0] ?? ".webp";

/** Copies a map's local file to a new path; a file that is not there is skipped. */
async function copyVaultFile(
  vaultId: string,
  from: string,
  to: string,
): Promise<void> {
  if (!isMapMediaPath(from) || !isMapMediaPath(to)) return;
  const file = await readLocalFile(vaultId, from);
  const root = await vault.getSpecificVaultHandle(vaultId);
  if (!file || !root) return;
  await writeOpfsFile(
    to.split("/"),
    new Blob([file.bytes as BlobPart], { type: file.mimeType }),
    root,
    vaultId,
  );
}

/** A keep-both copy of a map gets its own background and mask files. */
async function withOwnMapFiles(
  vaultId: string,
  copy: WholeItem,
): Promise<WholeItem> {
  const map = copy as unknown as {
    id: string;
    assetPath: string;
    fogOfWar?: { maskPath: string };
  };
  const next = { ...map };
  if (isLocalAssetPath(map.assetPath)) {
    next.assetPath = `maps/${map.id}${extensionOf(map.assetPath)}`;
    await copyVaultFile(vaultId, map.assetPath, next.assetPath);
  }
  if (map.fogOfWar && isLocalAssetPath(map.fogOfWar.maskPath)) {
    const maskPath = `maps/${map.id}_mask.png`;
    await copyVaultFile(vaultId, map.fogOfWar.maskPath, maskPath);
    next.fogOfWar = { ...map.fogOfWar, maskPath };
  }
  return next as unknown as WholeItem;
}

/** Downloads and stores one map file; returns its asset id and hash (null when it failed). */
async function storeMapFile(
  vaultId: string,
  path: string,
  write: PulledWholeChanges["writes"][number],
  download: AssetDownload,
): Promise<{ assetId: string; hash: string | null }> {
  const listed = write.assets?.find((asset) => asset.path === path);
  const assetId = listed?.assetId ?? assetIdForPath(path);
  try {
    assertActiveVault(vaultId);
    const bytes = await download(assetId);
    assertActiveVault(vaultId);
    if (!bytes) return { assetId, hash: null };
    await createCloudBackupRestore().importAsset!(
      path,
      bytes,
      listed?.mimeType || mimeOf(path),
      vaultId,
    );
    return { assetId, hash: await sha256Hex(bytes) };
  } catch (error) {
    console.warn("[CloudBackup] Could not store a pulled map file", error);
    return { assetId, hash: null };
  }
}

/**
 * Downloads a received map's background and mask over the local files, by the
 * ids its commit recorded (or the path-derived ones for an older commit).
 */
async function storeMapFiles(
  vaultId: string,
  write: PulledWholeChanges["writes"][number],
  download: AssetDownload,
  outcome: { hashes: Record<string, string>; failed: string[] },
): Promise<void> {
  const paths = collectAssetPaths([], [write.item]).filter(
    (path) => isMapMediaPath(path) && !isPrivateArtworkSnapshotPath(path),
  );
  for (const path of paths) {
    const { assetId, hash } = await storeMapFile(
      vaultId,
      path,
      write,
      download,
    );
    if (hash) outcome.hashes[assetId] = hash;
    else outcome.failed.push(assetId);
  }
}

/** A received map must be a valid map whose own files are map media, never other vault files. */
const isReceivableMap = (item: WholeItem): boolean =>
  MapSchema.safeParse(item).success &&
  hasSafeMapPaths(item as Parameters<typeof hasSafeMapPaths>[0]);

async function applyMapChanges(
  vaultId: string,
  changes: PulledWholeChanges,
  download: AssetDownload,
) {
  const outcome = {
    hashes: {} as Record<string, string>,
    failed: [] as string[],
  };
  const maps = { ...mapRegistry.maps } as Record<string, unknown>;
  // Copies first: they move the local files before the received ones land.
  for (const { copy } of changes.copies) {
    if (!isReceivableMap(copy)) {
      outcome.failed.push(copy.id);
      continue;
    }
    const own = await withOwnMapFiles(vaultId, copy);
    maps[own.id] = own;
  }
  for (const write of changes.writes) {
    if (!isReceivableMap(write.item)) {
      outcome.failed.push(write.item.id);
      continue;
    }
    await storeMapFiles(vaultId, write, download, outcome);
    maps[write.item.id] = write.item;
  }
  assertActiveVault(vaultId);
  mapRegistry.maps = maps as typeof mapRegistry.maps;
  if (changes.copies.length + changes.writes.length > 0) {
    await mapRegistry.saveMaps();
  }
  for (const id of changes.deletes) {
    assertActiveVault(vaultId);
    await mapRegistry.deleteMap(id);
  }
  return outcome;
}

/** A canvas copy's slug, unique among the canvases. */
function uniqueSlug(name: string, id: string): string {
  const slug = toRouteSlug(name) || id.slice(0, 8);
  const taken = Object.values(canvasRegistry.canvases).some(
    (canvas) => canvas.slug === slug && canvas.id !== id,
  );
  return taken ? `${slug}-${id.slice(0, 4)}` : slug;
}

async function applyCanvasChanges(
  vaultId: string,
  changes: PulledWholeChanges,
) {
  const outcome = {
    hashes: {} as Record<string, string>,
    failed: [] as string[],
  };
  const canvases = { ...canvasRegistry.canvases };
  const saved: string[] = [];
  for (const { copy } of changes.copies) {
    const parsed = CanvasSchema.safeParse({
      ...copy,
      slug: uniqueSlug(copy.name, copy.id),
    });
    if (parsed.success) {
      canvases[copy.id] = parsed.data;
      saved.push(copy.id);
    } else outcome.failed.push(copy.id);
  }
  for (const { item } of changes.writes) {
    const parsed = CanvasSchema.safeParse(item);
    if (parsed.success) {
      canvases[item.id] = parsed.data;
      saved.push(item.id);
    } else outcome.failed.push(item.id);
  }
  const root = await vault.getSpecificVaultHandle(vaultId);
  for (const id of changes.deletes) {
    assertActiveVault(vaultId);
    if (root) await deleteCanvasFromDisk(root, id);
    delete canvases[id];
  }
  assertActiveVault(vaultId);
  canvasRegistry.canvases = canvases;
  for (const id of saved) {
    await canvasRegistry.saveCanvas(id, { explicitVaultId: vaultId });
  }
  return outcome;
}

const applyWholeChanges: NonNullable<
  NonNullable<CloudBackupDeps["remote"]>["applyWhole"]
> = (vaultId, kind, changes, download) =>
  kind === "map"
    ? applyMapChanges(vaultId, changes, download)
    : applyCanvasChanges(vaultId, changes);

/** Whether the map or canvas is on screen; a pulled change waits until it is closed. */
function isWholeOpen(kind: WholeKind, id: string): boolean {
  const path = globalThis.location?.pathname ?? "";
  if (kind === "map") {
    return mapStore.activeMapId === id && path.startsWith("/map");
  }
  const slug = canvasRegistry.canvases[id]?.slug;
  return !!slug && path.startsWith(`/canvas/${slug}`);
}

/** Another device's changes: how they are read, merged and written locally. */
const remote: NonNullable<CloudBackupDeps["remote"]> = {
  readLocal: readLocalForMerge,
  apply: applyPulledChanges,
  ensureAssets: ensurePulledAssets,
  readLocalWhole,
  applyWhole: applyWholeChanges,
  isWholeOpen,
  isEditing: (id) => entityEditingRegistry.isEditing(id),
  onEditingReleased: (listener) =>
    entityEditingRegistry.onAllReleased(listener),
  newId: () => {
    let id: string;
    do id = `copy-${systemIdGenerator.uuid()}`;
    while (vault.entities?.[id]);
    return id;
  },
  newWholeId: () => {
    let id: string;
    do id = systemIdGenerator.uuid();
    while (mapRegistry.maps[id] || canvasRegistry.canvases[id]);
    return id;
  },
};

function createCloudBackupRuntime(): CloudBackupRuntime {
  return {
    // An empty base URL resolves `/api/cloud-backup/*` against the page
    // origin, and codexcryptica.com is static Pages with no `/api` — every
    // enable POST came back 405. Fall back to the deployed worker the way
    // every other proxy consumer does.
    baseUrl: resolveOracleProxyUrl(),
    storage: cloudBackupBrowserStorage(),
    fetch: ((url: string, init?: any) => fetch(url, init)) as never,
    deviceId: () => sharedVaultIdentity.deviceId(),
    displayName: () => sharedVaultIdentity.displayName(),
  };
}

/** The join flow on real stores, for the `/join` page. */
export function createSharedVaultJoin(): SharedVaultJoin {
  return new SharedVaultJoin({
    runtime: createCloudBackupRuntime(),
    restore: createCloudBackupRestore(),
    vaultExists: async (vaultId) =>
      (await vaultRegistry.listVaults()).some(
        (record) => record.id === vaultId,
      ),
    deleteVault: (vaultId) => vault.deleteVault(vaultId),
    switchVault: (vaultId) => vault.switchVault(vaultId),
    base,
    dirty,
    storage: browserStorage,
    identity: sharedVaultIdentity,
    hydrate: (vaultId) => cloudBackupStore.hydrate(vaultId),
  });
}

export function configureCloudBackup(): void {
  // Cloud Backup stays inert until a vault opts in; configuring it only wires
  // the dependencies it would need (spec 162).
  cloudBackupStore.configure({
    runtime: createCloudBackupRuntime(),
    dirty,
    base,
    // A previously consented backup remains protected if the UI flag changes.
    artworkScope: artworkRuntime.scope,
    ...(import.meta.env.VITE_ADVENTURE_ARTWORK === "true"
      ? {
          artworkConsent: artworkRuntime.consent,
        }
      : {}),
    timing: timeCloudBackupSave,
    // Everything the consent screen promises: entities, maps, canvases,
    // session journals, and the media the first three reference.
    buildPayload: buildVaultBackupPayload,
    // Incremental uploads (#3354): only the recorded changes are read.
    buildDelta: buildVaultBackupDelta,
    buildEditorDelta: buildMemberDelta,
    readLocalFile,
    notify: (message) => notificationStore.notify(message, "info"),
    displayName: () => sharedVaultIdentity.displayName(),
    notifyDeletes: (vaultId, tombstones) =>
      notificationStore.notify(deleteNoticeText(tombstones), "info", false, {
        label: "Undo",
        run: () =>
          void cloudBackupStore.trash.restore(
            vaultId,
            tombstones.map((tombstone) => tombstone.id),
          ),
      }),
    remote,
    listLocalEntities: () =>
      Object.values(vault.entities ?? {}).map((entity) => ({
        id: entity.id,
        loaded: vault.isContentLoaded(entity.id),
        entity,
      })),
    activeVaultId: () => vault.activeVaultId ?? null,
    restore: createCloudBackupRestore(),
  });
  adventureSessionRepository.setChangeListener(async (vaultId) => {
    let enabled = true;
    try {
      enabled = (await artworkRuntime.consent.read(vaultId)).enabled;
    } catch {
      // A full backup is safer than losing a change when consent cannot be read.
    }
    if (enabled) await cloudBackupStore.recordLocalChange(vaultId);
  });
}
