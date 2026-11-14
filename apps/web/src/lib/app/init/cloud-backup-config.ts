import type { CloudBackupDeps } from "#lib/stores/cloud-backup-types.js";
import {
  sha256Hex,
  type CloudBackupTiming,
  type MergeEntity,
} from "@codex/cloud-backup-sync";
import { resolveOracleProxyUrl } from "../../config/oracle-proxy";
import { vault } from "#lib/stores/vault.svelte.js";
import { mapRegistry } from "#lib/stores/map-registry.svelte.js";
import { canvasRegistry } from "#lib/stores/canvas-registry.svelte.js";
import { getDB } from "#lib/utils/idb.js";
import {
  cloudBackupStore,
  cloudBackupBrowserStorage,
} from "#lib/stores/cloud-backup.svelte.js";
import {
  assetIdForPath,
  buildCloudBackupDelta,
  buildCloudBackupPayload,
  collectAssetPaths,
  isLocalAssetPath,
} from "#lib/services/cloud-backup-payload.js";
import { CloudBackupBaseStore } from "#lib/stores/cloud-backup-base.js";
import { CloudBackupDirtyStore } from "#lib/stores/cloud-backup-dirty.js";
import { createCloudBackupRestore } from "./cloud-backup-restore";
import { createArtworkBackupRuntime } from "#lib/stores/cloud-backup-artwork-runtime.js";
import {
  AdventureSessionRepository,
  adventureSessionRepository,
} from "#lib/services/adventure/adventure-session-repository.js";
import { systemIdGenerator } from "#lib/utils/runtime-deps.js";
import { isPrivateArtworkSnapshotPath } from "schema";
import { omitArtworkForBackup } from "#lib/services/cloud-backup-artwork.js";
import { isSafeRestoredAssetPath } from "#lib/services/cloud-backup-restore-path.js";
import { entityEditingRegistry } from "#lib/stores/entity-editing-registry.js";
import { readOpfsBlob } from "#lib/utils/opfs.js";

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

const buildVaultBackupDelta: NonNullable<
  CloudBackupDeps["buildDelta"]
> = async (_vaultId, changes, uploadedAssetIds, signal) =>
  buildCloudBackupDelta(
    vault.vaultName || "Vault",
    changes,
    {
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
    },
    {
      maps: mapRegistry.allMaps ?? [],
      canvases: canvasRegistry.allCanvases ?? [],
    },
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
    const result = await vault.bulkDelete(deletes);
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

/** Another device's changes: how they are read, merged and written locally. */
const remote: NonNullable<CloudBackupDeps["remote"]> = {
  readLocal: readLocalForMerge,
  apply: applyPulledChanges,
  ensureAssets: ensurePulledAssets,
  isEditing: (id) => entityEditingRegistry.isEditing(id),
  onEditingReleased: (listener) =>
    entityEditingRegistry.onAllReleased(listener),
  newId: () => {
    let id: string;
    do id = `copy-${systemIdGenerator.uuid()}`;
    while (vault.entities?.[id]);
    return id;
  },
};

export function configureCloudBackup(): void {
  // Cloud Backup stays inert until a vault opts in; configuring it only wires
  // the dependencies it would need (spec 162).
  cloudBackupStore.configure({
    runtime: {
      // An empty base URL resolves `/api/cloud-backup/*` against the page
      // origin, and codexcryptica.com is static Pages with no `/api` — every
      // enable POST came back 405. Fall back to the deployed worker the way
      // every other proxy consumer does.
      baseUrl: resolveOracleProxyUrl(),
      storage: cloudBackupBrowserStorage(),
      fetch: ((url: string, init?: any) => fetch(url, init)) as never,
    },
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
