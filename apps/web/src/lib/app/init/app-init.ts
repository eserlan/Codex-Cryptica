import { browser } from "$app/env";
import "../event-registrations";
import { debugStore } from "../../stores/debug.svelte";
import { IS_STAGING } from "../../config";
import { resolveOracleProxyUrl } from "../../config/oracle-proxy";
import type { CloudBackupTiming } from "@codex/cloud-backup-sync";

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
import { requestPersistentStorage } from "#lib/utils/persistent-storage.js";
import { initOracleEventListeners } from "../../listeners/oracle-events";
import { initSessionJournalCapture } from "../../listeners/session-journal-events";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { configureAIEngine } from "@codex/ai-engine";
import { preloadGraphCore } from "graph-engine";
import { searchService } from "@codex/search-orchestrator";
import {
  browserPerformanceCapture,
  browserPerformanceRecorder,
} from "#lib/services/performance/browser-performance-capture.js";
import { entityTemplateStore } from "../../stores/entity-templates/entity-template-store.svelte";
import { registerFlushSavesOnHide } from "./flush-saves-on-hide";
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
import { onDurableVaultChange } from "#lib/stores/vault/registry.js";
import { vaultEventBus } from "#lib/stores/vault/events.svelte.js";
import { CloudBackupDirtyStore } from "#lib/stores/cloud-backup-dirty.js";
import { writeOpfsFile } from "#lib/utils/opfs.js";
import {
  handleVersionSkewReload,
  isVersionSkewError,
} from "../../../hooks.client";

/**
 * Core system bootstrapping.
 * Initializes all heavy stores required for the workspace.
 */
export function bootSystem(stores: {
  categories: any;
  vault: any;
  sessionModeStore: any;
}): boolean {
  debugStore.log("System booting: Initializing core stores...");
  browserPerformanceCapture.start();
  // Fetched alongside the vault load instead of after it; a failure here is
  // retried when the graph is actually created.
  void preloadGraphCore().catch(() => {});
  searchService.setPerformanceRecorder(browserPerformanceRecorder);
  configureAIEngine({
    searchService,
    templateResolver: (type, themeId) =>
      entityTemplateStore.resolveSync(type, themeId),
  });
  stores.categories.init();

  // Initialize staging state
  stores.sessionModeStore.isStaging = IS_STAGING;

  stores.vault.init().catch((error: any) => {
    console.error("Vault initialization failed", error);
  });

  return true;
}

/**
 * Sets up global error and rejection handlers.
 * Returns a cleanup function.
 */
export function initializeGlobalListeners(_calendarStore?: any) {
  if (!browser) return () => {};

  // OPFS and IndexedDB share one evictable origin bucket unless we ask for a
  // persistence grant, which nothing did until #2619.
  void requestPersistentStorage();

  // Initialize Oracle action listeners
  const unsubOracle: () => void = initOracleEventListeners();
  // Rolls, draws and table results go into the active Session Journal.
  const unsubJournalCapture: () => void = initSessionJournalCapture();

  const handleGlobalError = (event: ErrorEvent) => {
    if (
      event.target instanceof HTMLScriptElement ||
      event.target instanceof HTMLLinkElement
    ) {
      const src =
        (event.target as HTMLScriptElement).src ||
        (event.target as HTMLLinkElement).href ||
        "";
      if (src.includes("/_app/immutable/")) {
        console.warn("[VersionSkew] Failed to load immutable asset:", src);
        handleVersionSkewReload();
        return;
      }
      return;
    }

    const message = event.message || "";
    if (isVersionSkewError(event.error || message)) {
      console.warn(
        "[VersionSkew] Dynamic import error detected in handleGlobalError:",
        message,
      );
      handleVersionSkewReload();
      return;
    }

    if (
      message.includes("Script error") ||
      message.includes("Load failed") ||
      message.includes("isHeadless") ||
      message.includes("notify") ||
      message.includes("INTERNET_DISCONNECTED") ||
      message.includes("Failed to fetch") ||
      message.includes("NetworkError") ||
      message.includes("higher version than the version requested") ||
      message.includes("VersionError") ||
      message.includes(
        "ResizeObserver loop completed with delivered notifications",
      ) ||
      message.includes(
        "ResizeObserver loop completed with undelivered notifications",
      )
    ) {
      return;
    }

    console.error("[Fatal Error MSG]", event.message, event.error?.stack);
    notificationStore.setGlobalError(event.message, event.error?.stack);
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = reason?.message || String(reason || "");

    if (isVersionSkewError(reason || message)) {
      console.warn(
        "[VersionSkew] Dynamic import unhandled rejection:",
        message,
      );
      handleVersionSkewReload();
      return;
    }

    if (
      message.includes("Failed to fetch") ||
      message.includes("NetworkError") ||
      message.includes("Load failed") ||
      message.includes("INTERNET_DISCONNECTED") ||
      message.includes("higher version than the version requested") ||
      message.includes("VersionError")
    ) {
      return;
    }

    if (
      reason instanceof TypeError &&
      reason.message.includes("reading 'default'")
    ) {
      return;
    }

    console.error("[Fatal Rejection]", event);
    notificationStore.setGlobalError(
      message || "Unhandled Promise Rejection",
      reason?.stack,
    );
  };

  // The vault's game-system profile (#3943) sets generator and sheet defaults.
  const initSystemProfile = async () => {
    try {
      const { systemProfileStore } =
        await import("#lib/stores/system-profile.svelte.js");
      await systemProfileStore.init(vault.activeVaultId);
    } catch (err) {
      console.error(
        "[AppInit] Failed to load the vault's game system profile:",
        err,
      );
    }
  };

  const handleVaultSwitched = async () => {
    void initSystemProfile();
    try {
      const { calendarStore } = await import("#lib/stores/calendar.svelte.js");
      const { timelineStore } = await import("#lib/stores/timeline.svelte.js");
      await calendarStore.init();
      timelineStore.resetVaultGuard();
      void timelineStore.init();
    } catch (err) {
      console.error(
        "[AppInit] Failed to initialize calendar store on vault switch:",
        err,
      );
    }
  };

  window.addEventListener("error", handleGlobalError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  window.addEventListener("vault-switched", handleVaultSwitched);

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
    buildPayload: async (vaultId: string, signal?: AbortSignal) => {
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
          hydrateEntities: {
            isContentLoaded: (id: string) => vault.isContentLoaded(id),
            readFullEntity: (id: string) => vault.readFullEntity(id),
          },
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
    },
    // Incremental uploads (#3354): only the recorded changes are read.
    buildDelta: async (_vaultId, changes, uploadedAssetIds, signal) =>
      buildCloudBackupDelta(
        vault.vaultName || "Vault",
        changes,
        {
          // Same boundary widening as the full payload above: the store's
          // record is structurally compatible but not nominally LocalEntity.
          getEntity: (id: string) => vault.entities?.[id] as never,
          hydrateEntities: {
            isContentLoaded: (id: string) => vault.isContentLoaded(id),
            readFullEntity: (id: string) => vault.readFullEntity(id),
          },
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
      ),
    listLocalEntities: () =>
      Object.values(vault.entities ?? {}).map((entity) => ({
        id: entity.id,
        loaded: vault.isContentLoaded(entity.id),
        entity,
      })),
    activeVaultId: () => vault.activeVaultId ?? null,
    restore: {
      createVault: (name: string) => vault.createVault(name),
      // `createVault` switches to the new vault before this runs, so these
      // writes land there rather than in whatever the user had open.
      importEntities: async (_vaultId: string, entities: unknown[]) => {
        await vault.batchCreateEntities(entities as never[]);
      },
      importMaps: async (_vaultId: string, maps: unknown[]) => {
        for (const map of maps as { id?: string }[]) {
          if (map?.id) mapRegistry.maps[map.id] = map as never;
        }
        await mapRegistry.saveMaps();
      },
      importCanvases: async (_vaultId: string, canvases: unknown[]) => {
        for (const canvas of canvases as { id?: string }[]) {
          if (!canvas?.id) continue;
          canvasRegistry.canvases[canvas.id] = canvas as never;
          await canvasRegistry.saveCanvas(canvas.id);
        }
      },
      /**
       * Writes restored session journals directly into IndexedDB rather than
       * through the store (spec 163-session-journal, FR-016) — a restore
       * happens once at import time, not through the store's own
       * start/append/end lifecycle, and `vaultId` on each record is
       * rewritten to the *new* vault this restore just created, never the
       * backup's original vault id.
       */
      importSessionJournals: async (vaultId: string, journals: unknown[]) => {
        const db = await getDB();
        for (const journal of journals as { id?: string }[]) {
          if (!journal?.id) continue;
          await db.put("session_journals", { ...journal, vaultId } as never);
        }
      },
      /**
       * Writes a restored file back at the exact path it came from.
       *
       * Not `saveImageToVault`: that renames to `images/<name>.webp` and
       * re-encodes to WebP, so entities and maps would point at paths that do
       * not exist, and a fog-of-war mask — binary data, not a picture — would
       * be destroyed by the conversion. A backup is a copy, so the bytes go
       * back byte-for-byte where they were.
       */
      importAsset: async (
        path: string,
        bytes: Uint8Array,
        mimeType: string,
      ) => {
        const root = await vault.getActiveVaultHandle();
        if (!root) throw new Error("No vault is open to restore into.");
        const segments = path.split("/").filter(Boolean);
        if (segments.length === 0) return;
        await writeOpfsFile(
          segments,
          new Blob([bytes as unknown as BlobPart], { type: mimeType }),
          root,
          vault.activeVaultId ?? undefined,
        );
      },
    },
  });

  // Read any existing opt-in back so a reload shows the vault's real backup
  // state rather than "off" and a fresh consent prompt (spec 162, FR-020).
  const hydrateCloudBackup = () => {
    const activeVaultId = vault.activeVaultId;
    if (activeVaultId) void cloudBackupStore.hydrate(activeVaultId);
  };
  hydrateCloudBackup();
  window.addEventListener("vault-switched", hydrateCloudBackup);

  // Debounced entity writes are otherwise lost if the app closes inside the
  // debounce window — see #2584.
  const unsubFlushSaves = registerFlushSavesOnHide({
    flushPendingSaves: () => vault.flushPendingSaves(),
  });

  // Automatic cloud backup (#3189): durable writes schedule a debounced
  // guarded push, and lifecycle events flush it. The subscription lives for
  // the app lifetime; the store itself stays inert while backup is off.
  // Each write also records what it touched (#3354), so a push can send only
  // the changes. Files re-read from disk join the next upload without
  // scheduling one on their own.
  const unsubDurableChanges = onDurableVaultChange((changedVaultId, change) => {
    void cloudBackupStore.recordLocalChange(changedVaultId, change);
  });
  const unsubSyncedChanges = vaultEventBus.subscribe((event) => {
    if (event.type !== "SYNC_CHUNK_READY") return;
    void cloudBackupStore.recordLocalChange(
      event.vaultId,
      { kind: "entity", ids: event.newOrChangedIds },
      { schedule: false },
    );
  }, "cloud-backup-sync-chunks");
  cloudBackupStore.startAutoSyncListeners();

  return () => {
    unsubOracle();
    unsubJournalCapture();
    unsubFlushSaves();
    unsubDurableChanges();
    unsubSyncedChanges();
    window.removeEventListener("vault-switched", hydrateCloudBackup);
    cloudBackupStore.destroy();
    window.removeEventListener("error", handleGlobalError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    window.removeEventListener("vault-switched", handleVaultSwitched);
  };
}

export { setupWindowGlobals } from "./window-globals";

export {
  collectVaultShellUrls,
  registerServiceWorker,
  type VaultServiceWorkerSession,
} from "./service-worker";
