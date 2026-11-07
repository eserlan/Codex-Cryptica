import type { CloudBackupDeps } from "#lib/stores/cloud-backup-types.js";
import type { CloudBackupTiming } from "@codex/cloud-backup-sync";
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
} from "#lib/services/cloud-backup-payload.js";
import { CloudBackupDirtyStore } from "#lib/stores/cloud-backup-dirty.js";
import { createCloudBackupRestore } from "./cloud-backup-restore";

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

const buildVaultBackupPayload: CloudBackupDeps["buildPayload"] = async (
  vaultId,
  signal,
) => {
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
    {
      resolveImageUrl: (path: string) => vault.resolveImageUrl(path),
      // Without this the snapshot stores whatever `content` is in memory,
      // and a warm start seeds that from the cache with a 280-character
      // preview rather than the entity's markdown.
      hydrateEntities: createEntityHydrator(),
      signal,
      onTiming: timeCloudBackupSave,
    },
    {
      maps: mapRegistry.allMaps ?? [],
      canvases: canvasRegistry.allCanvases ?? [],
      // Session journals are only part of a full backup, never a delta.
      sessionJournals: sessionJournals.sort(
        (a, b) => b.startedAt - a.startedAt,
      ),
    },
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
      ).map(assetIdForPath),
      signal,
    },
    {
      maps: mapRegistry.allMaps ?? [],
      canvases: canvasRegistry.allCanvases ?? [],
    },
  );

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
    dirty: new CloudBackupDirtyStore(),
    timing: timeCloudBackupSave,
    // Everything the consent screen promises: entities, maps, canvases,
    // session journals, and the media the first three reference.
    buildPayload: buildVaultBackupPayload,
    // Incremental uploads (#3354): only the recorded changes are read.
    buildDelta: buildVaultBackupDelta,
    listLocalEntities: () =>
      Object.values(vault.entities ?? {}).map((entity) => ({
        id: entity.id,
        loaded: vault.isContentLoaded(entity.id),
        entity,
      })),
    activeVaultId: () => vault.activeVaultId ?? null,
    restore: createCloudBackupRestore(),
  });
}
