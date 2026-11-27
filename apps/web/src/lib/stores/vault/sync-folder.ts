import type { SyncCoordinator } from "@codex/vault-engine";
import { appEventBus } from "@codex/events";
import { cacheService } from "../../services/cache.svelte";
import { debugStore } from "../debug.svelte";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { systemClock } from "#lib/utils/runtime-deps.js";
import type { VaultSyncContext } from "./sync-context";
import type { VaultSyncState } from "./sync-state.svelte";
import type { LoadFilesOptions } from "./sync-types";

/** Local-folder permissions and foreground, deferred and interactive transfers. */
export class VaultFolderSync {
  constructor(
    private context: VaultSyncContext,
    private state: VaultSyncState,
    private reload: (
      skipSyncIfWarm?: boolean,
      options?: LoadFilesOptions,
    ) => Promise<void>,
    private checkForConflicts: () => Promise<void>,
  ) {}

  private get deps() {
    return this.context.deps;
  }

  private async ensureFolderPermission(
    handle: FileSystemDirectoryHandle,
  ): Promise<boolean> {
    try {
      if ((await handle.queryPermission({ mode: "readwrite" })) === "granted")
        return true;
      if ((await handle.requestPermission({ mode: "readwrite" })) === "granted")
        return true;
      return this.denyFolderPermission();
    } catch (err) {
      debugStore.error("[SyncStore] Failed to ensure folder permission", err);
      return this.denyFolderPermission();
    }
  }

  private denyFolderPermission(): false {
    this.state.setStatus("needs-permission");
    this.state.errorMessage = "Permission denied for local folder.";
    notificationStore.notify("Permission denied for local folder.", "error");
    return false;
  }

  async queryAutoSyncPermission(isDemo: boolean) {
    let skipLocalSync = false;
    const localHandle = await this.deps.getActiveFolderHandle();
    this.state.hasFolderHandle = !!localHandle;
    if (localHandle && !isDemo) {
      try {
        const permission = await localHandle.queryPermission({
          mode: "readwrite",
        });
        if (permission !== "granted") {
          debugStore.log(
            `[SyncStore] Local folder permission is ${permission}. Skipping auto-sync.`,
          );
          this.state.setStatus("needs-permission");
          skipLocalSync = true;
        }
      } catch (err) {
        debugStore.warn(
          "[SyncStore] Failed to query local folder permission silently",
          err,
        );
      }
    }
    return { localHandle, skipLocalSync };
  }

  private async executePull(
    syncCoordinator: SyncCoordinator,
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
      () => this.context.waitForSaves(),
      (state: {
        status: "saving" | "loading" | "idle" | "error";
        syncType: "local" | null;
        errorMessage?: string;
      }) => {
        if (this.context.isStale(vaultIdAtStart, signal)) return;
        onStateChange(state);
      },
      () => this.checkForConflicts(),
      onProgress ? { signal, onProgress } : { signal },
    );
  }

  private emitLocalComplete(direction: "push" | "pull", vaultId: string): void {
    appEventBus.emit({
      type:
        direction === "push"
          ? "SYNC:LOCAL_PUSH_COMPLETE"
          : "SYNC:LOCAL_PULL_COMPLETE",
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
  ): Promise<SyncCoordinator | null> {
    const localHandle = await this.deps.getActiveFolderHandle();
    if (this.context.isStale(vaultIdAtStart, signal)) return null;
    this.state.hasFolderHandle = !!localHandle;
    if (!localHandle) return null;

    const permission = await localHandle.queryPermission({
      mode: "readwrite",
    });
    if (this.context.isStale(vaultIdAtStart, signal)) return null;
    if (permission !== "granted") {
      this.state.setStatus("needs-permission");
      return null;
    }

    await this.deps.ensureServicesInitialized();
    if (this.context.isStale(vaultIdAtStart, signal)) return null;
    const syncCoordinator = await this.deps.getSyncCoordinator();
    if (!syncCoordinator || this.context.isStale(vaultIdAtStart, signal))
      return null;
    return syncCoordinator;
  }

  async runDeferred(
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

      await this.executePull(
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

      if (localSyncFailed || this.context.isStale(vaultIdAtStart, signal))
        return;

      this.emitLocalComplete("pull", vaultIdAtStart);
      await cacheService.clearVault(vaultIdAtStart);
      if (this.context.isStale(vaultIdAtStart, signal)) return;
      await this.reload(false, { deferAuxiliary: true });
    } catch {
      if (!this.context.isStale(vaultIdAtStart, signal)) {
        onDegraded?.("local_sync");
      }
    }
  }

  async pullBeforeLoad(
    vaultId: string,
    vaultDir: FileSystemDirectoryHandle,
    signal: AbortSignal,
  ): Promise<boolean> {
    this.state.loadPhase = "syncing";
    debugStore.log(
      `[SyncStore] Local sync handle found for ${vaultId}. Synchronizing...`,
    );
    await this.deps.ensureServicesInitialized();
    const coordinator = await this.deps.getSyncCoordinator();
    if (!coordinator) return true;
    try {
      await this.executePull(
        coordinator,
        vaultId,
        vaultDir,
        signal,
        (state) => {
          this.state.setStatus(state.status);
          if (state.errorMessage) this.state.errorMessage = state.errorMessage;
        },
        (stats) => {
          if (!this.context.isStale(vaultId, signal)) {
            this.state.syncStats = { ...this.state.syncStats, ...stats };
          }
        },
      );
      if (signal.aborted) return false;
      debugStore.log("[SyncStore] Local sync complete.");
      this.emitLocalComplete("pull", vaultId);
    } catch (err) {
      debugStore.error("[SyncStore] Local sync failed", err);
    }
    return true;
  }

  async saveToFolder() {
    const vaultId = this.deps.activeVaultId();
    if (vaultId) await this.transfer("push", vaultId);
  }

  async loadFromFolder() {
    const vaultId = this.deps.activeVaultId();
    if (!vaultId) return;
    if (this.state.isDirty && !(await this.confirmOverwrite())) return;
    await this.transfer("pull", vaultId);
  }

  private confirmOverwrite() {
    return notificationStore.confirm({
      title: "Overwrite Internal Work?",
      message:
        "Warning: You have unsaved internal changes. Loading from the folder will overwrite your current work. Continue?",
      confirmLabel: "Overwrite and Load",
      isDangerous: true,
    });
  }

  private async transfer(direction: "push" | "pull", vaultId: string) {
    const target = await this.context.resolveTarget();
    if (!target) return;
    const localHandle = await this.deps.getActiveFolderHandle();
    if (localHandle && !(await this.ensureFolderPermission(localHandle)))
      return;
    this.state.failedFiles = [];
    try {
      await target.coordinator[direction](
        vaultId,
        target.handle,
        this.deps.repository.entities,
        () => this.context.waitForSaves(),
        (state) => this.applyTransferState(vaultId, state),
        this.checkForConflicts,
        { interactive: true },
      );
      if (this.context.isStale(vaultId) || this.state.currentStatus === "error")
        return;
      await this.completeTransfer(direction, vaultId);
    } finally {
      // A vault switch suppresses coordinator callbacks; release its spinner.
      if (
        this.state.currentStatus === "saving" ||
        this.state.currentStatus === "loading"
      ) {
        this.state.setStatus("idle");
      }
    }
  }

  private applyTransferState(
    vaultId: string,
    state: Parameters<Parameters<SyncCoordinator["push"]>[4]>[0],
  ) {
    if (this.context.isStale(vaultId)) return;
    this.state.setStatus(state.status);
    this.state.syncType = state.syncType;
    if (state.errorMessage) this.state.errorMessage = state.errorMessage;
    if (state.failedFiles) this.state.failedFiles = state.failedFiles;
  }

  private async completeTransfer(direction: "push" | "pull", vaultId: string) {
    if (direction === "push") {
      const { updateLastSavedToFolder } = await import("./registry");
      await updateLastSavedToFolder(vaultId);
      this.emitLocalComplete(direction, vaultId);
      this.state.setStatus("saved");
    } else {
      this.emitLocalComplete(direction, vaultId);
      // A folder pull changes OPFS; a warm cache still holds the pre-pull data.
      await cacheService.clearVault(vaultId);
      await this.reload(false);
    }
  }
}
