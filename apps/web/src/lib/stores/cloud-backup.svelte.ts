import {
  enableCloudBackup,
  pushVaultToCloudBackup,
  disableCloudBackup,
  deleteCloudBackup,
  restoreVaultFromCloudBackup,
  fetchCloudBackupAsset,
  getLocalCloudBackupRecord,
  getCloudBackupOwnershipCode,
  formatRecoveryKey,
  listKnownCloudBackups,
  planAssetUploads,
  type KnownCloudBackup,
  createMemoryStorage,
  type CloudBackupRuntime,
  type VaultBundlePayload,
} from "@codex/cloud-backup-sync";
import type { LocalCloudBackupRecord } from "schema";
import { onlineStatus } from "./online.svelte";

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

export type CloudBackupStatus = "off" | "idle" | "syncing" | "error";

/**
 * Ephemeral automatic-sync state (#3189), separate from the persisted
 * `CloudBackupStatus`. Shown in Settings as: Saving… / Saved to cloud /
 * Offline — changes will sync later / Sync failed — retrying, plus a
 * conflict state that pauses automation until the user reconciles.
 */
export type CloudAutoSyncState =
  "idle" | "pending" | "saving" | "saved" | "offline" | "retrying" | "conflict";

/** Quiet period after editing settles before an auto-push (default 5s). */
export const AUTO_SYNC_DEBOUNCE_MS = 5000;
/** Wait before retrying a failed auto-push (default 30s). */
export const AUTO_SYNC_RETRY_MS = 30000;

interface SnapshotOutcome {
  ok: boolean;
  notEnabled?: boolean;
  conflict?: boolean;
  remoteAt?: string | null;
  error?: string;
}

const BACKUP_OFF: SnapshotOutcome = {
  ok: false,
  notEnabled: true,
  error: "Cloud backup is off.",
};

export interface CloudBackupDeps {
  runtime: CloudBackupRuntime;
  /**
   * Builds the whole-vault snapshot. Injected so this store stays
   * vault-agnostic. The signal aborts when backup is disabled mid-build, so a
   * large vault does not keep reading every entity for a push that will never
   * be sent.
   */
  buildPayload: (
    vaultId: string,
    signal?: AbortSignal,
  ) => Promise<VaultBundlePayload>;
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
  /** Quiet period before an auto-push; overridable in tests. */
  debounceMs?: number;
  /** Wait before retrying a failed auto-push; overridable in tests. */
  retryMs?: number;
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
  private pushing = false;
  /** The in-flight snapshot build, aborted by `disable`. */
  private activeBuild: AbortController | null = null;
  private autoPending = false;
  private autoTimer: ReturnType<typeof setTimeout> | null = null;
  private autoListenersAttached = false;
  private hashCache: Record<string, string> = {};

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
    this.autoPending = false;
    this.autoConflictRemoteAt = null;
    this.autoState = "idle";

    const record = await getLocalCloudBackupRecord(this.deps.runtime, vaultId);
    this.applyRecord(record);
    this.loadHashCache(vaultId);
    // Catch-up: sync resumes when the user returns, guarded so a newer
    // remote can never be overwritten by a stale return.
    if (this.status !== "off") this.notifyLocalChange(vaultId);
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
    // Disabling stops automation cold: no pending push may survive it, or
    // "off" would stop meaning "nothing leaves the device".
    this.activeBuild?.abort();
    this.activeBuild = null;
    this.clearAutoTimer();
    this.autoPending = false;
    this.autoConflictRemoteAt = null;
    this.autoState = "idle";
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
    if (!this.deps || this.pushing) return false;
    const vaultId = this.deps.activeVaultId();
    if (!vaultId) return false;

    this.pushing = true;
    this.status = "syncing";
    try {
      const out = await this.pushSnapshot(vaultId, { guarded: false });
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
      this.pushing = false;
      this.uploadProgress = null;
      if (this.autoPending && !this.autoTimer) this.scheduleAutoPush();
    }
  }

  /** Releases the injected dependencies; used on teardown and in tests. */
  destroy() {
    this.stopAutoSyncListeners();
    this.clearAutoTimer();
    this.deps = null;
  }

  // ------------------------------------------------------------------
  // Automatic background sync (#3189)
  // ------------------------------------------------------------------

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
    if (this.pushing) {
      return this.deferAutoSyncWhilePushing();
    }
    this.clearAutoTimer();
    this.pushing = true;
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
    const out = await this.pushSnapshot(vaultId, { guarded: true });
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
    this.pushing = false;
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
    if (!vaultId || this.status === "off" || this.pushing) return false;
    this.pushing = true;
    this.autoState = "saving";
    try {
      const out = await this.pushSnapshot(vaultId, { guarded: false });
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
      this.pushing = false;
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

  /**
   * Shared snapshot push for manual and automatic paths. Manual callers pass
   * `guarded: false` (explicit user act, current behaviour); automatic
   * callers pass `guarded: true` (abort on remote divergence). Unchanged
   * media bytes are skipped in both cases via the content-hash cache.
   */
  private async pushSnapshot(
    vaultId: string,
    opts: { guarded: boolean },
  ): Promise<SnapshotOutcome> {
    // Check before building: the snapshot reads every entity, so learning that
    // backup is off only at upload time costs a whole-vault read.
    const record = await getLocalCloudBackupRecord(this.deps!.runtime, vaultId);
    if (!record?.enabled) return BACKUP_OFF;

    // Live for the whole push, so a disable during the build *or* the upload
    // registers and the caller does not flip the status back from "off".
    const push = new AbortController();
    this.activeBuild = push;
    try {
      const out = await this.uploadSnapshot(vaultId, opts, push.signal);
      return push.signal.aborted ? BACKUP_OFF : out;
    } finally {
      if (this.activeBuild === push) this.activeBuild = null;
    }
  }

  private async uploadSnapshot(
    vaultId: string,
    opts: { guarded: boolean },
    signal: AbortSignal,
  ): Promise<SnapshotOutcome> {
    const deps = this.deps!;
    const payload = await deps.buildPayload(vaultId, signal);
    if (signal.aborted) return BACKUP_OFF;
    this.skippedAssets =
      (payload as { skippedAssets?: string[] }).skippedAssets ?? [];
    this.skippedEntities =
      (payload as { skippedEntities?: string[] }).skippedEntities ?? [];
    let skipAssetUploadIds: string[] = [];
    let freshHashes: Record<string, string> = {};
    try {
      const plan = await planAssetUploads(payload.assets ?? [], this.hashCache);
      skipAssetUploadIds = plan.skippedIds;
      freshHashes = plan.hashes;
    } catch {
      // Hashing unavailable (no WebCrypto): upload everything, as before.
    }
    const result = await pushVaultToCloudBackup(
      deps.runtime,
      vaultId,
      payload,
      (progress) => {
        this.uploadProgress = progress;
      },
      {
        skipAssetUploadIds,
        ...(opts.guarded ? { expectLastPushedAt: this.lastPushedAt } : {}),
      },
    );
    if (!result.ok) {
      return {
        ok: false,
        conflict: result.conflict,
        remoteAt: result.remoteLastPushedAt,
        error: result.error,
      };
    }
    if (!result.value) return BACKUP_OFF;
    this.hashCache = freshHashes;
    this.saveHashCache(vaultId);
    this.lastPushedAt = result.value.lastPushedAt;
    return { ok: true };
  }

  private hashCacheKey(vaultId: string): string {
    return `codex.cloud-backup-hashes.${vaultId}`;
  }

  private loadHashCache(vaultId: string): void {
    try {
      const raw = localStorage.getItem(this.hashCacheKey(vaultId));
      this.hashCache = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      this.hashCache = {};
    }
  }

  private saveHashCache(vaultId: string): void {
    try {
      localStorage.setItem(
        this.hashCacheKey(vaultId),
        JSON.stringify(this.hashCache),
      );
    } catch {
      // Storage blocked: uploads just get more expensive, never broken.
    }
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
    async list() {
      const prefix = key("");
      try {
        const entries: { vaultId: string; record: unknown }[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const storageKey = localStorage.key(i);
          if (!storageKey?.startsWith(prefix)) continue;
          const raw = localStorage.getItem(storageKey);
          if (!raw) continue;
          try {
            entries.push({
              vaultId: storageKey.slice(prefix.length),
              record: JSON.parse(raw),
            });
          } catch {
            // One corrupt entry must not hide the rest.
          }
        }
        return entries;
      } catch {
        return [];
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
