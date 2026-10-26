import { CloudBackupUploads } from "./cloud-backup-uploads";
import type { SnapshotOutcome } from "./cloud-backup-types";
import {
  attachCloudBackup,
  enableCloudBackup,
  disableCloudBackup,
  deleteCloudBackup,
  restoreVaultFromCloudBackup,
  getLocalCloudBackupRecord,
  getCloudBackupOwnershipCode,
  formatRecoveryKey,
  listKnownCloudBackups,
  fetchCloudBackupIndex,
  type KnownCloudBackup,
} from "@codex/cloud-backup-sync";
import { hashCloudBackupEntity, type LocalCloudBackupRecord } from "schema";
import { onlineStatus } from "./online.svelte";

import type { DurableVaultChange } from "./vault/registry";

export { cloudBackupBrowserStorage } from "./cloud-backup-browser-storage";

/**
 * Cloud Backup status store (spec 162, issue #2593).
 *
 * Thin: all backup logic lives in `@codex/cloud-backup-sync` (Library-First).
 * What this owns is the app-side wiring — reading the record back on load,
 * mirroring status for Settings, and turning vault saves into pushes.
 *
 * **Automatic background sync when enabled (#3189).** Enabling Cloud Save now
 * implies continuous backup: durable local writes schedule a debounced push a
 * few seconds after editing settles, offline changes wait for connectivity,
 * and closing or hiding the tab flushes a final sync where practical. Manual
 * "Save to cloud" remains as an explicit fallback that pushes immediately,
 * unguarded.
 *
 * The earlier manual-only model ("backing up is a deliberate act") was
 * reversed because an enabled-but-stale backup reads as protection that is
 * not there. The deliberate act is now *enabling*; everything after that is
 * automatic, and "off" still means absolutely nothing leaves the device
 * (FR-001, FR-003, SC-002).
 *
 * Conflict safety is best-effort client-side: an auto-push reads the remote
 * state first and aborts — uploading nothing — when another device committed
 * since our last push, preserving both versions for the user to reconcile.
 * A true race still needs server revisions (follow-up, documented in #3189).
 */

import {
  AUTO_SYNC_DEBOUNCE_MS,
  AUTO_SYNC_RETRY_MS,
  RECONCILE_DELAY_MS,
  type CloudBackupStatus,
  type CloudAutoSyncState,
  type CloudBackupDeps,
} from "./cloud-backup-types";
export {
  AUTO_SYNC_DEBOUNCE_MS,
  AUTO_SYNC_RETRY_MS,
  RECONCILE_DELAY_MS,
  type CloudBackupStatus,
  type CloudAutoSyncState,
  type CloudBackupDeps,
} from "./cloud-backup-types";
import { restoreCloudBackupIntoNewVault } from "./cloud-backup-restore";

/**
 * Entities to mark for the consistency check: any the remote lacks or holds
 * differently (bodies compared only when already loaded here), and any the
 * remote holds that no longer exist locally.
 */
async function diffAgainstRemote(
  local: { id: string; loaded: boolean; entity: unknown }[],
  remote: Record<string, string>,
): Promise<{ upserts: string[]; deletes: string[] }> {
  const upserts: string[] = [];
  const present = new Set<string>();
  for (const { id, loaded, entity } of local) {
    present.add(id);
    const stale =
      !(id in remote) ||
      (loaded && (await hashCloudBackupEntity(entity)) !== remote[id]);
    if (stale) upserts.push(id);
  }
  const deletes = Object.keys(remote).filter((id) => !present.has(id));
  return { upserts, deletes };
}

export class CloudBackupStore {
  status = $state<CloudBackupStatus>("off");
  lastPushedAt = $state<string | null>(null);
  errorMessage = $state<string | null>(null);
  ownerCode = $state<string | null>(null);
  /** Backup id and code as one copyable value; see `revealRecoveryKey`. */
  recoveryKey = $state<string | null>(null);
  /**
   * Backups this device already holds the key to, newest first. Offered on the
   * restore form so a key that is already stored never has to be typed back in.
   */
  knownBackups = $state<KnownCloudBackup[]>([]);
  /** Media the last save could not read. Non-empty means a partial copy. */
  skippedAssets = $state<string[]>([]);
  /** Entity ids whose markdown body could not be read for the last backup. */
  skippedEntities = $state<string[]>([]);
  /**
   * Files sent so far in the current save, and how many there are. Media goes
   * up one request at a time, so a large vault takes long enough that silence
   * would read as a hang.
   */
  uploadProgress = $state<{ uploaded: number; total: number } | null>(null);
  /** True once a consent decision exists for this vault, in either direction. */
  consented = $state(false);
  /** Ephemeral automatic-sync state (#3189); never persisted. */
  autoState = $state<CloudAutoSyncState>("idle");
  /**
   * Remote timestamp that conflicted with our push, if any. Set only in the
   * conflict state: automation stays paused until the user reconciles, and
   * both versions are preserved (local untouched, remote untouched).
   */
  autoConflictRemoteAt = $state<string | null>(null);

  private deps: CloudBackupDeps | null = null;
  /**
   * Vault whose first backup is being built. Its record is not enabled yet,
   * but an edit made meanwhile must still be tracked or it would be missing
   * from both the first backup and the change set.
   */
  private enablingVaultId: string | null = null;
  private reconcileTimer: ReturnType<typeof setTimeout> | null = null;
  private autoPending = false;
  private autoTimer: ReturnType<typeof setTimeout> | null = null;
  private autoListenersAttached = false;
  private uploads = new CloudBackupUploads(this, () => this.deps);

  /** Wires the store up. Called once from app init with the real runtime. */
  configure(deps: CloudBackupDeps) {
    this.deps = deps;
  }

  /**
   * Reads the stored record back so a previously-enabled vault shows its real
   * state rather than a fresh consent prompt (FR-020).
   */
  async hydrate(vaultId: string) {
    if (!this.deps) return;
    // Clear the previous vault's state, so the status on screen never keeps
    // describing the vault the user has left.
    this.errorMessage = null;
    this.clearAutoTimer();
    this.clearReconcileTimer();
    this.autoPending = false;
    this.autoConflictRemoteAt = null;
    this.autoState = "idle";

    const record = await getLocalCloudBackupRecord(this.deps.runtime, vaultId);
    this.applyRecord(record);
    this.uploads.media.load(vaultId);
    // Catch-up: sync resumes when the user returns, guarded so a newer
    // remote can never be overwritten by a stale return.
    if (this.status !== "off") {
      this.notifyLocalChange(vaultId);
      this.scheduleReconcile(vaultId);
    }
  }

  /** Runs the consistency check once, after the vault has settled. */
  private scheduleReconcile(vaultId: string): void {
    this.clearReconcileTimer();
    if (!this.deps?.listLocalEntities || !this.deps.dirty) return;
    this.reconcileTimer = setTimeout(() => {
      this.reconcileTimer = null;
      void this.reconcileWithRemote(vaultId);
    }, this.deps.reconcileDelayMs ?? RECONCILE_DELAY_MS);
  }

  private clearReconcileTimer(): void {
    if (this.reconcileTimer) {
      clearTimeout(this.reconcileTimer);
      this.reconcileTimer = null;
    }
  }

  /**
   * Idle consistency check (FR-023): marks as changed anything the remote
   * holds differently — missing, extra, or a different body for an entity
   * already loaded here. Catches a write path that failed to report a change.
   * Compares hashes only, and never reads an entity body just for the check.
   * Returns how many changes it recorded.
   */
  async reconcileWithRemote(vaultId: string): Promise<number> {
    const deps = this.deps;
    if (!deps?.dirty || !deps.listLocalEntities) return 0;
    const index = await fetchCloudBackupIndex(deps.runtime, vaultId);
    if (!index.ok || this.status === "off") return 0;

    const { upserts, deletes } = await diffAgainstRemote(
      deps.listLocalEntities(),
      index.value,
    );
    if (upserts.length > 0) {
      await deps.dirty.record(vaultId, { kind: "entity", ids: upserts });
    }
    if (deletes.length > 0) {
      await deps.dirty.record(vaultId, {
        kind: "entity",
        ids: deletes,
        deleted: true,
      });
    }
    const recorded = upserts.length + deletes.length;
    if (recorded > 0) this.notifyLocalChange(vaultId);
    return recorded;
  }

  private applyRecord(record: LocalCloudBackupRecord | null) {
    this.consented = Boolean(record);
    this.ownerCode = record?.ownerCode ?? null;
    this.lastPushedAt = record?.lastPushedAt ?? null;
    this.status = record?.enabled ? (record.status ?? "idle") : "off";
  }

  /**
   * Turns backup on. Must only be called once the user has confirmed the
   * consent screen — this is where vault data first leaves the device.
   */
  async enable(vaultId: string): Promise<boolean> {
    if (!this.deps) return false;
    this.status = "syncing";
    this.errorMessage = null;
    this.enablingVaultId = vaultId;

    try {
      const payload = await this.deps.buildPayload(vaultId);
      const result = await enableCloudBackup(
        this.deps.runtime,
        vaultId,
        payload,
      );
      if (!result.ok) {
        this.status = "error";
        this.errorMessage = result.error;
        return false;
      }
      this.applyRecord(result.value);
      return true;
    } catch (error) {
      // Reading the vault can fail. Callers drive a disabled/busy flag off this
      // promise, so it must resolve rather than throw or they stay stuck.
      this.status = "error";
      this.errorMessage =
        error instanceof Error ? error.message : "Could not read this vault.";
      return false;
    } finally {
      this.enablingVaultId = null;
    }
  }

  /**
   * Links the open vault to an existing cloud backup (attach).
   *
   * The counterpart to `enable` (a new backup) and `restoreIntoNewVault` (a
   * new vault): a vault that is already on this device adopts the cloud copy
   * for its future saves. The baseline is the remote timestamp at attach
   * time, so the guarded auto-push pauses — instead of overwriting — if
   * another device commits in between. The full-push marker is persisted
   * before attaching, so a storage failure cannot leave the new link relying
   * on stale change rows from a different backup.
   */
  async attachToExistingBackup(
    vaultId: string,
    backupId: string,
    ownerCode: string,
    vaultTitle?: string,
  ): Promise<boolean> {
    if (!this.deps) return false;
    try {
      // Persist this before linking the backup. A missing marker would let
      // stale rows describe changes to an unrelated remote snapshot.
      await this.deps.dirty?.requireFullPush(vaultId);
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : "Could not prepare a full cloud backup.";
      return false;
    }

    let result: Awaited<ReturnType<typeof attachCloudBackup>>;
    try {
      result = await attachCloudBackup(
        this.deps.runtime,
        vaultId,
        { backupId, ownerCode },
        vaultTitle !== undefined ? { vaultTitle } : {},
      );
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : "Could not reach this cloud backup.";
      return false;
    }
    if (!result.ok) {
      this.errorMessage = result.error;
      return false;
    }
    this.applyRecord(result.value);
    this.uploads.media.reset(vaultId);
    this.autoPending = false;
    this.autoConflictRemoteAt = null;
    this.autoState = "idle";
    this.errorMessage = null;
    return true;
  }

  /** Stops future pushes. Local only — the remote copy is untouched (FR-009). */
  async disable(vaultId: string) {
    // Disabling stops automation cold: no pending push may survive it, or
    // "off" would stop meaning "nothing leaves the device".
    await this.uploads.cancel();
    this.clearAutoTimer();
    this.clearReconcileTimer();
    this.autoPending = false;
    this.autoConflictRemoteAt = null;
    this.autoState = "idle";
    if (!this.deps) return;
    await disableCloudBackup(this.deps.runtime, vaultId);
    // Changes made while off are never recorded, so the pending set would be
    // incomplete by the time backup is re-enabled — which re-uploads in full.
    await this.deps.dirty?.clearVault(vaultId);
    this.status = "off";
    this.errorMessage = null;
  }

  /** Permanently erases the remote copy (FR-010). */
  async deleteBackup(vaultId: string): Promise<boolean> {
    if (!this.deps) return false;
    const result = await deleteCloudBackup(this.deps.runtime, vaultId);
    if (!result.ok) {
      this.status = "error";
      this.errorMessage = result.error;
      return false;
    }
    this.applyRecord(null);
    return true;
  }

  /**
   * Fetches a backup for restore. Returns the material rather than writing it,
   * so the caller decides the destination (FR-006a) after confirming.
   */
  async fetchForRestore(backupId: string, ownerCode: string) {
    if (!this.deps) return null;
    const result = await restoreVaultFromCloudBackup(this.deps.runtime, {
      backupId,
      ownerCode,
    });
    if (!result.ok) {
      this.errorMessage = result.error;
      return null;
    }
    return result.value;
  }

  /**
   * Restores a backup into a brand-new vault (FR-006a).
   *
   * The download is staged first and the new vault is only created once the
   * material is in hand, so a failure mid-transfer leaves the user exactly
   * where they were — no half-built vault, and nothing they already had is
   * touched (FR-011). Restoring *into* an existing vault is deliberately not
   * offered here; that path needs its own overwrite confirmation.
   */
  async restoreIntoNewVault(
    backupId: string,
    ownerCode: string,
  ): Promise<{
    vaultId: string;
    vaultTitle: string;
    missingAssets: number;
  } | null> {
    if (!this.deps?.restore) {
      this.errorMessage = "Restore is not available in this context.";
      return null;
    }

    const material = await this.fetchForRestore(backupId, ownerCode);
    if (!material) return null;

    try {
      return await restoreCloudBackupIntoNewVault(
        this.deps.runtime,
        this.deps.restore,
        { backupId, ownerCode },
        material,
      );
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : "The backup could not be restored.";
      return null;
    }
  }

  async revealOwnerCode(vaultId: string): Promise<string | null> {
    if (!this.deps) return null;
    this.ownerCode = await getCloudBackupOwnershipCode(
      this.deps.runtime,
      vaultId,
    );
    return this.ownerCode;
  }

  /** Refreshes the list of backups this device can restore without a key. */
  async loadKnownBackups(): Promise<void> {
    if (!this.deps) return;
    this.knownBackups = await listKnownCloudBackups(this.deps.runtime);
  }

  /**
   * The one value a user needs to restore this vault elsewhere.
   *
   * Restoring takes a backup id as well as the code, and the id was never
   * shown anywhere — so a user who copied only the code could not restore at
   * all. Both travel together instead.
   */
  async revealRecoveryKey(vaultId: string): Promise<string | null> {
    if (!this.deps) return null;
    const record = await getLocalCloudBackupRecord(this.deps.runtime, vaultId);
    const code = await this.revealOwnerCode(vaultId);
    if (!record?.backupId || !code) return null;
    this.recoveryKey = formatRecoveryKey(record.backupId, code);
    return this.recoveryKey;
  }

  /* ------------------------------------------------------------ backing up */

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
    this.status = "syncing";
    try {
      const out = await this.uploads.pushSnapshot(vaultId, { guarded: false });
      if (!out.ok) {
        if (out.notEnabled) {
          // Not enabled for this vault — nothing was sent.
          this.status = "off";
          return false;
        }
        this.status = "error";
        this.errorMessage = out.error ?? "Cloud backup failed.";
        return false;
      }
      this.status = "idle";
      this.errorMessage = null;
      this.autoPending = false;
      this.autoConflictRemoteAt = null;
      if (this.autoState !== "idle") this.autoState = "saved";
      return true;
    } catch (error) {
      // Reading the vault can fail; the caller drives a button state off this.
      this.status = "error";
      this.errorMessage =
        error instanceof Error ? error.message : "Cloud backup failed.";
      return false;
    } finally {
      this.uploads.pushing = false;
      this.uploadProgress = null;
      if (this.autoPending && !this.autoTimer) this.scheduleAutoPush();
    }
  }

  /** Releases the injected dependencies; used on teardown and in tests. */
  destroy() {
    this.stopAutoSyncListeners();
    this.clearAutoTimer();
    this.clearReconcileTimer();
    this.deps = null;
  }

  // ------------------------------------------------------------------
  // Automatic background sync (#3189)
  // ------------------------------------------------------------------

  /**
   * Records what a durable write touched (#3354) and schedules a push for the
   * active vault. Nothing is recorded for a vault whose backup is off (FR-022).
   * With `schedule: false` the change only joins the next upload — used for
   * files re-read from disk, which should not trigger an upload on their own.
   * Never throws: this runs after the local write has already succeeded.
   */
  async recordLocalChange(
    vaultId: string,
    change?: DurableVaultChange,
    opts: { schedule?: boolean } = {},
  ): Promise<void> {
    if (!this.deps) return;
    try {
      const record = await getLocalCloudBackupRecord(
        this.deps.runtime,
        vaultId,
      );
      if (!record?.enabled && this.enablingVaultId !== vaultId) return;
      await this.deps.dirty?.record(vaultId, change);
    } catch (error) {
      // A lost row is caught by the full-upload fallbacks; a thrown error here
      // would surface as a failed save for a save that succeeded.
      console.warn("[CloudBackup] Could not record a change", error);
    }
    if (opts.schedule !== false && vaultId === this.deps.activeVaultId()) {
      this.notifyLocalChange(vaultId);
    }
  }

  /**
   * Called when a durable local write lands (wired once from app init via
   * `onDurableVaultChange`). Schedules a debounced guarded push when backup
   * is enabled; never uploads anything synchronously and never throws.
   */
  notifyLocalChange(vaultId?: string): void {
    if (!this.deps) return;
    const active = vaultId ?? this.deps.activeVaultId();
    if (!active || this.status === "off") return;
    // A conflict pauses automation until the user reconciles — further edits
    // must not silently queue an overwrite.
    if (this.autoState === "conflict") return;
    this.autoPending = true;
    this.autoState = onlineStatus.current ? "pending" : "offline";
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
    this.clearAutoTimer();
    this.uploads.pushing = true;
    this.autoState = "saving";
    try {
      return await this.completeAutoSync(vaultId);
    } finally {
      this.finishAutoSyncPush();
    }
  }

  private autoSyncVaultId(): string | null {
    if (!this.deps || this.autoState === "conflict") return null;
    const vaultId = this.deps.activeVaultId();
    return vaultId && this.status !== "off" ? vaultId : null;
  }

  private deferAutoSyncOffline(): false {
    this.autoState = "offline";
    this.autoPending = true;
    return false;
  }

  private deferAutoSyncWhilePushing(): false {
    this.autoPending = true;
    if (this.autoState !== "saving") this.autoState = "pending";
    return false;
  }

  private async completeAutoSync(vaultId: string): Promise<boolean> {
    const out = await this.uploads.pushSnapshot(vaultId, { guarded: true });
    if (out.notEnabled) return this.stopAutoSyncBackupOff();
    if (out.ok) {
      this.autoPending = false;
      this.autoState = "saved";
      this.status = "idle";
      this.errorMessage = null;
      return true;
    }
    if (out.conflict) return this.pauseAutoSyncOnConflict(out);
    // Ordinary failure: local data is untouched; stay pending and retry
    // with backoff. Offline flips to the offline state instead.
    this.autoPending = true;
    this.autoState = onlineStatus.current ? "retrying" : "offline";
    this.errorMessage = out.error ?? "Cloud backup failed.";
    this.scheduleAutoPush(this.deps?.retryMs ?? AUTO_SYNC_RETRY_MS);
    return false;
  }

  /**
   * Off is a stop, not a failure: retrying would rebuild the whole-vault
   * snapshot on a timer for a push that can never be sent.
   */
  private stopAutoSyncBackupOff(): false {
    this.autoPending = false;
    this.autoState = "idle";
    this.status = "off";
    return false;
  }

  private pauseAutoSyncOnConflict(out: SnapshotOutcome): false {
    this.autoPending = false;
    this.autoState = "conflict";
    this.autoConflictRemoteAt = out.remoteAt ?? null;
    this.errorMessage = out.error ?? "Cloud backup failed.";
    return false;
  }

  private deferConflictRetry(error?: string): void {
    this.autoPending = true;
    this.autoState = "retrying";
    this.errorMessage = error ?? "Cloud backup failed.";
    this.scheduleAutoPush(this.deps?.retryMs ?? AUTO_SYNC_RETRY_MS);
  }

  private finishAutoSyncPush(): void {
    this.uploads.pushing = false;
    this.uploadProgress = null;
    // Chain work that arrived mid-push — unless a retry timer is already
    // armed (scheduling again would replace the backoff with the debounce).
    if (this.autoPending && !this.autoTimer && this.autoState !== "conflict") {
      this.scheduleAutoPush();
    }
  }

  /**
   * Conflict resolution: push the local vault over the remote ("keep mine").
   * Explicit and unguarded — the user has seen both versions and chosen.
   * Clears the conflict state on success.
   */
  async resolveConflictKeepMine(): Promise<boolean> {
    if (!this.deps || this.autoState !== "conflict") return false;
    const vaultId = this.deps.activeVaultId();
    if (!vaultId || this.status === "off" || this.uploads.pushing) return false;
    this.uploads.pushing = true;
    this.autoState = "saving";
    try {
      const out = await this.uploads.pushSnapshot(vaultId, { guarded: false });
      if (!out.ok) {
        // The choice stands but the push failed: stay pending and retry with
        // backoff, or "retrying" is a label for a retry that never comes.
        this.deferConflictRetry(out.error);
        return false;
      }
      this.autoConflictRemoteAt = null;
      this.autoPending = false;
      this.autoState = "saved";
      this.status = "idle";
      this.errorMessage = null;
      return true;
    } finally {
      this.uploads.pushing = false;
      this.uploadProgress = null;
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
    if (this.autoPending) void this.flushAutoSync();
  };

  private handleVisibility = (): void => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden" &&
      this.autoPending
    ) {
      void this.flushAutoSync();
    }
  };

  private handlePageHide = (): void => {
    // Only a pending queue justifies close-time work: an unconditional flush
    // would write a fresh commit (and a new remote timestamp) on every tab
    // hide, manufacturing cross-device divergence for other devices to trip
    // over. Matches the handleOnline gate.
    if (this.autoPending) void this.flushAutoSync();
  };

  private scheduleAutoPush(
    delayMs = this.deps?.debounceMs ?? AUTO_SYNC_DEBOUNCE_MS,
  ): void {
    this.clearAutoTimer();
    this.autoTimer = setTimeout(() => {
      this.autoTimer = null;
      void this.flushAutoSync();
    }, delayMs);
  }

  private clearAutoTimer(): void {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }
}

export const cloudBackupStore = new CloudBackupStore();

export { createInertRuntime } from "./cloud-backup-runtime";
