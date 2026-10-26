import {
  fetchCloudBackupIndex,
  getLocalCloudBackupRecord,
} from "@codex/cloud-backup-sync";
import { hashCloudBackupEntity } from "schema";
import type { DurableVaultChange } from "./vault/registry";
import {
  RECONCILE_DELAY_MS,
  type CloudBackupDepsProvider,
  type CloudBackupViewState,
} from "./cloud-backup-types";

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

/** Durable change recording and the once-per-session remote consistency check. */
export class CloudBackupChanges {
  private reconcileTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private state: Pick<CloudBackupViewState, "status">,
    private getDeps: CloudBackupDepsProvider,
    private notifyLocalChange: (vaultId: string) => void,
    private enablingVaultId: () => string | null,
  ) {}

  private get deps() {
    return this.getDeps();
  }

  /** Runs the consistency check once, after the vault has settled. */
  schedule(vaultId: string): void {
    this.clearTimer();
    if (!this.deps?.listLocalEntities || !this.deps.dirty) return;
    this.reconcileTimer = setTimeout(() => {
      this.reconcileTimer = null;
      void this.reconcileWithRemote(vaultId);
    }, this.deps.reconcileDelayMs ?? RECONCILE_DELAY_MS);
  }

  clearTimer(): void {
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
    if (!index.ok || this.state.status === "off") return 0;

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
      if (!record?.enabled && this.enablingVaultId() !== vaultId) return;
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
}
