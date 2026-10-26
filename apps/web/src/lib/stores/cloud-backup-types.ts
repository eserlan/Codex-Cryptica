import type {
  CloudBackupRuntime,
  CloudBackupTiming,
  VaultBundlePayload,
  VaultDeltaPayload,
} from "@codex/cloud-backup-sync";
import type {
  CloudBackupDirtyRow,
  CloudBackupDirtyStore,
} from "./cloud-backup-dirty";
import type { StorageLike } from "#lib/utils/runtime-deps.js";

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

/** Wait after a vault opens before the once-per-session consistency check. */
export const RECONCILE_DELAY_MS = 60_000;

export interface SnapshotOutcome {
  ok: boolean;
  notEnabled?: boolean;
  conflict?: boolean;
  remoteAt?: string | null;
  error?: string;
}

export const BACKUP_OFF: SnapshotOutcome = {
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
    /** Writes the restored session journals back into the new vault (spec
     *  163-session-journal, FR-016). */
    importSessionJournals?: (
      vaultId: string,
      journals: unknown[],
    ) => Promise<void>;
    /** Writes one restored media file back into the vault. */
    importAsset?: (
      path: string,
      bytes: Uint8Array,
      mimeType: string,
    ) => Promise<void>;
  };
  /**
   * Changed-item tracking for incremental uploads (#3354). Optional so the
   * store stays usable without it; with it, every successful upload clears
   * exactly the changes it carried.
   */
  dirty?: CloudBackupDirtyStore;
  /**
   * Builds an incremental upload from recorded changes, or `null` when they
   * call for a full upload (#3354). `uploadedAssetIds` are the media the
   * backup already holds; a delta never carries media.
   */
  buildDelta?: (
    vaultId: string,
    changes: readonly CloudBackupDirtyRow[],
    uploadedAssetIds: ReadonlySet<string>,
    signal: AbortSignal,
  ) => Promise<VaultDeltaPayload | null>;
  /**
   * Local entities for the idle consistency check (#3354). `entity` is the
   * full record when `loaded`; unloaded bodies are never read for the check.
   */
  listLocalEntities?: () => { id: string; loaded: boolean; entity: unknown }[];
  /** Delay before the once-per-session consistency check; tests shorten it. */
  reconcileDelayMs?: number;
  /**
   * Stage timings for the worker-or-not question (counts, bytes, ms — never
   * content). Unset in tests and anywhere else that should stay silent.
   */
  timing?: (timing: CloudBackupTiming) => void;
  /** Quiet period before an auto-push; overridable in tests. */
  debounceMs?: number;
  /** Wait before retrying a failed auto-push; overridable in tests. */
  retryMs?: number;
  /** Local storage for persisting caches across sessions. */
  storage?: StorageLike;
}
