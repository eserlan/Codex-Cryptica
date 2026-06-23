import { vaultEventBus } from "./events.svelte";
import type { LocalEntity } from "./types";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import { SyncCoordinator, VaultRepository } from "@codex/vault-engine";
import { appEventBus } from "@codex/events";
import { fileIOAdapter } from "./adapters.svelte";
import type { VaultRecord } from "../../utils/idb";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

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
  loadPublishRegistry?: (
    vaultId: string,
    vaultHandle: FileSystemDirectoryHandle,
  ) => Promise<void>;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
  flushPendingSaves?: (timeoutMs?: number) => Promise<void>;
}

export class SyncStore {
  private _status = $state<
    "idle" | "loading" | "saving" | "saved" | "needs-permission" | "error"
  >("idle");
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
    if (this._status === "needs-permission") return "needs-permission";
    if (this._status === "saved") return "saved";
    if (this.deps.repository.pendingSaveCount > 0) return "saving";
    return this._status;
  }

  get isDirty() {
    const record = this.deps.activeVaultRecord();
    if (!record) return false;
    if (sessionModeStore.isDemoMode || this.status === "loading") return false;
    return (record.lastInternalChange || 0) > (record.lastSavedToFolder || 0);
  }

  private syncAbortController: AbortController | null = null;
  private savedTimer: any = null;

  private unsubscribe: (() => void) | null = null;

  constructor(private deps: SyncStoreDependencies) {
    this.unsubscribe = appEventBus.subscribe(
      "SYNC:DRIVE_PULL_COMPLETE",
      async (event) => {
        const activeId = this.deps.activeVaultId();
        if (activeId && event.payload?.vaultId === activeId) {
          debugStore.log(
            `[SyncStore] GDrive pull completed for active vault ${activeId}. Reloading files...`,
          );
          await cacheService.clearVault(activeId);
          await this.loadFiles(false);
        }
      },
    );
  }

  private clearSavedTimer() {
    if (this.savedTimer) {
      clearTimeout(this.savedTimer);
      this.savedTimer = null;
    }
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

  destroy() {
    this.clearSavedTimer();
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private isStale(vaultIdAtStart: string, signal?: AbortSignal): boolean {
    return (
      this.deps.activeVaultId() !== vaultIdAtStart || (signal?.aborted ?? false)
    );
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

      const isDemo =
        sessionModeStore.isDemoMode || vaultIdAtStart.startsWith("demo-");
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

        this.setStatus("idle");
      }

      // Silent check for local folder handle permission
      let skipLocalSync = false;
      const localHandle = await this.deps.getActiveFolderHandle();
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

      if (cachedMap.size > 0 && skipSyncIfWarm) {
        debugStore.log(
          "[SyncStore] Cache is warm. Skipping OPFS background sync for instant load.",
        );
        await this.deps.updateEntityCount(vaultIdAtStart, cachedMap.size);
        await this.deps.loadMaps(vaultIdAtStart);
        await this.deps.loadCanvases(vaultIdAtStart);
        void this.deps.getActiveVaultHandle();
        return;
      }

      const vaultDir = await this.deps.getActiveVaultHandle();
      if (this.isStale(vaultIdAtStart, signal)) return;

      if (!vaultDir) {
        if (!isDemo) {
          this.setStatus(cachedMap.size > 0 ? "idle" : "error");
          if ((this._status as string) === "error") {
            this.errorMessage = "Failed to resolve vault directory handle";
          }
        } else {
          this.setStatus("idle");
        }
        return;
      }

      if (localHandle && !skipLocalSync) {
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
              () => this.waitForSaves(),
              (state: {
                status: "saving" | "loading" | "idle" | "error";
                syncType: "local" | null;
                errorMessage?: string;
              }) => {
                if (
                  this.deps.activeVaultId() === vaultIdAtStart &&
                  !signal.aborted
                ) {
                  this.setStatus(state.status);
                  if (state.errorMessage) {
                    this.errorMessage = state.errorMessage;
                  }
                }
              },
              () => this.checkForConflicts(),
              {
                signal,
                onProgress: (stats: any) => {
                  if (
                    this.deps.activeVaultId() === vaultIdAtStart &&
                    !signal.aborted
                  ) {
                    this.syncStats = { ...this.syncStats, ...stats };
                  }
                },
              },
            );
            if (signal.aborted) return;
            debugStore.log("[SyncStore] Local sync complete.");

            appEventBus.emit({
              type: "SYNC:LOCAL_PULL_COMPLETE",
              domain: "sync",
              payload: { vaultId: vaultIdAtStart },
              metadata: { timestamp: Date.now(), vaultId: vaultIdAtStart },
            });
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
        vaultDir && this.deps.loadPublishRegistry
          ? this.deps.loadPublishRegistry(vaultIdAtStart, vaultDir)
          : Promise.resolve(),
      ]);

      if (this._status === "loading") {
        this.setStatus("idle");
      }

      vaultEventBus.emit({
        type: "SYNC_COMPLETE",
        vaultId: vaultIdAtStart,
      });
    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "AbortError") return;
      debugStore.error("[SyncStore] Load failed", err);
      this.setStatus("error");
      this.errorMessage = err.message;
    } finally {
      if (!signal.aborted) {
        await this.checkForConflicts(signal);
      }
      if (this._status === "loading" && !signal.aborted) {
        this.setStatus("idle");
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
          metadata: { timestamp: Date.now(), vaultId: vaultIdAtStart },
        });

        this.setStatus("saved");
        this.savedTimer = setTimeout(() => {
          if (this._status === "saved") {
            this.setStatus("idle");
          }
        }, 3000);
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
          metadata: { timestamp: Date.now(), vaultId: vaultIdAtStart },
        });

        await this.loadFiles();
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

  setStatus(
    s: "idle" | "loading" | "saving" | "saved" | "needs-permission" | "error",
  ) {
    if (s !== "saved") {
      this.clearSavedTimer();
    }
    this._status = s;
  }

  setErrorMessage(m: string | null) {
    this.errorMessage = m;
  }

  setHasConflictFiles(v: boolean) {
    this.hasConflictFiles = v;
  }
}
