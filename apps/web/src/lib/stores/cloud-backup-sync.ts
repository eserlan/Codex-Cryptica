import { onlineStatus } from "./online.svelte";
import {
  AUTO_SYNC_DEBOUNCE_MS,
  AUTO_SYNC_RETRY_MS,
  type CloudBackupDepsProvider,
  type CloudBackupViewState,
  type SnapshotOutcome,
} from "./cloud-backup-types";
import type { CloudBackupUploads } from "./cloud-backup-uploads";

type SyncState = Pick<
  CloudBackupViewState,
  | "status"
  | "errorMessage"
  | "autoState"
  | "autoConflictRemoteAt"
  | "uploadProgress"
>;

/** Manual, automatic and conflict-resolution save orchestration and lifecycle triggers. */
export class CloudBackupSync {
  private pending = false;
  private autoTimer: ReturnType<typeof setTimeout> | null = null;
  private autoListenersAttached = false;

  constructor(
    private state: SyncState,
    private getDeps: CloudBackupDepsProvider,
    private uploads: Pick<CloudBackupUploads, "pushing" | "pushSnapshot">,
  ) {}
  private get deps() {
    return this.getDeps();
  }

  reset(): void {
    this.clearTimer();
    this.pending = false;
    this.state.autoConflictRemoteAt = null;
    this.state.autoState = "idle";
  }

  /**
   * Uploads the vault's current state, replacing the previous backup.
   *
   * Explicit — the user presses "Save to cloud". Never throws and never reports
   * success it did not have: a failure becomes a visible error state and the
   * local vault is entirely unaffected (FR-011, FR-019). A successful manual
   * save also satisfies pending autosync and explicitly resolves a conflict
   * (the user chose to overwrite by pressing the button).
   */
  async backUpNow(): Promise<boolean> {
    if (!this.deps || this.uploads.pushing) return false;
    const vaultId = this.deps.activeVaultId();
    if (!vaultId) return false;

    this.uploads.pushing = true;
    this.state.status = "syncing";
    try {
      const out = await this.uploads.pushSnapshot(vaultId, { guarded: false });
      return this.applyManualOutcome(out);
    } catch (error) {
      // Reading the vault can fail; the caller drives a button state off this.
      return this.failManualSave(
        error instanceof Error ? error.message : "Cloud backup failed.",
      );
    } finally {
      this.uploads.pushing = false;
      this.state.uploadProgress = null;
      if (this.pending && !this.autoTimer) this.scheduleAutoPush();
    }
  }

  private applyManualOutcome(out: SnapshotOutcome): boolean {
    if (out.notEnabled) {
      this.state.status = "off";
      return false;
    }
    if (!out.ok)
      return this.failManualSave(out.error ?? "Cloud backup failed.");
    this.state.status = "idle";
    this.state.errorMessage = null;
    this.pending = false;
    this.state.autoConflictRemoteAt = null;
    if (this.state.autoState !== "idle") this.state.autoState = "saved";
    return true;
  }

  private failManualSave(error: string): false {
    this.state.status = "error";
    this.state.errorMessage = error;
    return false;
  }
  /**
   * Called when a durable local write lands (wired once from app init via
   * `onDurableVaultChange`). Schedules a debounced guarded push when backup
   * is enabled; never uploads anything synchronously and never throws.
   */
  notifyLocalChange(vaultId?: string): void {
    if (!this.deps) return;
    const active = vaultId ?? this.deps.activeVaultId();
    if (!active || this.state.status === "off") return;
    // A conflict pauses automation until the user reconciles — further edits
    // must not silently queue an overwrite.
    if (this.state.autoState === "conflict") return;
    this.pending = true;
    this.state.autoState = onlineStatus.current ? "pending" : "offline";
    this.scheduleAutoPush();
  }

  /**
   * Attempts an immediate auto-push (lifecycle flushes, reconnects, tests).
   * No-op when backup is off, conflict-paused, or already pushing (the
   * in-flight push chains the pending work in its `finally`).
   */
  async flushAutoSync(): Promise<boolean> {
    const vaultId = this.autoSyncVaultId();
    if (!vaultId) return false;
    if (!onlineStatus.current) {
      return this.deferAutoSyncOffline();
    }
    if (this.uploads.pushing) {
      return this.deferAutoSyncWhilePushing();
    }
    this.clearTimer();
    this.uploads.pushing = true;
    this.state.autoState = "saving";
    try {
      return await this.completeAutoSync(vaultId);
    } finally {
      this.finishAutoSyncPush();
    }
  }

  private autoSyncVaultId(): string | null {
    if (!this.deps || this.state.autoState === "conflict") return null;
    const vaultId = this.deps.activeVaultId();
    return vaultId && this.state.status !== "off" ? vaultId : null;
  }

  private deferAutoSyncOffline(): false {
    this.state.autoState = "offline";
    this.pending = true;
    return false;
  }

  private deferAutoSyncWhilePushing(): false {
    this.pending = true;
    if (this.state.autoState !== "saving") this.state.autoState = "pending";
    return false;
  }

  private async completeAutoSync(vaultId: string): Promise<boolean> {
    const out = await this.uploads.pushSnapshot(vaultId, { guarded: true });
    if (out.notEnabled) return this.stopAutoSyncBackupOff();
    if (out.ok) {
      this.pending = false;
      this.state.autoState = "saved";
      this.state.status = "idle";
      this.state.errorMessage = null;
      return true;
    }
    if (out.conflict) return this.pauseAutoSyncOnConflict(out);
    // Ordinary failure: local data is untouched; stay pending and retry
    // with backoff. Offline flips to the offline state instead.
    this.pending = true;
    this.state.autoState = onlineStatus.current ? "retrying" : "offline";
    this.state.errorMessage = out.error ?? "Cloud backup failed.";
    this.scheduleAutoPush(this.deps?.retryMs ?? AUTO_SYNC_RETRY_MS);
    return false;
  }

  /**
   * Off is a stop, not a failure: retrying would rebuild the whole-vault
   * snapshot on a timer for a push that can never be sent.
   */
  private stopAutoSyncBackupOff(): false {
    this.pending = false;
    this.state.autoState = "idle";
    this.state.status = "off";
    return false;
  }

  private pauseAutoSyncOnConflict(out: SnapshotOutcome): false {
    this.pending = false;
    this.state.autoState = "conflict";
    this.state.autoConflictRemoteAt = out.remoteAt ?? null;
    this.state.errorMessage = out.error ?? "Cloud backup failed.";
    return false;
  }

  private deferConflictRetry(error?: string): void {
    this.pending = true;
    this.state.autoState = "retrying";
    this.state.errorMessage = error ?? "Cloud backup failed.";
    this.scheduleAutoPush(this.deps?.retryMs ?? AUTO_SYNC_RETRY_MS);
  }

  private finishAutoSyncPush(): void {
    this.uploads.pushing = false;
    this.state.uploadProgress = null;
    // Chain work that arrived mid-push — unless a retry timer is already
    // armed (scheduling again would replace the backoff with the debounce).
    if (
      this.pending &&
      !this.autoTimer &&
      this.state.autoState !== "conflict"
    ) {
      this.scheduleAutoPush();
    }
  }

  /**
   * Conflict resolution: push the local vault over the remote ("keep mine").
   * Explicit and unguarded — the user has seen both versions and chosen.
   * Clears the conflict state on success.
   */
  async resolveConflictKeepMine(): Promise<boolean> {
    if (!this.deps || this.state.autoState !== "conflict") return false;
    const vaultId = this.deps.activeVaultId();
    if (!vaultId || this.state.status === "off" || this.uploads.pushing)
      return false;
    this.uploads.pushing = true;
    this.state.autoState = "saving";
    try {
      const out = await this.uploads.pushSnapshot(vaultId, { guarded: false });
      if (!out.ok) {
        // The choice stands but the push failed: stay pending and retry with
        // backoff, or "retrying" is a label for a retry that never comes.
        this.deferConflictRetry(out.error);
        return false;
      }
      this.state.autoConflictRemoteAt = null;
      this.pending = false;
      this.state.autoState = "saved";
      this.state.status = "idle";
      this.state.errorMessage = null;
      return true;
    } finally {
      this.uploads.pushing = false;
      this.state.uploadProgress = null;
    }
  }

  /** Attaches online/visibility/close flush triggers. Idempotent. */
  startAutoSyncListeners(): void {
    if (this.autoListenersAttached || typeof window === "undefined") return;
    this.autoListenersAttached = true;
    window.addEventListener("online", this.handleOnline);
    document.addEventListener("visibilitychange", this.handleVisibility);
    // Best effort: the page may die mid-flight, which just leaves the
    // pending flag set for the next startup catch-up.
    window.addEventListener("pagehide", this.handlePageHide);
  }

  /** Detaches lifecycle triggers; used on teardown and in tests. */
  stopAutoSyncListeners(): void {
    if (!this.autoListenersAttached || typeof window === "undefined") return;
    this.autoListenersAttached = false;
    window.removeEventListener("online", this.handleOnline);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    window.removeEventListener("pagehide", this.handlePageHide);
  }

  private handleOnline = (): void => {
    if (this.pending) void this.flushAutoSync();
  };

  private handleVisibility = (): void => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden" &&
      this.pending
    ) {
      void this.flushAutoSync();
    }
  };

  private handlePageHide = (): void => {
    // Only a pending queue justifies close-time work: an unconditional flush
    // would write a fresh commit (and a new remote timestamp) on every tab
    // hide, manufacturing cross-device divergence for other devices to trip
    // over. Matches the handleOnline gate.
    if (this.pending) void this.flushAutoSync();
  };

  private scheduleAutoPush(
    delayMs = this.deps?.debounceMs ?? AUTO_SYNC_DEBOUNCE_MS,
  ): void {
    this.clearTimer();
    this.autoTimer = setTimeout(() => {
      this.autoTimer = null;
      void this.flushAutoSync();
    }, delayMs);
  }

  clearTimer(): void {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }
}
