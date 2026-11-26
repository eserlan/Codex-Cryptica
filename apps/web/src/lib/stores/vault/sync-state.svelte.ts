import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import type { SyncStoreDependencies } from "./sync-types";

/** Reactive sync progress, dirty detection and the saved-status timer. */
export class VaultSyncState {
  currentStatus = $state<
    "idle" | "loading" | "saving" | "saved" | "needs-permission" | "error"
  >("idle");
  errorMessage = $state<string | null>(null);
  syncType = $state<"local" | null>(null);
  /**
   * Which phase of a load is currently running. Drives a phase-aware loading
   * indicator: "scanning"/"syncing" have no determinate progress (show an
   * indeterminate bar), while "parsing" reports real `syncStats.progress`.
   */
  loadPhase = $state<null | "scanning" | "syncing" | "parsing">(null);
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
    if (this.currentStatus === "loading") return "loading";
    if (this.currentStatus === "error") return "error";
    if (this.currentStatus === "needs-permission") return "needs-permission";
    if (this.currentStatus === "saved") return "saved";
    if (this.deps.repository.pendingSaveCount > 0) return "saving";
    return this.currentStatus;
  }

  get isDirty() {
    const record = this.deps.activeVaultRecord();
    if (!record) return false;
    if (sessionModeStore.isDemoMode || this.status === "loading") return false;
    return (record.lastInternalChange || 0) > (record.lastSavedToFolder || 0);
  }

  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private deps: Pick<
      SyncStoreDependencies,
      "repository" | "activeVaultRecord"
    >,
  ) {}

  private clearSavedTimer() {
    if (this.savedTimer) {
      clearTimeout(this.savedTimer);
      this.savedTimer = null;
    }
  }

  dispose() {
    this.clearSavedTimer();
  }

  setStatus(
    s: "idle" | "loading" | "saving" | "saved" | "needs-permission" | "error",
  ) {
    this.clearSavedTimer();
    this.currentStatus = s;
    if (s === "saved") {
      this.savedTimer = setTimeout(() => {
        if (this.currentStatus === "saved") {
          this.currentStatus = "idle";
        }
      }, 2500);
    }
  }
}
