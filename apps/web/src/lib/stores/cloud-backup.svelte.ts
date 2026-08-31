import {
  enableCloudBackup,
  pushVaultToCloudBackup,
  disableCloudBackup,
  deleteCloudBackup,
  restoreVaultFromCloudBackup,
  getLocalCloudBackupRecord,
  getCloudBackupOwnershipCode,
  createMemoryStorage,
  type CloudBackupRuntime,
  type VaultBundlePayload,
} from "@codex/cloud-backup-sync";
import type { LocalCloudBackupRecord } from "schema";
import { vaultEventBus } from "./vault/events.svelte";

/**
 * Cloud Backup status store (spec 162, issue #2593).
 *
 * Thin: all backup logic lives in `@codex/cloud-backup-sync` (Library-First).
 * What this owns is the app-side wiring — reading the record back on load,
 * mirroring status for Settings, and turning vault saves into pushes.
 *
 * **Push coalescing.** FR-018 wants every save reflected in the backup, and the
 * snapshot is the whole vault. Firing a full upload per entity write would be
 * absurd on a large vault, so saves inside a short window collapse into one
 * push of the vault's *current* state. That is the model the spec already
 * describes for reconnecting after a long offline stretch: only the latest
 * state is ever sent, intermediate history is never replayed.
 *
 * **Nothing is scheduled when backup is off.** No subscription work, no timer,
 * no request — "off by default" has to be true of the machinery, not just the
 * UI (FR-001, FR-003, SC-002).
 */

const PUSH_COALESCE_MS = 5_000;

export type CloudBackupStatus = "off" | "idle" | "syncing" | "error";

export interface CloudBackupDeps {
  runtime: CloudBackupRuntime;
  /** Builds the whole-vault snapshot. Injected so this store stays vault-agnostic. */
  buildPayload: (vaultId: string) => Promise<VaultBundlePayload>;
  activeVaultId: () => string | null;
  /**
   * Vault-writing side of restore. Injected rather than imported so this store
   * has no direct dependency on the vault store, and so tests can assert the
   * ordering (fetch, then create, then import) without a real vault.
   */
  restore?: {
    createVault: (name: string) => Promise<string>;
    importEntities: (vaultId: string, entities: unknown[]) => Promise<void>;
  };
}

export class CloudBackupStore {
  status = $state<CloudBackupStatus>("off");
  lastPushedAt = $state<string | null>(null);
  errorMessage = $state<string | null>(null);
  ownerCode = $state<string | null>(null);
  /** True once a consent decision exists for this vault, in either direction. */
  consented = $state(false);

  private deps: CloudBackupDeps | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private pushing = false;

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
    const record = await getLocalCloudBackupRecord(this.deps.runtime, vaultId);
    this.applyRecord(record);
    if (record?.enabled) this.listen();
    else this.stopListening();
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

    const payload = await this.deps.buildPayload(vaultId);
    const result = await enableCloudBackup(this.deps.runtime, vaultId, payload);
    if (!result.ok) {
      this.status = "error";
      this.errorMessage = result.error;
      return false;
    }
    this.applyRecord(result.value);
    this.listen();
    return true;
  }

  /** Stops future pushes. Local only — the remote copy is untouched (FR-009). */
  async disable(vaultId: string) {
    if (!this.deps) return;
    await disableCloudBackup(this.deps.runtime, vaultId);
    this.stopListening();
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
    this.stopListening();
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
  ): Promise<{ vaultId: string; vaultTitle: string } | null> {
    if (!this.deps?.restore) {
      this.errorMessage = "Restore is not available in this context.";
      return null;
    }

    const material = await this.fetchForRestore(backupId, ownerCode);
    if (!material) return null;

    try {
      const entities = Array.isArray((material.bundle as any)?.entities)
        ? ((material.bundle as any).entities as unknown[])
        : [];
      const vaultId = await this.deps.restore.createVault(
        material.manifest.vaultTitle,
      );
      if (entities.length > 0) {
        await this.deps.restore.importEntities(vaultId, entities);
      }
      return { vaultId, vaultTitle: material.manifest.vaultTitle };
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

  /* ---------------------------------------------------------- push-on-save */

  private listen() {
    if (this.unsubscribe) return;
    this.unsubscribe = vaultEventBus.subscribe((event) => {
      // Every event that means "vault content changed on disk".
      if (
        event.type === "ENTITY_UPDATED" ||
        event.type === "ENTITY_DELETED" ||
        event.type === "BATCH_CREATED" ||
        event.type === "BATCH_UPDATED"
      ) {
        this.schedulePush();
      }
    }, "cloud-backup");
  }

  private stopListening() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Collapses a burst of saves into one push of the current vault state. */
  private schedulePush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.pushNow();
    }, PUSH_COALESCE_MS);
  }

  /**
   * Pushes the current vault state.
   *
   * Never throws and never reports success it did not have: a failure becomes a
   * visible error state and the local save is entirely unaffected (FR-011,
   * FR-019).
   */
  async pushNow(): Promise<void> {
    if (!this.deps || this.pushing) return;
    const vaultId = this.deps.activeVaultId();
    if (!vaultId) return;

    this.pushing = true;
    this.status = "syncing";
    try {
      const payload = await this.deps.buildPayload(vaultId);
      const result = await pushVaultToCloudBackup(
        this.deps.runtime,
        vaultId,
        payload,
      );
      if (!result.ok) {
        this.status = "error";
        this.errorMessage = result.error;
        return;
      }
      if (result.value) {
        this.status = "idle";
        this.errorMessage = null;
        this.lastPushedAt = result.value.lastPushedAt;
      } else {
        // Not enabled for this vault — nothing was sent.
        this.status = "off";
      }
    } catch (error) {
      // The save path must never see an exception from here.
      this.status = "error";
      this.errorMessage =
        error instanceof Error ? error.message : "Cloud backup failed.";
    } finally {
      this.pushing = false;
    }
  }

  /** Tears down subscriptions; used on vault switch and in tests. */
  destroy() {
    this.stopListening();
    this.deps = null;
  }
}

export const cloudBackupStore = new CloudBackupStore();

/**
 * Per-vault persistence in `localStorage`.
 *
 * Deliberately simple: one small record per vault, read once on load. It has to
 * survive reloads (FR-020) and it holds the ownership code, so it must not live
 * only in memory. Failures are swallowed — a browser with storage blocked
 * should degrade to "cloud backup unavailable", never to a thrown error on the
 * save path.
 */
export function cloudBackupBrowserStorage() {
  const key = (vaultId: string) => `codex.cloud-backup.${vaultId}`;
  return {
    async read(vaultId: string) {
      try {
        const raw = localStorage.getItem(key(vaultId));
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    async write(vaultId: string, record: unknown) {
      try {
        localStorage.setItem(key(vaultId), JSON.stringify(record));
      } catch {
        // Storage unavailable; the in-memory state still drives this session.
      }
    },
    async clear(vaultId: string) {
      try {
        localStorage.removeItem(key(vaultId));
      } catch {
        // Nothing to do.
      }
    },
  };
}

/** A runtime with no persistence, for contexts that never enable backup. */
export function createInertRuntime(baseUrl = ""): CloudBackupRuntime {
  return {
    baseUrl,
    storage: createMemoryStorage(),
    fetch: (async () => {
      throw new Error("Cloud backup is not configured.");
    }) as CloudBackupRuntime["fetch"],
  };
}
