import { VaultSyncCache } from "./sync-cache";
import { VaultSyncAuxiliary } from "./sync-auxiliary";
import { VaultFileLoader } from "./sync-loader";
import { VaultFolderSync } from "./sync-folder";
import { VaultSyncContext } from "./sync-context";
import { VaultSyncConflicts } from "./sync-conflicts";
import { VaultSyncState } from "./sync-state.svelte";
import type { LoadFilesOptions, SyncStoreDependencies } from "./sync-types";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import { appEventBus } from "@codex/events";
import { updateLastInternalChange } from "./registry";
import { browserPerformanceCapture } from "#lib/services/performance/browser-performance-capture.js";

export {
  VaultSyncError,
  type LoadFilesOptions,
  type SyncStoreDependencies,
} from "./sync-types";

export class SyncStore {
  private state: VaultSyncState;
  private conflicts: VaultSyncConflicts;
  private folder: VaultFolderSync;
  private cache: VaultSyncCache;
  private loader: VaultFileLoader;

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

  constructor(private deps: SyncStoreDependencies) {
    this.state = new VaultSyncState(deps);
    const context = new VaultSyncContext(deps);
    this.conflicts = new VaultSyncConflicts(context, this.state, () =>
      this.loadFiles(),
    );
    this.folder = new VaultFolderSync(
      context,
      this.state,
      (skip, options) => this.loadFiles(skip, options),
      () => this.checkForConflicts(),
    );
    this.cache = new VaultSyncCache(context, (skip, options) =>
      this.loadFiles(skip, options),
    );
    const auxiliary = new VaultSyncAuxiliary(context, (signal) =>
      this.conflicts.scan(signal),
    );
    this.loader = new VaultFileLoader(
      context,
      this.state,
      this.cache,
      this.folder,
      auxiliary,
      (signal) => this.checkForConflicts(signal),
    );
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

  loadFiles(skipSyncIfWarm = true, options: LoadFilesOptions = {}) {
    return this.loader.loadFiles(skipSyncIfWarm, options);
  }

  saveToFolder() {
    return this.folder.saveToFolder();
  }

  reloadFromDisk() {
    return this.cache.reloadFromDisk();
  }

  loadFromFolder() {
    return this.folder.loadFromFolder();
  }

  cleanupConflictFiles(signal?: AbortSignal) {
    return this.conflicts.cleanup(signal);
  }

  checkForConflicts(signal?: AbortSignal) {
    return this.conflicts.check(signal);
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
