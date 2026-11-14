import {
  enableCloudBackupSharing,
  replaceCloudBackupSharingLink,
  disableCloudBackupSharing,
  getLocalCloudBackupRecord,
} from "@codex/cloud-backup-sync";
import type {
  CloudBackupDepsProvider,
  CloudBackupViewState,
} from "./cloud-backup-types";

type SharingState = Pick<CloudBackupViewState, "sharing">;

/** `link` goes to the caller only; it is never kept in store state. */
export type SharingOutcome =
  { ok: true; link?: string } | { ok: false; error: string };

/** Owner-side group sharing for the open vault's backup. */
export class CloudBackupSharing {
  constructor(
    private state: SharingState,
    private getDeps: CloudBackupDepsProvider,
  ) {}

  enable(vaultId: string): Promise<SharingOutcome> {
    return this.share(vaultId, enableCloudBackupSharing);
  }

  replace(vaultId: string): Promise<SharingOutcome> {
    return this.share(vaultId, replaceCloudBackupSharingLink);
  }

  async disable(vaultId: string): Promise<SharingOutcome> {
    const deps = this.getDeps();
    if (!deps) return { ok: false, error: "Cloud backup is not ready." };
    try {
      const result = await disableCloudBackupSharing(deps.runtime, vaultId);
      await this.refresh(vaultId);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    } catch {
      return { ok: false, error: "Could not turn off sharing." };
    }
  }

  private async share(
    vaultId: string,
    call: typeof enableCloudBackupSharing,
  ): Promise<SharingOutcome> {
    const deps = this.getDeps();
    if (!deps) return { ok: false, error: "Cloud backup is not ready." };
    try {
      const result = await call(deps.runtime, vaultId, window.location.origin);
      // The 409 paths rewrite the record too, so always re-read it.
      await this.refresh(vaultId);
      return result.ok
        ? { ok: true, link: result.value.link }
        : { ok: false, error: result.error };
    } catch {
      return { ok: false, error: "Could not update sharing." };
    }
  }

  private async refresh(vaultId: string) {
    const deps = this.getDeps();
    if (!deps) return;
    const record = await getLocalCloudBackupRecord(deps.runtime, vaultId);
    this.state.sharing = record?.sharing ?? null;
  }
}
