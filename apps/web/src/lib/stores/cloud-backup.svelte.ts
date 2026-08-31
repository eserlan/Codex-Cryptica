import {
  enableCloudBackup,
  pushVaultToCloudBackup,
  disableCloudBackup,
  deleteCloudBackup,
  restoreVaultFromCloudBackup,
  fetchCloudBackupAsset,
  getLocalCloudBackupRecord,
  getCloudBackupOwnershipCode,
  createMemoryStorage,
  type CloudBackupRuntime,
  type VaultBundlePayload,
} from "@codex/cloud-backup-sync";
import type { LocalCloudBackupRecord } from "schema";

/**
 * Cloud Backup status store (spec 162, issue #2593).
 *
 * Thin: all backup logic lives in `@codex/cloud-backup-sync` (Library-First).
 * What this owns is the app-side wiring — reading the record back on load,
 * mirroring status for Settings, and turning vault saves into pushes.
 *
 * **Backing up is a deliberate act.** Save and load are both explicit buttons,
 * mirroring how the Google Drive mirror already works: the user chooses when a
 * copy goes up and when one comes down. Nothing is uploaded on a timer, on a
 * save, or in the background.
 *
 * That is a change from the spec's original FR-018, which called for automatic
 * push-on-save on the stated grounds that Drive already worked that way. It
 * does not — Drive has explicit Save and Load buttons — and the intended
 * behaviour here was always the Drive model.
 *
 * **Nothing happens at all when backup is off.** No subscription, no request —
 * "off by default" has to be true of the machinery, not just the UI
 * (FR-001, FR-003, SC-002).
 */

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
    /** Writes the restored maps and canvases back into the new vault. */
    importMaps?: (vaultId: string, maps: unknown[]) => Promise<void>;
    importCanvases?: (vaultId: string, canvases: unknown[]) => Promise<void>;
    /** Writes one restored media file back into the vault. */
    importAsset?: (
      path: string,
      bytes: Uint8Array,
      mimeType: string,
    ) => Promise<void>;
  };
}

export class CloudBackupStore {
  status = $state<CloudBackupStatus>("off");
  lastPushedAt = $state<string | null>(null);
  errorMessage = $state<string | null>(null);
  ownerCode = $state<string | null>(null);
  /** Media the last save could not read. Non-empty means a partial copy. */
  skippedAssets = $state<string[]>([]);
  /** True once a consent decision exists for this vault, in either direction. */
  consented = $state(false);

  private deps: CloudBackupDeps | null = null;
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
    // Clear the previous vault's state, so the status on screen never keeps
    // describing the vault the user has left.
    this.errorMessage = null;

    const record = await getLocalCloudBackupRecord(this.deps.runtime, vaultId);
    this.applyRecord(record);
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
    }
  }

  /** Stops future pushes. Local only — the remote copy is untouched (FR-009). */
  async disable(vaultId: string) {
    if (!this.deps) return;
    await disableCloudBackup(this.deps.runtime, vaultId);
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
      const listFrom = (key: string): unknown[] => {
        const value = (material.bundle as Record<string, unknown>)?.[key];
        return Array.isArray(value) ? value : [];
      };
      const entities = listFrom("entities");
      const maps = listFrom("maps");
      const canvases = listFrom("canvases");
      const vaultId = await this.deps.restore.createVault(
        material.manifest.vaultTitle,
      );
      if (entities.length > 0) {
        await this.deps.restore.importEntities(vaultId, entities);
      }
      // Maps and canvases are vault content in their own right; a restore that
      // brought back only entities would silently lose them.
      if (maps.length > 0 && this.deps.restore.importMaps) {
        await this.deps.restore.importMaps(vaultId, maps);
      }
      if (canvases.length > 0 && this.deps.restore.importCanvases) {
        await this.deps.restore.importCanvases(vaultId, canvases);
      }

      // Media, so a restored vault does not come back with broken images.
      const manifest = Array.isArray((material.bundle as any)?.assetManifest)
        ? ((material.bundle as any).assetManifest as {
            assetId: string;
            path: string;
            mimeType: string;
          }[])
        : [];
      const importAsset = this.deps.restore.importAsset;
      let missingAssets = 0;

      if (importAsset) {
        for (const asset of manifest) {
          const bytes = await fetchCloudBackupAsset(
            this.deps.runtime,
            { backupId, ownerCode },
            asset.assetId,
          );
          if (!bytes.ok) {
            // One unreadable image must not undo an otherwise good restore.
            missingAssets += 1;
            continue;
          }
          try {
            await importAsset(asset.path, bytes.value, asset.mimeType);
          } catch {
            missingAssets += 1;
          }
        }
      } else if (manifest.length > 0) {
        missingAssets = manifest.length;
      }

      return {
        vaultId,
        vaultTitle: material.manifest.vaultTitle,
        missingAssets,
      };
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

  /* ------------------------------------------------------------ backing up */

  /**
   * Uploads the vault's current state, replacing the previous backup.
   *
   * Explicit — the user presses "Save to cloud". Never throws and never reports
   * success it did not have: a failure becomes a visible error state and the
   * local vault is entirely unaffected (FR-011, FR-019).
   */
  async backUpNow(): Promise<boolean> {
    if (!this.deps || this.pushing) return false;
    const vaultId = this.deps.activeVaultId();
    if (!vaultId) return false;

    this.pushing = true;
    this.status = "syncing";
    try {
      const payload = await this.deps.buildPayload(vaultId);
      this.skippedAssets =
        (payload as { skippedAssets?: string[] }).skippedAssets ?? [];
      const result = await pushVaultToCloudBackup(
        this.deps.runtime,
        vaultId,
        payload,
      );
      if (!result.ok) {
        this.status = "error";
        this.errorMessage = result.error;
        return false;
      }
      if (!result.value) {
        // Not enabled for this vault — nothing was sent.
        this.status = "off";
        return false;
      }
      this.status = "idle";
      this.errorMessage = null;
      this.lastPushedAt = result.value.lastPushedAt;
      return true;
    } catch (error) {
      // Reading the vault can fail; the caller drives a button state off this.
      this.status = "error";
      this.errorMessage =
        error instanceof Error ? error.message : "Cloud backup failed.";
      return false;
    } finally {
      this.pushing = false;
    }
  }

  /** Releases the injected dependencies; used on teardown and in tests. */
  destroy() {
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
