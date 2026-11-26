import { VaultSyncState } from "./sync-state.svelte";
import {
  VaultSyncError,
  type LoadFilesOptions,
  type SyncStoreDependencies,
} from "./sync-types";
export {
  VaultSyncError,
  type LoadFilesOptions,
  type SyncStoreDependencies,
} from "./sync-types";
import { vaultEventBus } from "./events.svelte";
import type { LocalEntity } from "./types";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import { appEventBus } from "@codex/events";
import { fileIOAdapter } from "./adapters.svelte";
import { updateLastInternalChange } from "./registry";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { systemClock } from "#lib/utils/runtime-deps.js";
import {
  browserPerformanceCapture,
  browserPerformanceRecorder,
} from "#lib/services/performance/browser-performance-capture.js";
import type { PerformanceOperationHandle } from "@codex/performance-observability";

/**
 * How long the post-paint OPFS reconcile waits (#2619). Long enough to stay
 * clear of first paint and hydration, short enough that a user cannot get far
 * into editing stale data before it is corrected.
 */
const WARM_RECONCILE_DELAY_MS = 1500;

export class SyncStore {
  private state: VaultSyncState;

  private get _status() {
    return this.state.currentStatus;
  }
  private set _status(value: VaultSyncState["currentStatus"]) {
    this.state.currentStatus = value;
  }

  get errorMessage() {
    return this.state.errorMessage;
  }
  set errorMessage(value: VaultSyncState["errorMessage"]) {
    this.state.errorMessage = value;
  }

  get syncType() {
    return this.state.syncType;
  }
  set syncType(value: VaultSyncState["syncType"]) {
    this.state.syncType = value;
  }

  get loadPhase() {
    return this.state.loadPhase;
  }
  set loadPhase(value: VaultSyncState["loadPhase"]) {
    this.state.loadPhase = value;
  }

  get syncStats() {
    return this.state.syncStats;
  }
  set syncStats(value: VaultSyncState["syncStats"]) {
    this.state.syncStats = value;
  }

  get failedFiles() {
    return this.state.failedFiles;
  }
  set failedFiles(value: VaultSyncState["failedFiles"]) {
    this.state.failedFiles = value;
  }

  get hasConflictFiles() {
    return this.state.hasConflictFiles;
  }
  set hasConflictFiles(value: VaultSyncState["hasConflictFiles"]) {
    this.state.hasConflictFiles = value;
  }

  get hasFolderHandle() {
    return this.state.hasFolderHandle;
  }
  set hasFolderHandle(value: VaultSyncState["hasFolderHandle"]) {
    this.state.hasFolderHandle = value;
  }

  get status() {
    return this.state.status;
  }
  get isDirty() {
    return this.state.isDirty;
  }

  private syncAbortController: AbortController | null = null;
  private warmReconcileTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * The vault whose entities are currently seeded in memory. Used to tell a
   * same-vault reload (where in-memory may hold fresher writes than the cache,
   * e.g. mid-import) apart from a vault switch (where in-memory is stale and
   * must be fully replaced).
   */
  private _lastSeededVaultId: string | null = null;

  constructor(private deps: SyncStoreDependencies) {
    this.state = new VaultSyncState(deps);
    browserPerformanceCapture.start();
    appEventBus.subscribe("SYNC:DRIVE_PULL_COMPLETE", async (event) => {
      const activeId = this.deps.activeVaultId();
      if (activeId && event.payload?.vaultId === activeId) {
        debugStore.log(
          `[SyncStore] GDrive pull completed for active vault ${activeId}. Reloading files...`,
        );
        await cacheService.clearVault(activeId);
        await this.loadFiles(false);
        await updateLastInternalChange(activeId);
      }
    });
  }

  private async waitForSaves(timeoutMs?: number): Promise<void> {
    if (this.deps.flushPendingSaves) {
      await this.deps.flushPendingSaves(timeoutMs);
    } else {
      await this.deps.repository.waitForAllSaves(timeoutMs);
    }
  }

  private async ensureFolderPermission(
    localHandle: FileSystemDirectoryHandle,
  ): Promise<boolean> {
    try {
      const permission = await localHandle.queryPermission({
        mode: "readwrite",
      });
      if (permission === "granted") {
        return true;
      }
      const requested = await localHandle.requestPermission({
        mode: "readwrite",
      });
      if (requested === "granted") {
        return true;
      }
      this.setStatus("needs-permission");
      this.errorMessage = "Permission denied for local folder.";
      notificationStore.notify("Permission denied for local folder.", "error");
      return false;
    } catch (err: any) {
      debugStore.error("[SyncStore] Failed to ensure folder permission", err);
      this.setStatus("needs-permission");
      this.errorMessage = "Permission denied for local folder.";
      notificationStore.notify("Permission denied for local folder.", "error");
      return false;
    }
  }

  private isStale(vaultIdAtStart: string, signal?: AbortSignal): boolean {
    return (
      this.deps.activeVaultId() !== vaultIdAtStart || (signal?.aborted ?? false)
    );
  }

  /**
   * Re-reads the vault from OPFS after a warm-cache paint (#2619).
   *
   * Deferred rather than awaited so the instant load the cache exists for is
   * unaffected: the user already has their vault on screen before this starts.
   * `loadFiles(false)` takes the cold path, which reads OPFS and syncs the
   * local folder, so anything the cache was missing or holding stale is
   * corrected — and because it is the cold path, it cannot re-enter this.
   */
  private scheduleWarmReconcile(vaultIdAtStart: string): void {
    if (this.warmReconcileTimer) return;
    this.warmReconcileTimer = setTimeout(() => {
      this.warmReconcileTimer = null;
      // The user may have switched vaults while we waited; reconciling the
      // wrong vault would be worse than not reconciling at all.
      if (this.isStale(vaultIdAtStart)) return;
      void this.loadFiles(false, { reuseCache: true }).catch((err) => {
        debugStore.warn("[SyncStore] Warm-cache reconcile failed:", err);
      });
    }, WARM_RECONCILE_DELAY_MS);
  }

  private cancelWarmReconcile(): void {
    if (!this.warmReconcileTimer) return;
    clearTimeout(this.warmReconcileTimer);
    this.warmReconcileTimer = null;
  }

  private dispatchAuxiliaryTasks(
    vaultId: string,
    vaultDir: FileSystemDirectoryHandle | null,
    signal: AbortSignal,
    onDegraded?: (source: string) => void,
    options: {
      includeEntityCount?: boolean;
      entityCount?: number;
      includePublishRegistry?: boolean;
    } = {},
  ): void {
    const runTask = (
      source: string,
      task: () => Promise<unknown>,
    ): Promise<void> =>
      Promise.resolve()
        .then(task)
        .then(
          () => undefined,
          () => {
            onDegraded?.(source);
          },
        );

    const tasks: Promise<void>[] = [
      runTask("maps", () => this.deps.loadMaps(vaultId)),
      runTask("canvases", () => this.deps.loadCanvases(vaultId)),
      runTask("conflict_scan", () => this.scanConflicts(signal)),
    ];

    if (options.includeEntityCount) {
      const count =
        options.entityCount ??
        Object.keys(this.deps.repository.entities).length;
      tasks.push(
        runTask("entity_count", () =>
          this.deps.updateEntityCount(vaultId, count),
        ),
      );
    }

    if (
      options.includePublishRegistry &&
      vaultDir &&
      this.deps.loadPublishRegistry
    ) {
      const loadPub = this.deps.loadPublishRegistry;
      tasks.push(runTask("publish_registry", () => loadPub(vaultId, vaultDir)));
    }

    void Promise.allSettled(tasks);
  }

  private async executeLocalPull(
    syncCoordinator: any,
    vaultIdAtStart: string,
    vaultDir: FileSystemDirectoryHandle,
    signal: AbortSignal,
    onStateChange: (state: {
      status: "saving" | "loading" | "idle" | "error";
      syncType: "local" | null;
      errorMessage?: string;
    }) => void,
    onProgress?: (stats: any) => void,
  ): Promise<void> {
    await syncCoordinator.syncWithLocalFolder(
      vaultIdAtStart,
      vaultDir,
      "pull",
      this.deps.repository.entities,
      () => this.waitForSaves(),
      (state: {
        status: "saving" | "loading" | "idle" | "error";
        syncType: "local" | null;
        errorMessage?: string;
      }) => {
        if (this.isStale(vaultIdAtStart, signal)) return;
        onStateChange(state);
      },
      () => this.checkForConflicts(),
      onProgress ? { signal, onProgress } : { signal },
    );
  }

  private emitLocalPullComplete(vaultId: string): void {
    appEventBus.emit({
      type: "SYNC:LOCAL_PULL_COMPLETE",
      domain: "sync",
      payload: { vaultId },
      metadata: {
        timestamp: systemClock.now(),
        vaultId,
      },
    });
  }

  private async resolveDeferredSyncCoordinator(
    vaultIdAtStart: string,
    signal: AbortSignal,
  ): Promise<any | null> {
    const localHandle = await this.deps.getActiveFolderHandle();
    if (this.isStale(vaultIdAtStart, signal)) return null;
    this.hasFolderHandle = !!localHandle;
    if (!localHandle) return null;

    const permission = await localHandle.queryPermission({
      mode: "readwrite",
    });
    if (this.isStale(vaultIdAtStart, signal)) return null;
    if (permission !== "granted") {
      this.setStatus("needs-permission");
      return null;
    }

    await this.deps.ensureServicesInitialized();
    if (this.isStale(vaultIdAtStart, signal)) return null;
    const syncCoordinator = await this.deps.getSyncCoordinator();
    if (!syncCoordinator || this.isStale(vaultIdAtStart, signal)) return null;
    return syncCoordinator;
  }

  private async runDeferredLocalSync(
    vaultIdAtStart: string,
    vaultDir: FileSystemDirectoryHandle,
    signal: AbortSignal,
    onDegraded?: (source: string) => void,
  ): Promise<void> {
    let localSyncFailed = false;
    try {
      const syncCoordinator = await this.resolveDeferredSyncCoordinator(
        vaultIdAtStart,
        signal,
      );
      if (!syncCoordinator) return;

      await this.executeLocalPull(
        syncCoordinator,
        vaultIdAtStart,
        vaultDir,
        signal,
        (state) => {
          // Deferred local sync runs after startup is ready; never transition
          // vault status to "loading" or "error" so a slow/broken local folder
          // cannot lock Graph or Entity Table behind an unmonitored spinner.
          if (state.status === "error") {
            localSyncFailed = true;
            onDegraded?.("local_sync");
          }
        },
      );

      if (localSyncFailed || this.isStale(vaultIdAtStart, signal)) return;

      this.emitLocalPullComplete(vaultIdAtStart);
      await cacheService.clearVault(vaultIdAtStart);
      if (this.isStale(vaultIdAtStart, signal)) return;
      await this.loadFiles(false, { deferAuxiliary: true });
    } catch {
      if (!this.isStale(vaultIdAtStart, signal)) {
        onDegraded?.("local_sync");
      }
    }
  }

  /**
   * `reuseCache` lets a load that follows a warm open skip re-reading the
   * whole cache: the warm-cache reconcile passes it, since it re-reads OPFS
   * (the source of truth) itself and the snapshot was loaded moments earlier.
   */
  async loadFiles(skipSyncIfWarm = true, options: LoadFilesOptions = {}) {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;
    const vaultIdAtStart = activeVaultId;

    // A load starting now supersedes any reconcile still waiting to fire.
    this.cancelWarmReconcile();
    if (this.syncAbortController) {
      this.syncAbortController.abort();
    }
    this.syncAbortController = new AbortController();
    const signal = this.syncAbortController.signal;

    this._status = "loading";
    this.loadPhase = "scanning";
    this.errorMessage = null;
    this.syncStats = {
      updated: 0,
      created: 0,
      deleted: 0,
      failed: 0,
      total: 0,
      progress: 0,
    };
    this.failedFiles = [];
    let vaultOpenSpan: PerformanceOperationHandle | null = null;
    let vaultOpenRecorded = false;
    let vaultOpenCacheState: "warm" | "cold" | null = null;
    const completeVaultOpen = () => {
      if (!vaultOpenSpan || vaultOpenRecorded) return;
      vaultOpenRecorded = true;
      vaultOpenSpan.complete(() => ({
        cacheState: vaultOpenCacheState ?? "not_applicable",
        entityCount: Object.keys(this.deps.repository.entities).length,
      }));
    };
    const staleVaultOpen = () => {
      if (!vaultOpenSpan || vaultOpenRecorded) return;
      vaultOpenRecorded = true;
      vaultOpenSpan.stale(() => ({
        cacheState: vaultOpenCacheState ?? "not_applicable",
      }));
    };
    const failVaultOpen = () => {
      if (!vaultOpenSpan || vaultOpenRecorded) return;
      vaultOpenRecorded = true;
      vaultOpenSpan.fail("unexpected", () => ({
        cacheState: vaultOpenCacheState ?? "not_applicable",
      }));
    };

    try {
      vaultEventBus.reset();
      vaultEventBus.emit({
        type: "VAULT_OPENING",
        vaultId: vaultIdAtStart,
      });

      // On a same-vault reload, keep the current in-memory entities until the
      // cache snapshot is ready instead of blanking them. This closes the race
      // where a concurrent reload (e.g. the cross-tab RELOAD_VAULT broadcast
      // firing mid-import) would clear the store and reseed from a stale cache,
      // dropping freshly-written data such as connections. A vault switch still
      // fully clears, since the old vault's entities must not leak.
      const isSameVault = vaultIdAtStart === this._lastSeededVaultId;
      if (!isSameVault) {
        this.deps.repository.entities = {};
      }

      const isDemo =
        sessionModeStore.isDemoMode || vaultIdAtStart.startsWith("demo-");
      const cachedMap = !isDemo
        ? await (options.reuseCache
            ? cacheService.preloadVault(vaultIdAtStart, { reuse: true })
            : cacheService.preloadVault(vaultIdAtStart))
        : new Map();

      vaultOpenCacheState = cachedMap.size > 0 ? "warm" : "cold";
      vaultOpenSpan = browserPerformanceRecorder.start(
        cachedMap.size > 0 ? "vault_open_warm" : "vault_open_cold",
      );
      if (this.isStale(vaultIdAtStart, signal)) {
        staleVaultOpen();
        return;
      }

      options.onCacheReady?.({
        cacheState: vaultOpenCacheState,
        count: cachedMap.size,
      });

      if (cachedMap.size > 0) {
        // Read the LIVE map at seed time (not a pre-await snapshot): on a
        // same-vault reload it still holds any writes that landed during the
        // async preload above.
        const liveEntities = isSameVault ? this.deps.repository.entities : {};
        const entityMap: Record<string, LocalEntity> = {};
        let reseedChanged = !isSameVault;
        for (const { entity } of cachedMap.values()) {
          // If the live entity is newer than (or the same revision as) the
          // cached copy, keep the live one: a debounced save may not have
          // landed yet, and an identical copy would only replace every entity
          // object, which makes everything reading them (the graph included)
          // rebuild for nothing.
          const live = liveEntities[entity.id];
          if (live && (live.updatedAt ?? 0) >= (entity.updatedAt ?? 0)) {
            entityMap[entity.id] = live;
          } else {
            entityMap[entity.id] = { ...entity };
            reseedChanged = true;
          }
        }
        // Preserve live entities created during this reload that the cache
        // snapshot hasn't captured yet (e.g. an in-flight import), so the
        // reseed can't drop brand-new entities either.
        for (const id in liveEntities) {
          if (!(id in entityMap)) entityMap[id] = liveEntities[id];
        }
        this._lastSeededVaultId = vaultIdAtStart;
        // A same-vault reload whose cache matches memory has nothing to seed.
        if (reseedChanged) {
          this.deps.repository.entities = entityMap;
          vaultEventBus.emit({
            type: "CACHE_LOADED",
            vaultId: vaultIdAtStart,
            entities: entityMap,
          });
        }

        this.setStatus("idle");
      }

      // Silent check for local folder handle permission (deferred during startup
      // bootstrap so permission/handle queries never block entity readiness).
      let skipLocalSync = false;
      let localHandle: FileSystemDirectoryHandle | undefined;
      if (!options.deferAuxiliary) {
        localHandle = await this.deps.getActiveFolderHandle();
        this.hasFolderHandle = !!localHandle;
        if (localHandle && !isDemo) {
          try {
            const permission = await localHandle.queryPermission({
              mode: "readwrite",
            });
            if (permission !== "granted") {
              debugStore.log(
                `[SyncStore] Local folder permission is ${permission}. Skipping auto-sync.`,
              );
              this.setStatus("needs-permission");
              skipLocalSync = true;
            }
          } catch (err) {
            debugStore.warn(
              "[SyncStore] Failed to query local folder permission silently",
              err,
            );
          }
        }
      }

      if (cachedMap.size > 0 && skipSyncIfWarm) {
        debugStore.log(
          "[SyncStore] Cache is warm. Painting from cache, reconciling after.",
        );
        if (options.deferAuxiliary) {
          this.dispatchAuxiliaryTasks(
            vaultIdAtStart,
            null,
            signal,
            options.onAuxiliaryDegraded,
            {
              includeEntityCount: true,
              entityCount: cachedMap.size,
              includePublishRegistry: false,
            },
          );
        } else {
          await this.deps.updateEntityCount(vaultIdAtStart, cachedMap.size);
          await this.deps.loadMaps(vaultIdAtStart);
          await this.deps.loadCanvases(vaultIdAtStart);
          void this.deps.getActiveVaultHandle();
        }
        completeVaultOpen();
        // The cache is a cache. Returning here made it the source of truth at
        // startup, with no validation and no expiry — so a cache write that
        // failed (its error is swallowed on the grounds that "the OPFS file is
        // the source of truth") left the app showing stale data on every
        // launch, forever, while the real entity sat on disk and synced
        // correctly to the user's folder. That is #2619. The warm paint still
        // happens first, so this costs nothing the user can perceive; it just
        // stops the cache being able to mask the disk.
        this.scheduleWarmReconcile(vaultIdAtStart);
        return;
      }

      const vaultDir = await this.deps.getActiveVaultHandle();
      if (this.isStale(vaultIdAtStart, signal)) {
        staleVaultOpen();
        return;
      }

      if (!vaultDir) {
        if (!isDemo) {
          this.setStatus(cachedMap.size > 0 ? "idle" : "error");
          if ((this._status as string) === "error") {
            this.errorMessage = "Failed to resolve vault directory handle";
            failVaultOpen();
            if (options.throwOnError) {
              throw new VaultSyncError(
                "vault_handle_missing",
                this.errorMessage,
              );
            }
          } else {
            completeVaultOpen();
          }
        } else {
          this.setStatus("idle");
          completeVaultOpen();
        }
        return;
      }

      if (!options.deferAuxiliary && localHandle && !skipLocalSync) {
        this.loadPhase = "syncing";
        debugStore.log(
          `[SyncStore] Local sync handle found for ${vaultIdAtStart}. Synchronizing...`,
        );
        await this.deps.ensureServicesInitialized();
        const syncCoordinator = await this.deps.getSyncCoordinator();
        if (syncCoordinator) {
          try {
            await this.executeLocalPull(
              syncCoordinator,
              vaultIdAtStart,
              vaultDir,
              signal,
              (state) => {
                this.setStatus(state.status);
                if (state.errorMessage) {
                  this.errorMessage = state.errorMessage;
                }
              },
              (stats: any) => {
                if (!this.isStale(vaultIdAtStart, signal)) {
                  this.syncStats = { ...this.syncStats, ...stats };
                }
              },
            );
            if (signal.aborted) {
              staleVaultOpen();
              return;
            }
            debugStore.log("[SyncStore] Local sync complete.");
            this.emitLocalPullComplete(vaultIdAtStart);
          } catch (err) {
            debugStore.error("[SyncStore] Local sync failed", err);
          }
        }
      }

      if (this.isStale(vaultIdAtStart, signal)) {
        staleVaultOpen();
        return;
      }

      if (cachedMap.size > 0) {
        this._status = "idle";
      }

      this.loadPhase = "parsing";
      const syncPromise = this.deps.repository
        .loadFiles(
          vaultIdAtStart,
          vaultDir,
          async (_chunk, current, total, newOrChanged) => {
            if (this.isStale(vaultIdAtStart, signal)) return;

            this.syncStats.total = total;
            this.syncStats.progress = Math.round((current / total) * 100);
            this.syncStats.created = current;

            const changedIds = Object.keys(newOrChanged);
            if (changedIds.length > 0) {
              const chunkSpan =
                browserPerformanceRecorder.start("vault_sync_chunk");
              vaultEventBus.emit({
                type: "SYNC_CHUNK_READY",
                vaultId: vaultIdAtStart,
                // Keep chunk events proportional to changed files. The repository
                // still owns the complete accumulated map; consumers only need the
                // parsed records from this chunk.
                entities: newOrChanged,
                newOrChangedIds: changedIds,
              });
              chunkSpan.complete(() => ({
                changedEntityCount: changedIds.length,
                entityCount: Object.keys(this.deps.repository.entities).length,
              }));
            }
          },
        )
        .then(async () => {
          if (this.isStale(vaultIdAtStart, signal)) return;
          debugStore.log(
            `[SyncStore] Load complete. Indexed ${this.syncStats.created} entities.`,
          );
          if (!options.deferAuxiliary) {
            await this.deps.updateEntityCount(
              vaultIdAtStart,
              Object.keys(this.deps.repository.entities).length,
            );
          }
        });

      await syncPromise;

      if (this.isStale(vaultIdAtStart, signal)) {
        staleVaultOpen();
        return;
      }

      if (options.deferAuxiliary) {
        this.dispatchAuxiliaryTasks(
          vaultIdAtStart,
          vaultDir,
          signal,
          options.onAuxiliaryDegraded,
          {
            includeEntityCount: true,
            includePublishRegistry: true,
          },
        );
        if (skipSyncIfWarm && !isDemo) {
          void this.runDeferredLocalSync(
            vaultIdAtStart,
            vaultDir,
            signal,
            options.onAuxiliaryDegraded,
          );
        }
      } else {
        await Promise.all([
          this.deps.loadMaps(vaultIdAtStart),
          this.deps.loadCanvases(vaultIdAtStart),
          vaultDir && this.deps.loadPublishRegistry
            ? this.deps.loadPublishRegistry(vaultIdAtStart, vaultDir)
            : Promise.resolve(),
        ]);
      }

      if (this._status === "loading") {
        this.setStatus("idle");
      }

      vaultEventBus.emit({
        type: "SYNC_COMPLETE",
        vaultId: vaultIdAtStart,
      });
      completeVaultOpen();
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message === "AbortError") {
        staleVaultOpen();
        return;
      }
      failVaultOpen();
      debugStore.error("[SyncStore] Load failed", err);
      this.setStatus("error");
      this.errorMessage = err?.message || "Failed to load vault files";
      if (options.throwOnError) {
        throw err instanceof VaultSyncError
          ? err
          : new VaultSyncError(
              "vault_load_failed",
              this.errorMessage ?? "Failed to load vault files",
              err,
            );
      }
    } finally {
      // Only clear the phase if this invocation is still the active one. A
      // stale (aborted) load must not null out the phase of the newer load
      // that superseded it — same guard the status reset below uses.
      if (!signal.aborted) {
        this.loadPhase = null;
      }
      if (!signal.aborted && !options.deferAuxiliary) {
        await this.checkForConflicts(signal);
      }
      if (this._status === "loading" && !signal.aborted) {
        this.setStatus("idle");
      }
      if (!vaultOpenRecorded && vaultOpenSpan) {
        if (signal.aborted || this.isStale(vaultIdAtStart, signal)) {
          staleVaultOpen();
        } else {
          completeVaultOpen();
        }
      }
    }
  }

  async saveToFolder() {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;
    const vaultIdAtStart = activeVaultId;

    const syncCoordinator = await this.deps.getSyncCoordinator();
    if (!syncCoordinator) return;

    const opfsHandle = await this.deps.getActiveVaultHandle();
    if (!opfsHandle) return;

    const localHandle = await this.deps.getActiveFolderHandle();
    if (localHandle) {
      const hasPermission = await this.ensureFolderPermission(localHandle);
      if (!hasPermission) return;
    }

    this.failedFiles = [];

    try {
      await syncCoordinator.push(
        vaultIdAtStart,
        opfsHandle,
        this.deps.repository.entities,
        () => this.waitForSaves(),
        (state) => {
          if (this.deps.activeVaultId() === vaultIdAtStart) {
            this.setStatus(state.status);
            this.syncType = state.syncType;
            if (state.errorMessage) this.errorMessage = state.errorMessage;
            if (state.failedFiles) this.failedFiles = state.failedFiles;
          }
        },
        () => this.checkForConflicts(),
        { interactive: true },
      );

      if (this.isStale(vaultIdAtStart)) return;

      if (this._status !== "error") {
        const { updateLastSavedToFolder } = await import("./registry");
        await updateLastSavedToFolder(vaultIdAtStart);

        appEventBus.emit({
          type: "SYNC:LOCAL_PUSH_COMPLETE",
          domain: "sync",
          payload: { vaultId: vaultIdAtStart },
          metadata: { timestamp: systemClock.now(), vaultId: vaultIdAtStart },
        });

        this.setStatus("saved");
      }
    } finally {
      // Fix C4: if vault switched mid-save the onStateChange vault-ID guard
      // suppresses the coordinator's final idle transition, leaving _status
      // stuck at "saving"/"loading". Reset it so the UI doesn't freeze.
      if (this._status === "saving" || this._status === "loading") {
        this.setStatus("idle");
      }
    }
  }

  /**
   * Discards the fast-start cache and re-reads the vault from OPFS (#2619).
   *
   * The recovery action that did not exist. Every other path that clears the
   * cache is reached only by a Google Drive pull, so a local-only user whose
   * cache had drifted from disk had no way back — switching vaults does not do
   * it either, since `invalidatePreload()` drops the in-memory snapshot without
   * touching Dexie. Needs no linked folder: OPFS is the source of truth.
   */
  async reloadFromDisk(): Promise<void> {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;

    // Anything still sitting in the debounce would be lost by the reseed.
    await this.waitForSaves();
    await cacheService.clearVault(activeVaultId);
    await this.loadFiles(false);
  }

  async loadFromFolder() {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;
    const vaultIdAtStart = activeVaultId;

    if (this.isDirty) {
      const confirmed = await notificationStore.confirm({
        title: "Overwrite Internal Work?",
        message:
          "Warning: You have unsaved internal changes. Loading from the folder will overwrite your current work. Continue?",
        confirmLabel: "Overwrite and Load",
        isDangerous: true,
      });
      if (!confirmed) return;
    }

    const syncCoordinator = await this.deps.getSyncCoordinator();
    if (!syncCoordinator) return;

    const opfsHandle = await this.deps.getActiveVaultHandle();
    if (!opfsHandle) return;

    const localHandle = await this.deps.getActiveFolderHandle();
    if (localHandle) {
      const hasPermission = await this.ensureFolderPermission(localHandle);
      if (!hasPermission) return;
    }

    this.failedFiles = [];

    try {
      await syncCoordinator.pull(
        vaultIdAtStart,
        opfsHandle,
        this.deps.repository.entities,
        () => this.waitForSaves(),
        (state) => {
          if (this.deps.activeVaultId() === vaultIdAtStart) {
            this.setStatus(state.status);
            this.syncType = state.syncType;
            if (state.errorMessage) this.errorMessage = state.errorMessage;
            if (state.failedFiles) this.failedFiles = state.failedFiles;
          }
        },
        () => this.checkForConflicts(),
        { interactive: true },
      );

      if (this.isStale(vaultIdAtStart)) return;

      if (this._status !== "error") {
        appEventBus.emit({
          type: "SYNC:LOCAL_PULL_COMPLETE",
          domain: "sync",
          payload: { vaultId: vaultIdAtStart },
          metadata: { timestamp: systemClock.now(), vaultId: vaultIdAtStart },
        });

        // Clear the cache before reloading, exactly as the Drive pull does.
        // Without this the pull lands in OPFS and `loadFiles()` then takes the
        // warm path and re-displays the pre-pull cache — the user asks to load
        // from their folder and is shown the stale copy anyway (#2619).
        await cacheService.clearVault(vaultIdAtStart);
        await this.loadFiles(false);
      }
    } finally {
      // Fix C4: mirror of saveToFolder — reset stuck transitional status
      // if vault switched while the pull was in flight.
      if (this._status === "saving" || this._status === "loading") {
        this.setStatus("idle");
      }
    }
  }

  async cleanupConflictFiles(signal?: AbortSignal) {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;
    const vaultIdAtStart = activeVaultId;

    const syncCoordinator = await this.deps.getSyncCoordinator();
    if (!syncCoordinator) return;

    const opfsHandle = await this.deps.getActiveVaultHandle();
    // Fix C8: guard vault switch that may have occurred during the awaits above.
    if (!opfsHandle || this.isStale(vaultIdAtStart, signal)) return;

    await syncCoordinator.cleanupConflictFiles(
      activeVaultId,
      opfsHandle,
      (status) => {
        if (!signal?.aborted) this._status = status;
      },
      () => this.loadFiles(),
      signal,
    );
  }

  private async scanConflicts(signal?: AbortSignal) {
    const opfsHandle = await this.deps.getActiveVaultHandle();
    if (!opfsHandle || signal?.aborted) return;
    const files = await fileIOAdapter.walkDirectory(opfsHandle);
    if (signal?.aborted) return;
    this.hasConflictFiles = files.some((f: any) =>
      f.path[f.path.length - 1].includes(".conflict-"),
    );
  }

  async checkForConflicts(signal?: AbortSignal) {
    try {
      await this.scanConflicts(signal);
    } catch {
      this.hasConflictFiles = false;
    }
  }

  setStatus(status: VaultSyncState["currentStatus"]) {
    this.state.setStatus(status);
  }

  setErrorMessage(m: string | null) {
    this.errorMessage = m;
  }

  setHasConflictFiles(v: boolean) {
    this.hasConflictFiles = v;
  }
}
