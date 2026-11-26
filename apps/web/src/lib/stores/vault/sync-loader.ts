import type { LocalEntity } from "./types";
import { vaultEventBus } from "./events.svelte";
import { debugStore } from "../debug.svelte";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { browserPerformanceRecorder } from "#lib/services/performance/browser-performance-capture.js";
import type { VaultSyncContext } from "./sync-context";
import type { VaultSyncState } from "./sync-state.svelte";
import type { VaultSyncCache } from "./sync-cache";
import type { VaultFolderSync } from "./sync-folder";
import type { VaultSyncAuxiliary } from "./sync-auxiliary";
import { VaultLoadMeasurement } from "./sync-load-performance";
import { VaultSyncError, type LoadFilesOptions } from "./sync-types";

interface LoadRun {
  vaultId: string;
  signal: AbortSignal;
  skipSyncIfWarm: boolean;
  options: LoadFilesOptions;
  measurement: VaultLoadMeasurement;
  isDemo: boolean;
  cachedMap: Awaited<ReturnType<VaultSyncCache["preload"]>>;
}

type LocalSyncPermission = Awaited<
  ReturnType<VaultFolderSync["queryAutoSyncPermission"]>
>;

/** Orchestrates cache paint, disk parsing and the lifecycle of a cancellable load. */
export class VaultFileLoader {
  private abortController: AbortController | null = null;

  constructor(
    private context: VaultSyncContext,
    private state: VaultSyncState,
    private cache: VaultSyncCache,
    private folder: VaultFolderSync,
    private auxiliary: VaultSyncAuxiliary,
    private checkForConflicts: (signal?: AbortSignal) => Promise<void>,
  ) {}

  private get deps() {
    return this.context.deps;
  }

  async loadFiles(skipSyncIfWarm = true, options: LoadFilesOptions = {}) {
    const vaultId = this.deps.activeVaultId();
    if (!vaultId) return;
    const run: LoadRun = {
      vaultId,
      signal: this.beginLoad(),
      skipSyncIfWarm,
      options,
      measurement: new VaultLoadMeasurement(
        () => Object.keys(this.deps.repository.entities).length,
      ),
      isDemo: false,
      cachedMap: new Map(),
    };
    try {
      await this.loadVault(run);
    } catch (err) {
      this.handleLoadError(run, err);
    } finally {
      await this.finishLoad(run);
    }
  }

  private beginLoad(): AbortSignal {
    // A new load supersedes both a pending reconcile and an earlier load.
    this.cache.cancelReconcile();
    this.abortController?.abort();
    this.abortController = new AbortController();
    this.state.currentStatus = "loading";
    this.state.loadPhase = "scanning";
    this.state.errorMessage = null;
    this.state.syncStats = {
      updated: 0,
      created: 0,
      deleted: 0,
      failed: 0,
      total: 0,
      progress: 0,
    };
    this.state.failedFiles = [];
    return this.abortController.signal;
  }

  private stopStale(run: LoadRun): boolean {
    if (!this.context.isStale(run.vaultId, run.signal)) return false;
    run.measurement.stale();
    return true;
  }

  private async loadVault(run: LoadRun) {
    const { vaultId, signal, options, measurement } = run;
    vaultEventBus.reset();
    vaultEventBus.emit({ type: "VAULT_OPENING", vaultId });
    const isSameVault = this.cache.prepare(vaultId);
    run.isDemo = sessionModeStore.isDemoMode || vaultId.startsWith("demo-");
    const cachedMap = await this.cache.preload(vaultId, run.isDemo, options);
    run.cachedMap = cachedMap;
    const cacheState = cachedMap.size > 0 ? "warm" : "cold";
    measurement.start(cachedMap.size > 0);
    if (this.stopStale(run)) return;
    options.onCacheReady?.({
      cacheState,
      count: cachedMap.size,
    });
    if (cachedMap.size > 0) {
      this.cache.seed(vaultId, cachedMap, isSameVault);
      this.state.setStatus("idle");
    }

    // Bootstrap defers permission queries so they cannot block entity readiness.
    const permission = options.deferAuxiliary
      ? { localHandle: undefined, skipLocalSync: false }
      : await this.folder.queryAutoSyncPermission(run.isDemo);
    if (cachedMap.size > 0 && run.skipSyncIfWarm) {
      debugStore.log(
        "[SyncStore] Cache is warm. Painting from cache, reconciling after.",
      );
      await this.auxiliary.loadWarm(vaultId, cachedMap.size, signal, options);
      measurement.complete();
      // OPFS remains authoritative even if an earlier cache write failed (#2619).
      this.cache.scheduleReconcile(vaultId);
      return;
    }
    await this.loadFromDisk(run, permission);
  }

  private async loadFromDisk(run: LoadRun, permission: LocalSyncPermission) {
    const vaultDir = await this.deps.getActiveVaultHandle();
    if (this.stopStale(run)) return;
    if (!vaultDir) {
      this.handleMissingDirectory(run);
      return;
    }
    if (!(await this.syncBeforeParsing(run, vaultDir, permission))) return;
    if (run.cachedMap.size > 0) this.state.currentStatus = "idle";
    this.state.loadPhase = "parsing";
    await this.parseFiles(run, vaultDir);
    if (this.stopStale(run)) return;
    await this.loadAuxiliary(run, vaultDir);
    if (this.state.currentStatus === "loading") this.state.setStatus("idle");
    vaultEventBus.emit({ type: "SYNC_COMPLETE", vaultId: run.vaultId });
    run.measurement.complete();
  }

  private async syncBeforeParsing(
    run: LoadRun,
    vaultDir: FileSystemDirectoryHandle,
    permission: LocalSyncPermission,
  ): Promise<boolean> {
    if (
      !run.options.deferAuxiliary &&
      permission.localHandle &&
      !permission.skipLocalSync
    ) {
      if (
        !(await this.folder.pullBeforeLoad(run.vaultId, vaultDir, run.signal))
      ) {
        run.measurement.stale();
        return false;
      }
    }
    return !this.stopStale(run);
  }

  private handleMissingDirectory(run: LoadRun) {
    if (run.isDemo || run.cachedMap.size > 0) {
      this.state.setStatus("idle");
      run.measurement.complete();
      return;
    }
    this.state.setStatus("error");
    this.state.errorMessage = "Failed to resolve vault directory handle";
    run.measurement.fail();
    if (run.options.throwOnError) {
      throw new VaultSyncError("vault_handle_missing", this.state.errorMessage);
    }
  }

  private parseFiles(run: LoadRun, vaultDir: FileSystemDirectoryHandle) {
    return this.deps.repository
      .loadFiles(
        run.vaultId,
        vaultDir,
        async (_chunk, current, total, newOrChanged) => {
          this.onChunkReady(run, current, total, newOrChanged);
        },
      )
      .then(async () => {
        if (this.context.isStale(run.vaultId, run.signal)) return;
        debugStore.log(
          `[SyncStore] Load complete. Indexed ${this.state.syncStats.created} entities.`,
        );
        if (!run.options.deferAuxiliary) {
          await this.deps.updateEntityCount(
            run.vaultId,
            Object.keys(this.deps.repository.entities).length,
          );
        }
      });
  }

  private onChunkReady(
    run: LoadRun,
    current: number,
    total: number,
    newOrChanged: Record<string, LocalEntity>,
  ) {
    if (this.context.isStale(run.vaultId, run.signal)) return;
    this.state.syncStats.total = total;
    this.state.syncStats.progress = Math.round((current / total) * 100);
    this.state.syncStats.created = current;
    const changedIds = Object.keys(newOrChanged);
    if (changedIds.length === 0) return;
    const chunkSpan = browserPerformanceRecorder.start("vault_sync_chunk");
    // Consumers need just the changed records; the repository owns the full map.
    vaultEventBus.emit({
      type: "SYNC_CHUNK_READY",
      vaultId: run.vaultId,
      entities: newOrChanged,
      newOrChangedIds: changedIds,
    });
    chunkSpan.complete(() => ({
      changedEntityCount: changedIds.length,
      entityCount: Object.keys(this.deps.repository.entities).length,
    }));
  }

  private async loadAuxiliary(
    run: LoadRun,
    vaultDir: FileSystemDirectoryHandle,
  ) {
    const { vaultId, signal, options } = run;
    if (options.deferAuxiliary) {
      this.auxiliary.dispatch(
        vaultId,
        vaultDir,
        signal,
        options.onAuxiliaryDegraded,
        { includeEntityCount: true, includePublishRegistry: true },
      );
      if (run.skipSyncIfWarm && !run.isDemo) {
        void this.folder.runDeferred(
          vaultId,
          vaultDir,
          signal,
          options.onAuxiliaryDegraded,
        );
      }
    } else {
      await this.auxiliary.loadAfterParse(vaultId, vaultDir);
    }
  }

  private handleLoadError(run: LoadRun, err: any) {
    if (err?.name === "AbortError" || err?.message === "AbortError") {
      run.measurement.stale();
      return;
    }
    run.measurement.fail();
    debugStore.error("[SyncStore] Load failed", err);
    this.state.setStatus("error");
    this.state.errorMessage = err?.message || "Failed to load vault files";
    if (run.options.throwOnError) {
      throw this.wrapLoadError(err);
    }
  }

  private wrapLoadError(err: unknown): VaultSyncError {
    return err instanceof VaultSyncError
      ? err
      : new VaultSyncError(
          "vault_load_failed",
          this.state.errorMessage ?? "Failed to load vault files",
          err,
        );
  }

  private async finishLoad(run: LoadRun) {
    const { signal, options } = run;
    // An aborted invocation must leave the newer load's phase and status alone.
    if (!signal.aborted) this.state.loadPhase = null;
    if (!signal.aborted && !options.deferAuxiliary)
      await this.checkForConflicts(signal);
    if (this.state.currentStatus === "loading" && !signal.aborted)
      this.state.setStatus("idle");
    run.measurement.settle(
      () => signal.aborted || this.context.isStale(run.vaultId, signal),
    );
  }
}
