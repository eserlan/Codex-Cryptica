import { vaultEventBus } from "./events";
import type { LocalEntity } from "./types";
import { cacheService } from "../../services/cache.svelte";
import { SyncCoordinator, VaultRepository } from "@codex/vault-engine";
import { fileIOAdapter } from "./adapters.svelte";
import { uiStore } from "../ui.svelte";
import type { VaultRecord } from "../../utils/idb";

export interface SyncStoreDependencies {
  activeVaultId: () => string | null;
  activeVaultRecord: () => VaultRecord | undefined;
  repository: VaultRepository;
  getSyncCoordinator: () => Promise<SyncCoordinator | null>;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveSyncHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  ensureServicesInitialized: () => Promise<void>;
  loadMaps: (vaultId: string) => Promise<void>;
  loadCanvases: (vaultId: string) => Promise<void>;
  refreshVaults: () => Promise<void>;
}

export class SyncStore {
  private _status = $state<"idle" | "loading" | "saving" | "error">("idle");
  errorMessage = $state<string | null>(null);
  syncType = $state<"local" | null>(null);
  syncStats = $state({
    updated: 0,
    created: 0,
    deleted: 0,
    failed: 0,
    total: 0,
    progress: 0,
  });
  failedFiles = $state<{ path: string; error: string }[]>([]);
  hasConflictFiles = $state(false);
  hasSyncHandle = $state(false);

  get status() {
    // If we are explicitly loading, that takes priority
    if (this._status === "loading") return "loading";
    
    // If the repository has pending saves, we are "saving"
    if (this.deps.repository.pendingSaveCount > 0) return "saving";

    return this._status;
  }

  get isDirty() {
    const record = this.deps.activeVaultRecord();
    if (!record) return false;
    
    // In demo mode or during loading, we are never "dirty" relative to the local folder
    if (uiStore.isDemoMode || this.status === "loading") return false;

    return (record.lastInternalChange || 0) > (record.lastSavedToFolder || 0);
  }

  private syncAbortController: AbortController | null = null;

  constructor(private deps: SyncStoreDependencies) {}

  private isStale(vaultIdAtStart: string, signal: AbortSignal): boolean {
    return this.deps.activeVaultId() !== vaultIdAtStart || signal.aborted;
  }

  async loadFiles() {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;
    const vaultIdAtStart = activeVaultId;

    // ABORT: Cancel any ongoing background sync from a previous vault switch
    if (this.syncAbortController) {
      this.syncAbortController.abort();
    }
    this.syncAbortController = new AbortController();
    const signal = this.syncAbortController.signal;

    this._status = "loading";
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

    try {
      // Reset event bus to clear listeners from previous vault sessions
      vaultEventBus.reset();

      // BROADCAST: Opening vault
      vaultEventBus.emit({
        type: "VAULT_OPENING",
        vaultId: vaultIdAtStart,
      });

      // Clear in-memory state before any load to prevent leaks
      this.deps.repository.entities = {};

      // 1. Cache-First: Preload graph metadata from Dexie immediately.
      // SAFETY: Skip cache if we are in demo mode or using a demo vault ID
      const isDemo = uiStore.isDemoMode || vaultIdAtStart.startsWith("demo-");
      const cachedMap = !isDemo
        ? await cacheService.preloadVault(vaultIdAtStart)
        : new Map();

      // Race check after async preload
      if (this.isStale(vaultIdAtStart, signal)) return;

      if (cachedMap.size > 0) {
        const entityMap: Record<string, LocalEntity> = {};
        for (const { entity: e } of cachedMap.values()) {
          entityMap[e.id] = { ...e };
        }
        this.deps.repository.entities = entityMap;

        // BROADCAST: Initial cache data ready
        vaultEventBus.emit({
          type: "CACHE_LOADED",
          vaultId: vaultIdAtStart,
          entities: entityMap,
        });
      }

      // 2. FS-Sync: Resolve OPFS handle
      const vaultDir = await this.deps.getActiveVaultHandle();
      this.hasSyncHandle = !!(await this.deps.getActiveSyncHandle());
      if (this.isStale(vaultIdAtStart, signal)) return;

      if (!vaultDir) {
        if (!isDemo) {
          this._status = cachedMap.size > 0 ? "idle" : "error";
          if (this._status === "error") {
            this.errorMessage = "Failed to resolve vault directory handle";
          }
        } else {
          this._status = "idle";
        }
        return;
      }

      const syncPromise = this.deps.repository.loadFiles(
        vaultIdAtStart,
        vaultDir,
        async (_chunk, current, total, newOrChanged) => {
          if (this.isStale(vaultIdAtStart, signal)) return;

          this.syncStats.total = total;
          this.syncStats.progress = Math.round((current / total) * 100);
          this.syncStats.created = current;

          const changedIds = Object.keys(newOrChanged);
          if (changedIds.length > 0) {
            vaultEventBus.emit({
              type: "SYNC_CHUNK_READY",
              vaultId: vaultIdAtStart,
              entities: this.deps.repository.entities,
              newOrChangedIds: changedIds,
            });
          }
        },
      );

      // We always await the primary FS scan to ensure data integrity
      await syncPromise;

      if (this.isStale(vaultIdAtStart, signal)) return;

      // Load Maps and Canvases in parallel
      await Promise.all([
        this.deps.loadMaps(vaultIdAtStart),
        this.deps.loadCanvases(vaultIdAtStart),
      ]);

      if (this._status === "loading") {
        this._status = "idle";
      }

      vaultEventBus.emit({
        type: "SYNC_COMPLETE",
        vaultId: vaultIdAtStart,
      });
    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "AbortError") return;
      this._status = "error";
      this.errorMessage = err.message;
    } finally {
      if (!signal.aborted) {
        await this.checkForConflicts(signal);
      }
      if (this._status === "loading" && !signal.aborted) {
        this._status = "idle";
      }
    }
  }

  async push() {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;
    const vaultIdAtStart = activeVaultId;

    const syncCoordinator = await this.deps.getSyncCoordinator();
    if (!syncCoordinator) return;

    const opfsHandle = await this.deps.getActiveVaultHandle();
    if (!opfsHandle) return;

    this.failedFiles = [];

    await syncCoordinator.push(
      vaultIdAtStart,
      opfsHandle,
      this.deps.repository.entities,
      () => this.deps.repository.waitForAllSaves(),
      (state) => {
        if (this.deps.activeVaultId() === vaultIdAtStart) {
          this._status = state.status;
          this.syncType = state.syncType;
          if (state.errorMessage) this.errorMessage = state.errorMessage;
          if (state.failedFiles) this.failedFiles = state.failedFiles;
        }
      },
      () => this.checkForConflicts(),
    );

    if (this._status !== "error") {
      const { updateLastSavedToFolder } = await import("./registry");
      await updateLastSavedToFolder(vaultIdAtStart);
    }
  }

  async pull() {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;
    const vaultIdAtStart = activeVaultId;

    if (this.isDirty) {
      const confirmed = await uiStore.confirm({
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

    this.failedFiles = [];

    await syncCoordinator.pull(
      vaultIdAtStart,
      opfsHandle,
      this.deps.repository.entities,
      () => this.deps.repository.waitForAllSaves(),
      (state) => {
        if (this.deps.activeVaultId() === vaultIdAtStart) {
          this._status = state.status;
          this.syncType = state.syncType;
          if (state.errorMessage) this.errorMessage = state.errorMessage;
          if (state.failedFiles) this.failedFiles = state.failedFiles;
        }
      },
      () => this.checkForConflicts(),
    );

    if (this._status !== "error") {
      await this.loadFiles();
    }
  }

  async cleanupConflictFiles(signal?: AbortSignal) {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;

    const syncCoordinator = await this.deps.getSyncCoordinator();
    if (!syncCoordinator) return;

    const opfsHandle = await this.deps.getActiveVaultHandle();
    if (!opfsHandle || signal?.aborted) return;

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

  async checkForConflicts(signal?: AbortSignal) {
    const opfsHandle = await this.deps.getActiveVaultHandle();
    if (!opfsHandle || signal?.aborted) return;
    try {
      const files = await fileIOAdapter.walkDirectory(opfsHandle);
      if (signal?.aborted) return;
      this.hasConflictFiles = files.some((f: any) =>
        f.path[f.path.length - 1].includes(".conflict-"),
      );
    } catch {
      this.hasConflictFiles = false;
    }
  }

  setStatus(s: "idle" | "loading" | "saving" | "error") {
    this._status = s;
  }

  setErrorMessage(m: string | null) {
    this.errorMessage = m;
  }

  setHasConflictFiles(v: boolean) {
    this.hasConflictFiles = v;
  }
}
