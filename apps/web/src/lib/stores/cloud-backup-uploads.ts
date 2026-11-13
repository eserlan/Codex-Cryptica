import {
  getLocalCloudBackupRecord,
  pushDeltaToCloudBackup,
  pushVaultToCloudBackup,
  type VaultDeltaPayload,
} from "@codex/cloud-backup-sync";
import { browserStorage } from "#lib/utils/runtime-deps.js";
import type { CloudBackupBaseStore } from "./cloud-backup-base";
import type { CloudBackupDirtyRow } from "./cloud-backup-dirty";
import {
  BACKUP_OFF,
  type CloudBackupDepsProvider,
  type CloudBackupViewState,
  type SnapshotOutcome,
} from "./cloud-backup-types";
import { CloudBackupMediaCache } from "./cloud-backup-media-cache";
import { runArtworkBackup } from "./cloud-backup-artwork-scope";

type UploadState = Pick<
  CloudBackupViewState,
  "lastPushedAt" | "skippedAssets" | "skippedEntities" | "uploadProgress"
> & { artworkConsentVersion?: number };

function uploadFailure(result: {
  error: string;
  conflict?: boolean;
  remoteLastPushedAt?: string | null;
}): SnapshotOutcome {
  return {
    ok: false,
    conflict: result.conflict,
    remoteAt: result.remoteLastPushedAt,
    error: result.error,
  };
}

/** Plain JSON copy, so later edits and reactive proxies cannot change it. */
const deepCopy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Serial snapshot/delta uploads, cancellation and version-guarded dirty clearing. */
export class CloudBackupUploads {
  pushing = false;
  private activeBuild: AbortController | null = null;
  private activePush: Promise<SnapshotOutcome> | null = null;
  /** What the running push sends, copied before the request, to become the merge base. */
  private sentBase: ((base: CloudBackupBaseStore) => Promise<void>) | null =
    null;
  readonly media: CloudBackupMediaCache;

  constructor(
    private state: UploadState,
    private getDeps: CloudBackupDepsProvider,
  ) {
    this.media = new CloudBackupMediaCache(
      () => this.deps?.storage ?? browserStorage,
    );
  }

  private get deps() {
    return this.getDeps();
  }

  async cancel(): Promise<void> {
    this.activeBuild?.abort();
    await this.activePush?.catch(() => undefined);
    this.activeBuild = null;
    this.activePush = null;
  }

  /**
   * Shared snapshot push for manual and automatic paths. Manual callers pass
   * `guarded: false` (explicit user act, current behaviour); automatic
   * callers pass `guarded: true` (abort on remote divergence). Unchanged
   * media bytes are skipped in both cases via the content-hash cache.
   */
  async pushSnapshot(
    vaultId: string,
    opts: { guarded: boolean },
  ): Promise<SnapshotOutcome> {
    const push = new AbortController();
    this.activeBuild = push;
    const operation = this.executePushOperation(vaultId, opts, push.signal);
    this.activePush = operation;
    try {
      const out = await operation;
      return push.signal.aborted ? BACKUP_OFF : out;
    } finally {
      if (this.activeBuild === push) {
        this.activeBuild = null;
        this.activePush = null;
      }
    }
  }

  private async isBackupEnabled(
    vaultId: string,
    signal: AbortSignal,
  ): Promise<boolean> {
    const record = await getLocalCloudBackupRecord(this.deps!.runtime, vaultId);
    return !signal.aborted && Boolean(record?.enabled);
  }

  private async executePushOperation(
    vaultId: string,
    opts: { guarded: boolean },
    signal: AbortSignal,
  ): Promise<SnapshotOutcome> {
    // Check before building: the snapshot reads every entity, so learning
    // that backup is off only at upload time costs a whole-vault read.
    if (!(await this.isBackupEnabled(vaultId, signal))) return BACKUP_OFF;
    this.sentBase = null;

    // Taken before building, so anything changed after this point stays
    // pending even though the snapshot may happen to include it.
    const sent = (await this.deps!.dirty?.snapshot(vaultId)) ?? [];
    if (signal.aborted) return BACKUP_OFF;

    // Keep the cancellation guard live through upload, including delta
    // writes, so disable can wait before persisting the off record.
    const out = await this.dispatchScopedUpload(vaultId, opts, sent, signal);
    return this.finalizePushOperation(out, sent, signal);
  }

  private async finalizePushOperation(
    out: SnapshotOutcome,
    sent: readonly CloudBackupDirtyRow[],
    signal: AbortSignal,
  ): Promise<SnapshotOutcome> {
    if (signal.aborted) return BACKUP_OFF;
    if (out.ok) {
      await this.recordBase();
      await this.deps!.dirty?.clearSent(sent);
    }
    return out;
  }

  /** A failure to record the base never fails a push that went through. */
  private async recordBase(): Promise<void> {
    const record = this.sentBase;
    const base = this.deps!.base;
    this.sentBase = null;
    if (!record || !base) return;
    try {
      await record(base);
    } catch (error) {
      console.warn("[CloudBackup] Could not record the merge base", error);
    }
  }

  private async dispatchScopedUpload(
    vaultId: string,
    opts: { guarded: boolean },
    sent: readonly CloudBackupDirtyRow[],
    signal: AbortSignal,
  ): Promise<SnapshotOutcome> {
    const scope = this.deps!.artworkScope;
    if (!scope) return this.uploadChanges(vaultId, opts, sent, signal);
    const out = await runArtworkBackup(vaultId, {
      ...scope,
      upload: (artwork) =>
        this.uploadChanges(vaultId, opts, sent, signal, artwork),
    });
    this.state.artworkConsentVersion =
      (this.state.artworkConsentVersion ?? 0) + 1;
    return out;
  }

  private canUseDelta(
    opts: { guarded: boolean },
    artwork?: { forceFull: boolean },
  ): boolean {
    if (artwork?.forceFull) return false;
    if (!opts.guarded) return false;
    const deps = this.deps!;
    return Boolean(deps.dirty && deps.buildDelta && this.state.lastPushedAt);
  }

  private async trySendDelta(
    vaultId: string,
    sent: readonly CloudBackupDirtyRow[],
    signal: AbortSignal,
  ): Promise<SnapshotOutcome | null> {
    const delta = await this.deps!.buildDelta!(
      vaultId,
      sent,
      new Set(Object.keys(this.media.hashes)),
      signal,
    );
    if (signal.aborted) return BACKUP_OFF;
    if (!delta) return null;
    const upserts = deepCopy(delta.upserts);
    const deletes = [...delta.deletes];
    this.sentBase = (base) => base.recordSent(vaultId, upserts, deletes);
    return this.sendDelta(vaultId, delta, this.state.lastPushedAt!, signal);
  }

  /**
   * Sends only the recorded changes when it can (#3354), otherwise a full
   * snapshot. Only automatic, guarded pushes go incremental: "Save to cloud"
   * and "keep mine" are explicit and stay full. With nothing recorded, an
   * automatic push has nothing to send.
   */
  private async uploadChanges(
    vaultId: string,
    opts: { guarded: boolean },
    sent: readonly CloudBackupDirtyRow[],
    signal: AbortSignal,
    artwork?: { includeAdventures: boolean; forceFull: boolean },
  ): Promise<SnapshotOutcome> {
    if (!this.canUseDelta(opts, artwork)) {
      return this.uploadSnapshot(vaultId, opts, signal, artwork);
    }
    if (sent.length === 0) return { ok: true };
    const out = await this.trySendDelta(vaultId, sent, signal);
    return out ?? this.uploadSnapshot(vaultId, opts, signal, artwork);
  }

  /** Publishes a delta; `null` means the backup needs a full upload instead. */
  private async sendDelta(
    vaultId: string,
    delta: VaultDeltaPayload,
    base: string,
    signal: AbortSignal,
  ): Promise<SnapshotOutcome | null> {
    const result = await pushDeltaToCloudBackup(
      this.deps!.runtime,
      vaultId,
      delta,
      base,
      signal,
    );
    if (!result.ok) {
      if ("fullPushRequired" in result) return null;
      return uploadFailure(result);
    }
    if (!result.value) return BACKUP_OFF;
    this.state.lastPushedAt = result.value.lastPushedAt;
    return { ok: true };
  }

  private async uploadSnapshot(
    vaultId: string,
    opts: { guarded: boolean },
    signal: AbortSignal,
    artwork?: { includeAdventures: boolean },
  ): Promise<SnapshotOutcome> {
    const deps = this.deps!;
    const payload = artwork
      ? await deps.buildPayload(vaultId, signal, {
          includeAdventures: artwork.includeAdventures,
        })
      : await deps.buildPayload(vaultId, signal);
    if (signal.aborted) return BACKUP_OFF;
    this.state.skippedAssets =
      (payload as { skippedAssets?: string[] }).skippedAssets ?? [];
    this.state.skippedEntities =
      (payload as { skippedEntities?: string[] }).skippedEntities ?? [];
    const { skipAssetUploadIds, freshHashes } = await this.media.planUploads(
      payload.assets ?? [],
      deps.timing,
    );
    const entities = (payload.bundle as { entities?: unknown })?.entities;
    const copy = Array.isArray(entities) ? deepCopy(entities) : null;
    this.sentBase = copy && ((base) => base.replaceVault(vaultId, copy));
    const result = await pushVaultToCloudBackup(
      deps.runtime,
      vaultId,
      payload,
      (progress) => {
        this.state.uploadProgress = progress;
      },
      {
        skipAssetUploadIds,
        ...(opts.guarded
          ? { expectLastPushedAt: this.state.lastPushedAt }
          : {}),
        signal,
        onTiming: deps.timing,
      },
    );
    if (!result.ok) {
      return uploadFailure(result);
    }
    if (!result.value) return BACKUP_OFF;
    this.media.hashes = freshHashes;
    this.media.save(vaultId);
    this.state.lastPushedAt = result.value.lastPushedAt;
    return { ok: true };
  }
}
