import { vaultEventBus } from "./events";
import type { LocalEntity } from "./types";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import { SyncCoordinator, VaultRepository } from "@codex/vault-engine";
import { fileIOAdapter } from "./adapters.svelte";

export interface SyncStoreDependencies {
  activeVaultId: () => string | null;
  repository: VaultRepository;
  getSyncCoordinator: () => Promise<SyncCoordinator | null>;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveSyncHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  ensureServicesInitialized: () => Promise<void>;
  loadMaps: (vaultId: string) => Promise<void>;
  loadCanvases: (vaultId: string) => Promise<void>;
}

export class SyncStore {
  status = $state<"idle" | "loading" | "saving" | "error">("idle");
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
  hasConflictFiles = $state(false);
  private syncAbortController: AbortController | null = null;

  constructor(private deps: SyncStoreDependencies) {}

  private isStale(vaultIdAtStart: string, signal: AbortSignal): boolean {
    return this.deps.activeVaultId() !== vaultIdAtStart || signal.aborted;
  }

  async loadFiles(skipSyncIfWarm = true) {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;
    const vaultIdAtStart = activeVaultId;

    // ABORT: Cancel any ongoing background sync from a previous vault switch
    if (this.syncAbortController) {
      this.syncAbortController.abort();
    }
    this.syncAbortController = new AbortController();
    const signal = this.syncAbortController.signal;

    this.status = "loading";
    this.errorMessage = null;
    this.syncStats = {
      updated: 0,
      created: 0,
      deleted: 0,
      failed: 0,
      total: 0,
      progress: 0,
    };

    try {
      debugStore.log(`[SyncStore] Loading files for vault: ${vaultIdAtStart}`);

      // Reset event bus to clear listeners from previous vault sessions
      vaultEventBus.reset();

      // BROADCAST: Opening vault
      vaultEventBus.emit({
        type: "VAULT_OPENING",
        vaultId: vaultIdAtStart,
      });

      // 1. Cache-First: Preload graph metadata from Dexie immediately.
      const cachedMap = await cacheService.preloadVault(vaultIdAtStart);

      // Race check after async preload
      if (this.isStale(vaultIdAtStart, signal)) return;

      if (cachedMap.size > 0) {
        const entityMap: Record<string, LocalEntity> = {};
        for (const { entity: e } of cachedMap.values()) {
          const existing = this.deps.repository.entities[e.id];
          const finalContent =
            existing?.content && !e.content ? existing.content : e.content;
          const finalLore = existing?.lore && !e.lore ? existing.lore : e.lore;

          entityMap[e.id] = {
            ...e,
            content: finalContent,
            lore: finalLore,
          };
        }
        this.deps.repository.entities = entityMap;
        debugStore.log(
          `[SyncStore] Cache-First: Populated ${cachedMap.size} entities from Dexie.`,
        );

        // BROADCAST: Initial cache data ready
        vaultEventBus.emit({
          type: "CACHE_LOADED",
          vaultId: vaultIdAtStart,
          entities: entityMap,
        });

        this.status = "idle";

        if (skipSyncIfWarm) {
          debugStore.log(
            "[SyncStore] Cache is warm. Skipping OPFS background sync for instant load.",
          );
          await this.deps.loadMaps(vaultIdAtStart);
          await this.deps.loadCanvases(vaultIdAtStart);
          this.deps.getActiveVaultHandle(); // Background resolve
          return;
        }
      }

      // 2. FS-Sync: Resolve OPFS handle
      const vaultDir = await this.deps.getActiveVaultHandle();
      if (this.isStale(vaultIdAtStart, signal)) return;

      if (!vaultDir) {
        if (this.status !== "idle") {
          this.status = cachedMap.size > 0 ? "idle" : "error";
          if (this.status === "error") {
            this.errorMessage = "Failed to resolve vault directory handle";
          }
        }
        return;
      }

      // 3. Local-Sync: If a local sync handle exists
      const localHandle = await this.deps.getActiveSyncHandle();
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
              this.deps.repository.entities,
              () => this.deps.repository.waitForAllSaves(),
              (state) => {
                if (
                  this.deps.activeVaultId() === vaultIdAtStart &&
                  !signal.aborted
                ) {
                  this.status = state.status;
                  if (state.errorMessage)
                    this.errorMessage = state.errorMessage;
                }
              },
              () => this.checkForConflicts(),
              signal,
              (stats) => {
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
        this.status = "idle";
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

      if (this.status === "loading") {
        await syncPromise;
      } else {
        syncPromise.catch((err: any) => {
          debugStore.error("[SyncStore] Background sync failed", err);
        });
      }

      if (this.status === "loading") {
        debugStore.log(
          `[SyncStore] Load complete. Indexed ${this.syncStats.created} entities.`,
        );
        this.status = "idle";
      }

      await this.deps.loadMaps(vaultIdAtStart);
      await this.deps.loadCanvases(vaultIdAtStart);

      vaultEventBus.emit({
        type: "SYNC_COMPLETE",
        vaultId: vaultIdAtStart,
      });
    } catch (err: any) {
      debugStore.error("[SyncStore] Load failed", err);
      this.status = "error";
      this.errorMessage = err.message;
    } finally {
      if (!signal.aborted) {
        await this.checkForConflicts(signal);
      }
      if ((this.status as string) !== "error" && !signal.aborted) {
        this.status = "idle";
      }
    }
  }

  async syncWithLocalFolder() {
    const activeVaultId = this.deps.activeVaultId();
    if (!activeVaultId) return;
    const vaultIdAtStart = activeVaultId;

    const syncCoordinator = await this.deps.getSyncCoordinator();
    if (!syncCoordinator) return;

    const opfsHandle = await this.deps.getActiveVaultHandle();
    if (!opfsHandle) return;

    await syncCoordinator.syncWithLocalFolder(
      vaultIdAtStart,
      opfsHandle,
      this.deps.repository.entities,
      () => this.deps.repository.waitForAllSaves(),
      (state) => {
        if (this.deps.activeVaultId() === vaultIdAtStart) {
          this.status = state.status;
          this.syncType = state.syncType;
          if (state.errorMessage) this.errorMessage = state.errorMessage;
        }
      },
      () => this.checkForConflicts(),
    );
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
        if (!signal?.aborted) this.status = status;
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
    this.status = s;
  }

  setErrorMessage(m: string | null) {
    this.errorMessage = m;
  }

  setHasConflictFiles(v: boolean) {
    this.hasConflictFiles = v;
  }
}
