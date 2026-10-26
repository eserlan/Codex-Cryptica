import { CloudBackupChanges } from "./cloud-backup-changes";
import { CloudBackupUploads } from "./cloud-backup-uploads";
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
  type KnownCloudBackup,
} from "@codex/cloud-backup-sync";
import type { LocalCloudBackupRecord } from "schema";
import { CloudBackupSync } from "./cloud-backup-sync";

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
  type CloudBackupStatus,
  type CloudAutoSyncState,
  type CloudBackupDeps,
} from "./cloud-backup-types";
export {
  AUTO_SYNC_DEBOUNCE_MS,
  AUTO_SYNC_RETRY_MS,
  type CloudBackupStatus,
  type CloudAutoSyncState,
  type CloudBackupDeps,
} from "./cloud-backup-types";
import { restoreCloudBackupIntoNewVault } from "./cloud-backup-restore";

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
  private uploads = new CloudBackupUploads(this, () => this.deps);
  private sync = new CloudBackupSync(this, () => this.deps, this.uploads);
  private changes = new CloudBackupChanges(
    this,
    () => this.deps,
    (vaultId) => this.notifyLocalChange(vaultId),
    () => this.enablingVaultId,
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
    this.sync.clearTimer();
    this.changes.clearTimer();
    this.sync.reset();

    const record = await getLocalCloudBackupRecord(this.deps.runtime, vaultId);
    this.applyRecord(record);
    this.uploads.media.load(vaultId);
    // Catch-up: sync resumes when the user returns, guarded so a newer
    // remote can never be overwritten by a stale return.
    if (this.status !== "off") {
      this.notifyLocalChange(vaultId);
      this.changes.schedule(vaultId);
    }
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
    this.sync.reset();
    this.errorMessage = null;
    return true;
  }

  /** Stops future pushes. Local only — the remote copy is untouched (FR-009). */
  async disable(vaultId: string) {
    // Disabling stops automation cold: no pending push may survive it, or
    // "off" would stop meaning "nothing leaves the device".
    await this.uploads.cancel();
    this.sync.clearTimer();
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

  // ------------------------------------------------------------------
  // Automatic background sync (#3189)
  // ------------------------------------------------------------------

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
export { createInertRuntime } from "./cloud-backup-runtime";
