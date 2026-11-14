import type { LocalEntity } from "#lib/stores/vault/types.js";
import type { CloudBackupTiming } from "@codex/cloud-backup-sync";

import { systemClock, type Clock } from "../utils/runtime-deps";
import {
  collectArtworkBackup,
  omitArtworkForBackup,
  omitPrivateMapArtwork,
} from "./cloud-backup-artwork";

/** Monotonic clock for stage timings; counts, bytes and ms only, never content. */
function nowMs(clock: Clock = systemClock): number {
  // Try to use performance.now() if clock is systemClock and performance is available,
  // else fallback to clock.now() which allows test injections.
  if (clock === systemClock && typeof performance !== "undefined") {
    return performance.now();
  }
  return clock.now();
}

/**
 * Builds the whole-vault snapshot that Cloud Backup uploads (spec 162).
 *
 * The consent screen promises "entities, labels, notes and media", so this has
 * to actually collect the media — entities alone would restore a vault whose
 * images are all broken, which is a promise the trust contract does not survive.
 *
 * Asset resolution follows `PublishingService`, extended with the fog-of-war
 * mask: an entity's `image` and `thumbnail`, a map's `assetPath`, and a map's
 * `fogOfWar.maskPath`.
 * Local paths are turned into blobs through the vault's own image resolver and
 * kept as raw bytes for individual upload. Remote URLs (`http:`, `data:`,
 * `blob:`) are left alone — they are references, not vault-owned files.
 *
 * Pure aside from the injected resolver, so the size accounting and the
 * skip-and-continue behaviour can be tested without a vault.
 */

export interface CloudBackupPayloadDeps {
  clock?: Clock;
  /** Resolves a vault-relative path to a fetchable URL, as the vault store does. */
  resolveImageUrl: (path: string) => Promise<string | null | undefined>;
  fetch?: typeof fetch;
  digestSnapshot?: (bytes: Uint8Array) => Promise<string>;
  /** Present only after the owner explicitly opts in to expanded backup. */
  adventureInclusion?: {
    consented: true;
    readAdventures: Parameters<typeof collectArtworkBackup>[2];
  };
  /**
   * Loads an entity's full markdown body. Required for a faithful backup:
   * without it the snapshot stores whatever `content` happens to be in memory,
   * which for a warm start is a 280-character preview, not the lore.
   */
  hydrateEntities?: EntityHydrator;
  /** Stops entity reads and asset fetches once backup is disabled mid-build. */
  signal?: AbortSignal;
  /** Stage timings for the worker-or-not question; same pattern as `onProgress`. */
  onTiming?: (timing: CloudBackupTiming) => void;
}

/**
 * The vault's content reader, narrowed to what a backup needs.
 *
 * `vault.entities[id].content` is only the real markdown once the entity has
 * been hydrated; before that a warm start seeds it from the IndexedDB cache
 * with `contentPreview` — whitespace-collapsed and cut at 280 characters. A
 * snapshot of the live map therefore captures full lore for whatever the user
 * happened to open this session and a stub for everything else.
 *
 * Reads go straight into the snapshot, never through the live store: loading
 * a whole vault into reactive records wakes every consumer of them once per
 * entity and pinned a large vault's CPU for minutes (#3350).
 */
export interface EntityHydrator {
  isContentLoaded: (id: string) => boolean;
  /** Full entity from source, `null` when it has no body, throws on a failed read. */
  readFullEntity: (id: string) => Promise<LocalEntity | null>;
}

/** Entity loads in flight at once. Bounded so a large vault cannot stampede OPFS. */
const HYDRATION_CONCURRENCY = 8;

export interface CloudBackupPayloadResult {
  vaultTitle: string;
  bundle: {
    schemaVersion: number;
    entities: LocalEntity[];
    maps: unknown[];
    canvases: unknown[];
    /** Session Journal (spec 163-session-journal, FR-016) — the GM's own
     *  private play log, never included in a player-facing/guest export. */
    sessionJournals: unknown[];
    adventures?: readonly unknown[];
    assetManifest: { assetId: string; path: string; mimeType: string }[];
  };
  /** Raw bytes per file. Uploaded one request each, never inlined in JSON. */
  assets: { assetId: string; bytes: Uint8Array; mimeType: string }[];
  /** Paths that could not be read; surfaced so a partial backup is never silent. */
  skippedAssets: string[];
  /** Entities whose body could not be hydrated, for the same reason. */
  skippedEntities: string[];
}

/** Vault-owned file, as opposed to an external reference. */
export function isLocalAssetPath(path: string): boolean {
  if (!path) return false;
  return !/^(data:|blob:|https?:)/i.test(path.trim());
}

/** Stable, filesystem-safe id for an asset path. Mirrors PublishingService. */
export function assetIdForPath(path: string): string {
  return path
    .trim()
    .replace(/^(\.\/|\/)/, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_");
}

/**
 * Every distinct local asset path referenced by a vault's content.
 *
 * Four sources: an entity's `image` and its `thumbnail`, a map's `assetPath`,
 * and a map's `fogOfWar.maskPath`. All four are vault-owned files rather than
 * external references — the map registry deletes the mask alongside the
 * background when a map is removed, which is what makes it vault-owned rather
 * than derived. Omitting the background restores maps with nothing on them;
 * omitting the mask restores them with every hidden area revealed, which is
 * worse than losing the map, because it silently exposes what a GM chose to
 * keep from their players.
 */
export function collectAssetPaths(
  entities: readonly LocalEntity[],
  maps: readonly unknown[] = [],
): string[] {
  const paths = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && isLocalAssetPath(value)) paths.add(value);
  };
  for (const entity of entities) {
    add((entity as { image?: string }).image);
    add((entity as { thumbnail?: string }).thumbnail);
  }
  for (const map of maps) {
    add((map as { assetPath?: string }).assetPath);
    add((map as { fogOfWar?: { maskPath?: string } }).fogOfWar?.maskPath);
  }
  return [...paths];
}

/**
 * Replaces every entity in the list with its fully-hydrated self.
 *
 * Entities the vault has already loaded pass through untouched. The rest are
 * read from source without touching the live store, bounded so a 5k-entity
 * vault does not open five thousand OPFS reads at once. An entity that cannot
 * be read is omitted and reported, so a preview can never masquerade as a
 * complete backup.
 */
export async function hydrateEntityContent(
  entities: readonly LocalEntity[],
  hydrator: EntityHydrator,
  concurrency = HYDRATION_CONCURRENCY,
  signal?: AbortSignal,
): Promise<{ entities: LocalEntity[]; skippedEntities: string[] }> {
  const hydrated = [...entities];
  const skippedEntities: string[] = [];
  const unreadableIndexes = new Set<number>();
  const pending = hydrated
    .map((entity, index) => ({ entity, index }))
    .filter(({ entity }) => entity?.id && !hydrator.isContentLoaded(entity.id));

  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length && !signal?.aborted) {
      const { entity, index } = pending[cursor++];
      try {
        const full = await hydrator.readFullEntity(entity.id);
        if (full) {
          hydrated[index] = full;
        } else {
          skippedEntities.push(entity.id);
          unreadableIndexes.add(index);
        }
      } catch {
        skippedEntities.push(entity.id);
        unreadableIndexes.add(index);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, worker),
  );

  return {
    entities: hydrated.filter((_, index) => !unreadableIndexes.has(index)),
    skippedEntities,
  };
}

type BackupSnapshotMeta = {
  path: string;
  mime: string;
  bytes: number;
  sha256: string;
};

type BackupAsset = { assetId: string; bytes: Uint8Array; mimeType: string };
type BackupAssetManifestEntry = {
  assetId: string;
  path: string;
  mimeType: string;
};

async function sha256Hex(input: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(input));
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function hydrateEntitiesIfNeeded(
  entities: readonly LocalEntity[],
  deps: CloudBackupPayloadDeps,
): Promise<{ entities: readonly LocalEntity[]; skippedEntities: string[] }> {
  if (!deps.hydrateEntities) {
    return { entities, skippedEntities: [] };
  }
  const hydrateStartedAt = nowMs(deps.clock);
  const result = await hydrateEntityContent(
    entities,
    deps.hydrateEntities,
    HYDRATION_CONCURRENCY,
    deps.signal,
  );
  deps.onTiming?.({
    stage: "hydrate",
    durationMs: nowMs(deps.clock) - hydrateStartedAt,
    count: entities.length,
  });
  return result;
}

function resolveBackupMaps(
  rawMaps: readonly unknown[] | undefined,
  consented: boolean | undefined,
): readonly unknown[] {
  const maps = rawMaps ?? [];
  return consented ? maps : maps.map(omitPrivateMapArtwork);
}

async function verifyExpectedSnapshot(
  blob: Blob,
  bytes: Uint8Array,
  expected: BackupSnapshotMeta,
  digestSnapshot?: (input: Uint8Array) => Promise<string>,
): Promise<void> {
  const digest = digestSnapshot ?? sha256Hex;
  const actualHash = await digest(bytes);
  if (
    blob.type !== expected.mime ||
    bytes.byteLength !== expected.bytes ||
    actualHash !== expected.sha256
  ) {
    throw new Error("Invalid kept artwork snapshot");
  }
}

async function fetchAssetBytes(
  path: string,
  deps: CloudBackupPayloadDeps,
): Promise<{ blob: Blob; bytes: Uint8Array }> {
  const url = await deps.resolveImageUrl(path);
  if (!url) throw new Error("unresolved");
  const fetcher = deps.fetch ?? fetch;
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`status ${response.status}`);
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { blob, bytes };
}

async function readAssetEntry(
  path: string,
  deps: CloudBackupPayloadDeps,
  expected?: BackupSnapshotMeta,
): Promise<{
  asset: BackupAsset;
  manifest: BackupAssetManifestEntry;
  bytesLength: number;
}> {
  const { blob, bytes } = await fetchAssetBytes(path, deps);
  if (expected) {
    await verifyExpectedSnapshot(blob, bytes, expected, deps.digestSnapshot);
  }
  const assetId = assetIdForPath(path);
  const mimeType = blob.type || "application/octet-stream";
  return {
    asset: { assetId, bytes, mimeType },
    manifest: { assetId, path, mimeType },
    bytesLength: bytes.length,
  };
}

function isAssetLoopAborted(deps: CloudBackupPayloadDeps): boolean {
  if (!deps.signal?.aborted) return false;
  if (deps.adventureInclusion?.consented) throw new Error("Backup cancelled");
  return true;
}

function recordAssetReadFailure(
  path: string,
  privateSnapshots: ReadonlySet<string>,
  skippedAssets: string[],
): void {
  if (privateSnapshots.has(path)) {
    throw new Error("Could not read a kept artwork snapshot");
  }
  // One unreadable image must not cost the user their whole backup. It is
  // recorded so the caller can say what was left out rather than implying
  // a complete copy.
  skippedAssets.push(path);
}

async function collectBackupAssets(
  allPaths: ReadonlySet<string>,
  deps: CloudBackupPayloadDeps,
  privateSnapshots: ReadonlySet<string>,
  expectedSnapshots: ReadonlyMap<string, BackupSnapshotMeta>,
): Promise<{
  assets: BackupAsset[];
  assetManifest: BackupAssetManifestEntry[];
  skippedAssets: string[];
  assetBytesTotal: number;
}> {
  const assets: BackupAsset[] = [];
  const assetManifest: BackupAssetManifestEntry[] = [];
  const skippedAssets: string[] = [];
  let assetBytesTotal = 0;

  for (const path of allPaths) {
    if (isAssetLoopAborted(deps)) break;
    try {
      const entry = await readAssetEntry(
        path,
        deps,
        expectedSnapshots.get(path),
      );
      assets.push(entry.asset);
      assetManifest.push(entry.manifest);
      assetBytesTotal += entry.bytesLength;
    } catch {
      recordAssetReadFailure(path, privateSnapshots, skippedAssets);
    }
  }
  return { assets, assetManifest, skippedAssets, assetBytesTotal };
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Backup cancelled");
}

async function collectConsentedArtwork(
  entities: readonly LocalEntity[],
  deps: CloudBackupPayloadDeps,
) {
  const inclusion = deps.adventureInclusion;
  const consented = inclusion?.consented === true;
  const readAdventures = inclusion?.readAdventures ?? (async () => []);
  return collectArtworkBackup(consented, entities, readAdventures);
}

function buildBackupContentPaths(
  artwork: Awaited<ReturnType<typeof collectConsentedArtwork>>,
  maps: readonly unknown[],
) {
  const privateSnapshots = new Set(artwork.snapshotPaths);
  const expectedSnapshots = new Map(
    artwork.snapshots.map((snapshot) => [snapshot.path, snapshot]),
  );
  const allPaths = new Set([
    ...collectAssetPaths(artwork.entities, maps),
    ...privateSnapshots,
  ]);
  return { privateSnapshots, expectedSnapshots, allPaths };
}

function assemblePayloadResult(
  vaultTitle: string,
  artwork: Awaited<ReturnType<typeof collectConsentedArtwork>>,
  maps: readonly unknown[],
  content: {
    canvases?: readonly unknown[];
    sessionJournals?: readonly unknown[];
  },
  collected: Awaited<ReturnType<typeof collectBackupAssets>>,
  skippedEntities: string[],
): CloudBackupPayloadResult {
  const adventuresField = artwork.adventures
    ? { adventures: artwork.adventures }
    : {};
  return {
    vaultTitle,
    bundle: {
      schemaVersion: 1,
      entities: artwork.entities,
      maps: maps as unknown[],
      canvases: [...(content.canvases ?? [])],
      sessionJournals: [...(content.sessionJournals ?? [])],
      ...adventuresField,
      assetManifest: collected.assetManifest,
    },
    assets: collected.assets,
    skippedAssets: collected.skippedAssets,
    skippedEntities,
  };
}

export async function buildCloudBackupPayload(
  vaultTitle: string,
  // Widened at the boundary: the vault store's entity record is structurally
  // compatible but not nominally identical, and this only reads a few fields.
  entities: readonly LocalEntity[] | readonly unknown[],
  deps: CloudBackupPayloadDeps,
  content: {
    maps?: readonly unknown[];
    canvases?: readonly unknown[];
    sessionJournals?: readonly unknown[];
  } = {},
): Promise<CloudBackupPayloadResult> {
  const buildStartedAt = nowMs(deps.clock);
  // Before anything else: the snapshot must hold real markdown, not the
  // warm-start preview. Asset collection reads the hydrated list too, since
  // hydration can replace the records it scans.
  const hydrated = await hydrateEntitiesIfNeeded(
    entities as readonly LocalEntity[],
    deps,
  );
  const maps = resolveBackupMaps(
    content.maps,
    deps.adventureInclusion?.consented,
  );
  assertNotAborted(deps.signal);

  const artwork = await collectConsentedArtwork(hydrated.entities, deps);
  assertNotAborted(deps.signal);

  const { privateSnapshots, expectedSnapshots, allPaths } =
    buildBackupContentPaths(artwork, maps);
  const collected = await collectBackupAssets(
    allPaths,
    deps,
    privateSnapshots,
    expectedSnapshots,
  );
  if (deps.adventureInclusion?.consented) assertNotAborted(deps.signal);

  deps.onTiming?.({
    stage: "build",
    durationMs: nowMs(deps.clock) - buildStartedAt,
    count: hydrated.entities.length,
    bytes: collected.assetBytesTotal,
  });

  return assemblePayloadResult(
    vaultTitle,
    artwork,
    maps,
    content,
    collected,
    hydrated.skippedEntities,
  );
}

/* ---------------------------------------------------------------- delta -- */

/**
 * Past this many changed entities a full upload is simpler and no larger, and
 * it keeps a delta body well inside the worker's JSON limit.
 */
export const DELTA_MAX_ENTITIES = 200;

/** A changed item awaiting upload, as recorded by the dirty-set store. */
export interface CloudBackupChange {
  kind: "entity" | "canvas" | "maps" | "full";
  id: string;
  deleted: boolean;
}

export interface CloudBackupDeltaDeps {
  clock?: Clock;
  /** The entity as held in memory, or undefined once it no longer exists. */
  getEntity: (id: string) => LocalEntity | undefined;
  hydrateEntities: EntityHydrator;
  /** Asset ids already uploaded; a delta never carries media (see below). */
  uploadedAssetIds: ReadonlySet<string>;
  /** Current asset references across the vault, used to prune removed media. */
  referencedAssetIds: readonly string[];
  signal?: AbortSignal;
  /** Stage timings for the worker-or-not question; same pattern as `onProgress`. */
  onTiming?: (timing: CloudBackupTiming) => void;
}

export interface CloudBackupDelta {
  vaultTitle: string;
  upserts: LocalEntity[];
  deletes: string[];
  /** Full current reference set; the worker prunes assets absent from it. */
  assetIds: string[];
  maps?: unknown[];
  canvases?: unknown[];
}

/**
 * Builds an incremental upload from the recorded changes (#3354), reading only
 * the changed entities.
 *
 * Returns `null` when the change set calls for a full upload instead: a
 * `full` marker, too many changes, an entity that cannot be read, or media the
 * backup does not hold yet. A delta deliberately carries no media — image
 * changes are rare next to text edits, and a full upload already knows how to
 * rebuild the asset manifest and prune what is gone.
 */
export async function buildCloudBackupDelta(
  vaultTitle: string,
  changes: readonly CloudBackupChange[],
  deps: CloudBackupDeltaDeps,
  content: { maps?: readonly unknown[]; canvases?: readonly unknown[] } = {},
): Promise<CloudBackupDelta | null> {
  const entityChanges = changes.filter((change) => change.kind === "entity");
  if (
    changes.some((change) => change.kind === "full") ||
    entityChanges.length > DELTA_MAX_ENTITIES
  ) {
    return null;
  }

  const buildStartedAt = nowMs(deps.clock);
  const entities = await readChangedEntities(entityChanges, deps);
  if (!entities) return null;
  deps.onTiming?.({
    stage: "build",
    durationMs: nowMs(deps.clock) - buildStartedAt,
    count: entities.upserts.length + entities.deletes.length,
  });

  const maps = changes.some((change) => change.kind === "maps")
    ? (content.maps ?? []).map(omitPrivateMapArtwork)
    : undefined;
  if (referencesNewMedia(entities.upserts, maps, deps.uploadedAssetIds)) {
    return null;
  }

  return {
    vaultTitle,
    ...entities,
    assetIds: [...deps.referencedAssetIds],
    ...(maps ? { maps } : {}),
    ...(changes.some((change) => change.kind === "canvas")
      ? { canvases: [...(content.canvases ?? [])] }
      : {}),
  };
}

/**
 * What a group member may send: entity changes only, as one delta. Anything a
 * member cannot send yet is left out of `sent` and stays pending: maps and
 * canvases, entities that reference media the backup lacks or that cannot be
 * read, and entity changes beyond the delta limit. `delta` is `null` when
 * nothing can go.
 */
export async function buildCloudBackupEditorDelta<T extends CloudBackupChange>(
  vaultTitle: string,
  changes: readonly T[],
  deps: CloudBackupDeltaDeps,
): Promise<{ delta: CloudBackupDelta | null; sent: T[] }> {
  const sent: T[] = [];
  const upserts: LocalEntity[] = [];
  const deletes: string[] = [];
  const entityChanges = changes
    .filter((change) => change.kind === "entity")
    .slice(0, DELTA_MAX_ENTITIES);
  for (const change of entityChanges) {
    if (deps.signal?.aborted) return { delta: null, sent: [] };
    const current = deps.getEntity(change.id);
    if (change.deleted || !current) {
      deletes.push(change.id);
      sent.push(change);
      continue;
    }
    const full = await readFullOrNull(change.id, current, deps.hydrateEntities);
    if (!full) continue;
    const entity = omitArtworkForBackup(full);
    if (referencesNewMedia([entity], undefined, deps.uploadedAssetIds))
      continue;
    upserts.push(entity);
    sent.push(change);
  }
  if (sent.length === 0) return { delta: null, sent };
  return {
    delta: {
      vaultTitle,
      upserts,
      deletes,
      assetIds: [...deps.referencedAssetIds],
    },
    sent,
  };
}

/**
 * Splits entity changes into full records to upload and ids to delete, or
 * `null` when a read fails or the build is aborted. Tombstones and entities
 * that no longer exist are deletes; loaded bodies are used as they are.
 */
async function readChangedEntities(
  changes: readonly CloudBackupChange[],
  deps: CloudBackupDeltaDeps,
): Promise<{ upserts: LocalEntity[]; deletes: string[] } | null> {
  const upserts: LocalEntity[] = [];
  const deletes: string[] = [];
  for (const { id, deleted } of changes) {
    if (deps.signal?.aborted) return null;
    const current = deps.getEntity(id);
    if (deleted || !current) {
      deletes.push(id);
      continue;
    }
    const full = await readFullOrNull(id, current, deps.hydrateEntities);
    if (!full) return null;
    upserts.push(omitArtworkForBackup(full));
  }
  return { upserts, deletes };
}

async function readFullOrNull(
  id: string,
  current: LocalEntity,
  hydrator: EntityHydrator,
): Promise<LocalEntity | null> {
  if (hydrator.isContentLoaded(id)) return current;
  try {
    const full = await hydrator.readFullEntity(id);
    return full ?? null;
  } catch {
    return null;
  }
}

/** True when an upload would reference media the backup does not hold yet. */
function referencesNewMedia(
  entities: readonly LocalEntity[],
  maps: readonly unknown[] | undefined,
  uploaded: ReadonlySet<string>,
): boolean {
  return collectAssetPaths(entities, maps ?? []).some(
    (path) => !uploaded.has(assetIdForPath(path)),
  );
}
