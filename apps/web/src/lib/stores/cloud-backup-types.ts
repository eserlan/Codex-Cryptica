import {
  isDeviceLimit,
  type CloudBackupRuntime,
  type MergeEntity,
  type CloudBackupTiming,
  type VaultBundlePayload,
  type VaultDeltaPayload,
} from "@codex/cloud-backup-sync";
import type {
  CloudBackupDirtyRow,
  CloudBackupDirtyStore,
} from "./cloud-backup-dirty";
import type { CloudBackupBaseStore } from "./cloud-backup-base";
import type { StorageLike } from "#lib/utils/runtime-deps.js";
import type { ArtworkBackupScope } from "./cloud-backup-artwork-scope";
import type { CloudBackupArtworkConsent } from "./cloud-backup-artwork-consent";

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

/** Background pull interval while the app is open and visible. */
export const PULL_INTERVAL_MS = 30_000;

/** Wait after a vault opens before the once-per-session consistency check. */
export const RECONCILE_DELAY_MS = 60_000;

export interface SnapshotOutcome {
  ok: boolean;
  notEnabled?: boolean;
  conflict?: boolean;
  remoteAt?: string | null;
  error?: string;
  /**
   * Set when a pull was held back by an open editor: not a failure, so the
   * push is retried later and nothing is cleared.
   */
  held?: boolean;
  /** An editor's link is gone, or its device is over the cap: stop syncing. */
  blocked?: Blocked;
  /** An editor's changes that cannot go yet stay on this device. */
  keptLocal?: boolean;
}

/** Why an editor's sync stopped. `deviceLimit` carries the server's message. */
export type Blocked =
  { kind: "linkGone" } | { kind: "deviceLimit"; message: string };

/** The stop an editor's failed request calls for, or null for an ordinary failure. */
export function blockedFrom(failure: {
  error: string;
  status?: number;
  code?: string;
  linkGone?: true;
}): Blocked | null {
  if (failure.linkGone) return { kind: "linkGone" };
  if (isDeviceLimit(failure)) {
    return { kind: "deviceLimit", message: failure.error };
  }
  return null;
}

export const BACKUP_OFF: SnapshotOutcome = {
  ok: false,
  notEnabled: true,
  error: "Cloud backup is off.",
};

/** What a pull writes into the local vault. */
export interface PulledChanges {
  updates: MergeEntity[];
  creates: MergeEntity[];
  deletes: string[];
}

/**
 * The vault side of pulling other devices' changes. Injected so the stores
 * stay vault-agnostic; without it sync never pulls and a conflict pauses.
 */
export interface CloudBackupRemoteDeps {
  /**
   * Local entities as the delta builder would upload them. `null` reads every
   * entity. Ids with no local entity are left out.
   */
  readLocal: (
    vaultId: string,
    ids: readonly string[] | null,
  ) => Promise<Record<string, MergeEntity>>;
  /** Writes the merge result. Throws when any write fails. */
  apply: (vaultId: string, changes: PulledChanges) => Promise<void>;
  /**
   * Downloads the local images the vault lacks for these entities. Returns
   * the SHA-256 per asset id it stored; a failed download is left out.
   */
  ensureAssets: (
    vaultId: string,
    entities: readonly MergeEntity[],
    download: (assetId: string) => Promise<Uint8Array | null>,
  ) => Promise<Record<string, string>>;
  /** True while the entity is open in an editor. */
  isEditing: (id: string) => boolean;
  /** Calls back when the last open editor closes; returns the unsubscribe. */
  onEditingReleased: (listener: () => void) => () => void;
  /** An id for a "keep both" copy, unique in the vault. */
  newId: () => string;
}

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
    artwork?: { includeAdventures: boolean },
  ) => Promise<VaultBundlePayload>;
  /** Optional until expanded adventure inclusion is configured. */
  artworkScope?: ArtworkBackupScope;
  artworkConsent?: CloudBackupArtworkConsent;
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
    /** Restores adventure documents into the newly created Vault. */
    importAdventures?: (
      vaultId: string,
      adventures: unknown[],
    ) => Promise<void>;
    /** Writes one restored media file back into the vault. */
    importAsset?: (
      path: string,
      bytes: Uint8Array,
      mimeType: string,
      vaultId?: string,
    ) => Promise<void>;
  };
  /**
   * Changed-item tracking for incremental uploads (#3354). Optional so the
   * store stays usable without it; with it, every successful upload clears
   * exactly the changes it carried.
   */
  dirty?: CloudBackupDirtyStore;
  /**
   * Keeps what each entity held when last pushed, the base for a later
   * three-way merge. Optional; written only after a successful push.
   */
  base?: CloudBackupBaseStore;
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
  /** Pulls and merges other devices' changes; absent means no pulling. */
  remote?: CloudBackupRemoteDeps;
  /** Background pull interval; overridable in tests. */
  pullIntervalMs?: number;
  /** Local storage for persisting caches across sessions. */
  storage?: StorageLike;
  /** Shows a short message to the user. */
  notify?: (message: string) => void;
  /** The member's display name, for conflict copies in a shared vault. */
  displayName?: () => string | undefined;
  /**
   * Builds the delta an editor may send: entity rows only, and only those that
   * need no media the backup lacks. Rows left out stay pending.
   */
  buildEditorDelta?: (
    vaultId: string,
    changes: readonly CloudBackupDirtyRow[],
    uploadedAssetIds: ReadonlySet<string>,
    signal: AbortSignal,
  ) => Promise<{
    delta: VaultDeltaPayload | null;
    sent: readonly CloudBackupDirtyRow[];
  }>;
}

/** Reactive values shared by the app-side backup workflows. */
export interface CloudBackupViewState {
  status: CloudBackupStatus;
  lastPushedAt: string | null;
  errorMessage: string | null;
  ownerCode: string | null;
  recoveryKey: string | null;
  knownBackups: import("@codex/cloud-backup-sync").KnownCloudBackup[];
  skippedAssets: string[];
  skippedEntities: string[];
  uploadProgress: { uploaded: number; total: number } | null;
  consented: boolean;
  sharing: { linkVersion: number; enabledAt: string } | null;
  /** How this device is linked to the backup; null while backup is off. */
  role: "owner" | "editor" | null;
  /** An editor's group link no longer works. */
  linkGone: boolean;
  /** Pulls and pushes are stopped for this session (link gone or device cap). */
  syncStopped: boolean;
  /** Changes an editor holds back (maps, canvases, new images). */
  keptLocal: boolean;
  autoState: CloudAutoSyncState;
  autoConflictRemoteAt: string | null;
  /** The last merge that changed something locally. */
  mergeNotice: MergeNotice | null;
}

export interface MergeNotice {
  merged: number;
  /** Titles of the entities whose local version was kept as a copy. */
  copies: string[];
}

export type CloudBackupDepsProvider = () => CloudBackupDeps | null;
