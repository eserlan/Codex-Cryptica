import type { CloudBackupTrashEviction } from "schema";
import {
  fetchCloudBackupRestorePoints,
  rollBackCloudBackup,
  type CloudBackupRestorePoint,
  type CloudBackupRollbackCounts,
} from "@codex/cloud-backup-sync";
import {
  trashEvictionNotice,
  type CloudBackupDepsProvider,
} from "./cloud-backup-types";

export type RestorePointsLoadState =
  "idle" | "loading" | "ready" | "unsupported" | "failed";

type RollbackOutcome = "rolledBack" | "matches" | "changed" | "gone" | "failed";

/** Lists restore points and rolls a shared vault back to one. Owner only. */
export class CloudBackupRollback {
  points = $state<CloudBackupRestorePoint[]>([]);
  loadState = $state<RestorePointsLoadState>("idle");
  loadedVaultId = $state<string | null>(null);
  /** The date being checked or rolled back right now. */
  busyDate = $state<string | null>(null);

  /** What the last attempt did, for the panel to say. */
  result = $state<{
    outcome: RollbackOutcome;
    date: string;
    trashEvicted?: CloudBackupTrashEviction;
  } | null>(null);
  resultVaultId = $state<string | null>(null);
  private loadRequest = 0;

  constructor(
    private getDeps: CloudBackupDepsProvider,
    private afterRollback: (vaultId: string) => Promise<void>,
  ) {}

  async load(vaultId: string): Promise<void> {
    const deps = this.getDeps();
    if (!deps) return;
    const request = ++this.loadRequest;
    if (this.loadedVaultId !== vaultId) {
      this.points = [];
      this.loadedVaultId = null;
    }
    if (this.resultVaultId !== vaultId) {
      this.result = null;
      this.resultVaultId = null;
    }
    this.loadState = "loading";
    const outcome = await fetchCloudBackupRestorePoints(deps.runtime, vaultId);
    if (request !== this.loadRequest || deps.activeVaultId() !== vaultId) {
      return;
    }
    this.loadedVaultId = vaultId;
    if (outcome.kind === "points") {
      this.points = outcome.points;
      this.loadState = "ready";
    } else {
      this.points = [];
      this.loadState =
        outcome.kind === "unsupported"
          ? "unsupported"
          : outcome.kind === "off"
            ? "idle"
            : "failed";
    }
  }

  /**
   * Counts what a rollback to `date` would do. Returns null when there is
   * nothing to confirm; the result then says why.
   */
  async preview(
    vaultId: string,
    date: string,
  ): Promise<
    ({
      revision: number;
      trashEvicted?: CloudBackupTrashEviction;
    } & CloudBackupRollbackCounts) | null
  > {
    const deps = this.getDeps();
    if (!deps || this.busyDate) return null;
    this.busyDate = date;
    try {
      const outcome = await rollBackCloudBackup(deps.runtime, vaultId, {
        date,
        dryRun: true,
      });
      if (deps.activeVaultId() !== vaultId) return null;
      if (outcome.kind !== "preview") {
        await this.settle(vaultId, date, outcome.kind);
        return null;
      }
      if (outcome.changed + outcome.returning + outcome.trashed === 0) {
        this.setResult(vaultId, "matches", date);
        return null;
      }
      return outcome;
    } finally {
      this.busyDate = null;
    }
  }

  /** Rolls back, then pulls at once so this device shows the result. */
  async rollBack(
    vaultId: string,
    date: string,
    baseRevision: number,
  ): Promise<void> {
    const deps = this.getDeps();
    if (!deps || this.busyDate) return;
    this.busyDate = date;
    try {
      const outcome = await rollBackCloudBackup(deps.runtime, vaultId, {
        date,
        baseRevision,
      });
      if (deps.activeVaultId() !== vaultId) return;
      if (outcome.kind === "rolledBack") {
        this.setResult(vaultId, "rolledBack", date, outcome.trashEvicted);
        if (outcome.trashEvicted) {
          deps.notify?.(trashEvictionNotice(outcome.trashEvicted));
        }
        await this.afterRollback(vaultId);
        await this.load(vaultId);
      } else {
        await this.settle(vaultId, date, outcome.kind);
      }
    } finally {
      this.busyDate = null;
    }
  }

  private async settle(
    vaultId: string,
    date: string,
    kind: string,
  ): Promise<void> {
    if (kind === "changed" || kind === "gone") {
      this.setResult(vaultId, kind, date);
      if (kind === "gone") await this.load(vaultId);
    } else {
      this.setResult(vaultId, "failed", date);
    }
  }

  private setResult(
    vaultId: string,
    outcome: RollbackOutcome,
    date: string,
    trashEvicted?: CloudBackupTrashEviction,
  ): void {
    this.result = {
      outcome,
      date,
      ...(trashEvicted ? { trashEvicted } : {}),
    };
    this.resultVaultId = vaultId;
  }
}
