import {
  attachCloudBackup,
  enableCloudBackup,
  deleteCloudBackup,
  getLocalCloudBackupRecord,
  getCloudBackupOwnershipCode,
  formatRecoveryKey,
  listKnownCloudBackups,
} from "@codex/cloud-backup-sync";
import type { LocalCloudBackupRecord } from "schema";
import type {
  CloudBackupDepsProvider,
  CloudBackupViewState,
} from "./cloud-backup-types";

type AccountState = Pick<
  CloudBackupViewState,
  | "consented"
  | "ownerCode"
  | "lastPushedAt"
  | "status"
  | "errorMessage"
  | "knownBackups"
  | "recoveryKey"
>;

/** Consent, backup association and the device's recovery credentials. */
export class CloudBackupAccount {
  /** Track edits during the first build, before its enabled record exists. */
  enablingVaultId: string | null = null;
  constructor(
    private state: AccountState,
    private getDeps: CloudBackupDepsProvider,
    private onAttached: (vaultId: string) => void,
  ) {}
  private get deps() {
    return this.getDeps();
  }

  applyRecord(record: LocalCloudBackupRecord | null) {
    this.state.consented = Boolean(record);
    this.state.ownerCode = record?.ownerCode ?? null;
    this.state.lastPushedAt = record?.lastPushedAt ?? null;
    this.state.status = record?.enabled ? (record.status ?? "idle") : "off";
  }

  /**
   * Turns backup on. Must only be called once the user has confirmed the
   * consent screen — this is where vault data first leaves the device.
   */
  async enable(vaultId: string): Promise<boolean> {
    if (!this.deps) return false;
    this.state.status = "syncing";
    this.state.errorMessage = null;
    this.enablingVaultId = vaultId;

    try {
      const payload = await this.deps.buildPayload(vaultId);
      const result = await enableCloudBackup(
        this.deps.runtime,
        vaultId,
        payload,
      );
      if (!result.ok) {
        this.state.status = "error";
        this.state.errorMessage = result.error;
        return false;
      }
      this.applyRecord(result.value);
      return true;
    } catch (error) {
      // Reading the vault can fail. Callers drive a disabled/busy flag off this
      // promise, so it must resolve rather than throw or they stay stuck.
      this.state.status = "error";
      this.state.errorMessage =
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
      this.state.errorMessage =
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
      this.state.errorMessage =
        error instanceof Error
          ? error.message
          : "Could not reach this cloud backup.";
      return false;
    }
    if (!result.ok) {
      this.state.errorMessage = result.error;
      return false;
    }
    this.applyRecord(result.value);
    this.onAttached(vaultId);
    this.state.errorMessage = null;
    return true;
  }

  /** Permanently erases the remote copy (FR-010). */
  async deleteBackup(vaultId: string): Promise<boolean> {
    if (!this.deps) return false;
    const result = await deleteCloudBackup(this.deps.runtime, vaultId);
    if (!result.ok) {
      this.state.status = "error";
      this.state.errorMessage = result.error;
      return false;
    }
    this.applyRecord(null);
    return true;
  }

  async revealOwnerCode(vaultId: string): Promise<string | null> {
    if (!this.deps) return null;
    this.state.ownerCode = await getCloudBackupOwnershipCode(
      this.deps.runtime,
      vaultId,
    );
    return this.state.ownerCode;
  }

  /** Refreshes the list of backups this device can restore without a key. */
  async loadKnownBackups(): Promise<void> {
    if (!this.deps) return;
    this.state.knownBackups = await listKnownCloudBackups(this.deps.runtime);
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
    this.state.recoveryKey = formatRecoveryKey(record.backupId, code);
    return this.state.recoveryKey;
  }
}
