import { CloudBackupChanges } from "./cloud-backup-changes";
import { CloudBackupUploads } from "./cloud-backup-uploads";
import {
  disableCloudBackup,
  getLocalCloudBackupRecord,
  type KnownCloudBackup,
} from "@codex/cloud-backup-sync";
import { CloudBackupAccount } from "./cloud-backup-account";
import { CloudBackupSync } from "./cloud-backup-sync";
import type { DurableVaultChange } from "./vault/registry";
import type {
  CloudBackupStatus,
  CloudAutoSyncState,
  CloudBackupDeps,
} from "./cloud-backup-types";
import { CloudBackupRestore } from "./cloud-backup-restore";

export { cloudBackupBrowserStorage } from "./cloud-backup-browser-storage";
export { createInertRuntime } from "./cloud-backup-runtime";
export {
  AUTO_SYNC_DEBOUNCE_MS,
  AUTO_SYNC_RETRY_MS,
  RECONCILE_DELAY_MS,
  type CloudBackupStatus,
  type CloudAutoSyncState,
  type CloudBackupDeps,
} from "./cloud-backup-types";

/** Reactive Settings state and composition of the app-side backup workflows.
 * Protocol and network logic remain in @codex/cloud-backup-sync. Enabling is
 * explicit consent; subsequent saves are automatic and conflict-guarded.
 */
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
  private uploads = new CloudBackupUploads(this, () => this.deps);
  private sync = new CloudBackupSync(this, () => this.deps, this.uploads);
  private account = new CloudBackupAccount(
    this,
    () => this.deps,
    (vaultId) => {
      this.uploads.media.reset(vaultId);
      this.sync.resetState();
    },
  );
  private restore = new CloudBackupRestore(this, () => this.deps);
  private changes = new CloudBackupChanges(
    this,
    () => this.deps,
    (vaultId) => this.notifyLocalChange(vaultId),
    () => this.account.enablingVaultId,
  );

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
    this.changes.clearTimer();
    this.sync.reset();

    const record = await getLocalCloudBackupRecord(this.deps.runtime, vaultId);
    this.account.applyRecord(record);
    this.uploads.media.load(vaultId);
    // Catch-up: sync resumes when the user returns, guarded so a newer
    // remote can never be overwritten by a stale return.
    if (this.status !== "off") {
      this.notifyLocalChange(vaultId);
      this.changes.schedule(vaultId);
    }
  }

  enable(vaultId: string): Promise<boolean> {
    return this.account.enable(vaultId);
  }
  attachToExistingBackup(
    vaultId: string,
    backupId: string,
    ownerCode: string,
    vaultTitle?: string,
  ): Promise<boolean> {
    return this.account.attachToExistingBackup(
      vaultId,
      backupId,
      ownerCode,
      vaultTitle,
    );
  }

  /** Stops future pushes. Local only — the remote copy is untouched (FR-009). */
  async disable(vaultId: string) {
    // Disabling stops automation cold: no pending push may survive it, or
    // "off" would stop meaning "nothing leaves the device".
    await this.uploads.cancel();
    this.changes.clearTimer();
    this.sync.reset();
    if (!this.deps) return;
    await disableCloudBackup(this.deps.runtime, vaultId);
    // Changes made while off are never recorded, so the pending set would be
    // incomplete by the time backup is re-enabled — which re-uploads in full.
    await this.deps.dirty?.clearVault(vaultId);
    this.status = "off";
    this.errorMessage = null;
  }

  deleteBackup(vaultId: string): Promise<boolean> {
    return this.account.deleteBackup(vaultId);
  }

  fetchForRestore(backupId: string, ownerCode: string) {
    return this.restore.fetchForRestore(backupId, ownerCode);
  }
  restoreIntoNewVault(backupId: string, ownerCode: string) {
    return this.restore.restoreIntoNewVault(backupId, ownerCode);
  }

  revealOwnerCode(vaultId: string): Promise<string | null> {
    return this.account.revealOwnerCode(vaultId);
  }
  loadKnownBackups(): Promise<void> {
    return this.account.loadKnownBackups();
  }
  revealRecoveryKey(vaultId: string): Promise<string | null> {
    return this.account.revealRecoveryKey(vaultId);
  }

  backUpNow(): Promise<boolean> {
    return this.sync.backUpNow();
  }

  /** Releases the injected dependencies; used on teardown and in tests. */
  destroy() {
    this.stopAutoSyncListeners();
    this.sync.clearTimer();
    this.changes.clearTimer();
    this.deps = null;
  }

  reconcileWithRemote(vaultId: string): Promise<number> {
    return this.changes.reconcileWithRemote(vaultId);
  }
  recordLocalChange(
    vaultId: string,
    change?: DurableVaultChange,
    opts: { schedule?: boolean } = {},
  ): Promise<void> {
    return this.changes.recordLocalChange(vaultId, change, opts);
  }

  notifyLocalChange(vaultId?: string): void {
    this.sync.notifyLocalChange(vaultId);
  }
  flushAutoSync(): Promise<boolean> {
    return this.sync.flushAutoSync();
  }
  resolveConflictKeepMine(): Promise<boolean> {
    return this.sync.resolveConflictKeepMine();
  }
  startAutoSyncListeners(): void {
    this.sync.startAutoSyncListeners();
  }
  stopAutoSyncListeners(): void {
    this.sync.stopAutoSyncListeners();
  }
}

export const cloudBackupStore = new CloudBackupStore();
