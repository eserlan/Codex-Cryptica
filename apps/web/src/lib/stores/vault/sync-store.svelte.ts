import { vaultEventBus } from "./events";
import type { LocalEntity } from "./types";
import { debugStore } from "../debug.svelte";
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
  getActiveFolderHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  ensureServicesInitialized: () => Promise<void>;
  loadMaps: (vaultId: string) => Promise<void>;
  loadCanvases: (vaultId: string) => Promise<void>;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
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
  hasFolderHandle = $state(false);

  get status() {
    if (this._status === "loading") return "loading";
    if (this._status === "error") return "error";
    if (this.deps.repository.pendingSaveCount > 0) return "saving";
    return this._status;
  }

  get isDirty() {
    const record = this.deps.activeVaultRecord();
    if (!record) return false;
    if (uiStore.isDemoMode || this.status === "loading") return false;
    return (record.lastInternalChange || 0) > (record.lastSavedToFolder || 0);
  }

  private syncAbortController: AbortController | null = null;

  constructor(private deps: SyncStoreDependencies) {}

  private isStale(vaultIdAtStart: string, signal: AbortSignal): boolean {
    return this.deps.activeVaultId() !== vaultIdAtStart || signal.aborted;
  }

  async loadFiles(skipSyncIfWarm = true) {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;
    const vaultIdAtStart = activeVaultId;

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
      vaultEventBus.reset();
      vaultEventBus.emit({
        type: "VAULT_OPENING",
        vaultId: vaultIdAtStart,
      });

      this.deps.repository.entities = {};

      const isDemo = uiStore.isDemoMode || vaultIdAtStart.startsWith("demo-");
      const cachedMap = !isDemo
        ? await cacheService.preloadVault(vaultIdAtStart)
        : new Map();

      if (this.isStale(vaultIdAtStart, signal)) return;

      if (cachedMap.size > 0) {
        const entityMap: Record<string, LocalEntity> = {};
        for (const { entity } of cachedMap.values()) {
          entityMap[entity.id] = { ...entity };
        }
        this.deps.repository.entities = entityMap;

        vaultEventBus.emit({
          type: "CACHE_LOADED",
          vaultId: vaultIdAtStart,
          entities: entityMap,
        });

        this._status = "idle";

        if (skipSyncIfWarm) {
          debugStore.log(
            "[SyncStore] Cache is warm. Skipping OPFS background sync for instant load.",
          );
          await this.deps.updateEntityCount(vaultIdAtStart, cachedMap.size);
          await this.deps.loadMaps(vaultIdAtStart);
          await this.deps.loadCanvases(vaultIdAtStart);
          void this.deps.getActiveVaultHandle();
          return;
        }
      }

      const vaultDir = await this.deps.getActiveVaultHandle();
      this.hasFolderHandle = !!(await this.deps.getActiveFolderHandle());
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

      const localHandle = await this.deps.getActiveFolderHandle();
      if (localHandle) {
        debugStore.log(
          `[SyncStore] Local sync handle found for ${vaultIdAtStart}. Synchronizing...`,
        );
        await this.deps.ensureServicesInitialized();
        const syncCoordinator = await this.deps.getSyncCoordinator();
        if (syncCoordinator) {
          try {
            await syncCoordinator.syncWithLocalFolder(
              vaultIdAtStart,
              vaultDir,
              "pull",
              this.deps.repository.entities,
              () => this.deps.repository.waitForAllSaves(),
              (state: {
                status: "saving" | "loading" | "idle" | "error";
                syncType: "local" | null;
                errorMessage?: string;
              }) => {
                if (
                  this.deps.activeVaultId() === vaultIdAtStart &&
                  !signal.aborted
                ) {
                  this._status = state.status;
                  if (state.errorMessage) {
                    this.errorMessage = state.errorMessage;
                  }
                }
              },
              () => this.checkForConflicts(),
              signal,
              (stats: any) => {
                if (
                  this.deps.activeVaultId() === vaultIdAtStart &&
                  !signal.aborted
                ) {
                  this.syncStats = { ...this.syncStats, ...stats };
                }
              },
            );
            if (signal.aborted) return;
            debugStore.log("[SyncStore] Local sync complete.");
          } catch (err) {
            debugStore.error("[SyncStore] Local sync failed", err);
          }
        }
      }

      if (this.isStale(vaultIdAtStart, signal)) return;

      if (cachedMap.size > 0) {
        this._status = "idle";
      }

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
              vaultEventBus.emit({
                type: "SYNC_CHUNK_READY",
                vaultId: vaultIdAtStart,
                entities: this.deps.repository.entities,
                newOrChangedIds: changedIds,
              });
            }
          },
        )
        .then(async () => {
          if (this.isStale(vaultIdAtStart, signal)) return;
          debugStore.log(
            `[SyncStore] Load complete. Indexed ${this.syncStats.created} entities.`,
          );
          await this.deps.updateEntityCount(
            vaultIdAtStart,
            Object.keys(this.deps.repository.entities).length,
          );
        });

      await syncPromise;

      if (this.isStale(vaultIdAtStart, signal)) return;

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
      debugStore.error("[SyncStore] Load failed", err);
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

  async saveToFolder() {
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

  async loadFromFolder() {
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
