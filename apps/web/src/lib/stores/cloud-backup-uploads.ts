import {
  getLocalCloudBackupRecord,
  pushDeltaToCloudBackup,
  pushVaultToCloudBackup,
  type VaultDeltaPayload,
} from "@codex/cloud-backup-sync";
import { browserStorage } from "#lib/utils/runtime-deps.js";
import type { CloudBackupDirtyRow } from "./cloud-backup-dirty";
import {
  BACKUP_OFF,
  type CloudBackupDepsProvider,
  type CloudBackupViewState,
  type SnapshotOutcome,
} from "./cloud-backup-types";
import { CloudBackupMediaCache } from "./cloud-backup-media-cache";

type UploadState = Pick<
  CloudBackupViewState,
  "lastPushedAt" | "skippedAssets" | "skippedEntities" | "uploadProgress"
>;

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

/** Serial snapshot/delta uploads, cancellation and version-guarded dirty clearing. */
export class CloudBackupUploads {
  pushing = false;
  private activeBuild: AbortController | null = null;
  private activePush: Promise<SnapshotOutcome> | null = null;
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
    const operation = (async () => {
      // Check before building: the snapshot reads every entity, so learning
      // that backup is off only at upload time costs a whole-vault read.
      const record = await getLocalCloudBackupRecord(
        this.deps!.runtime,
        vaultId,
      );
      if (push.signal.aborted || !record?.enabled) return BACKUP_OFF;

      // Taken before building, so anything changed after this point stays
      // pending even though the snapshot may happen to include it.
      const sent = (await this.deps!.dirty?.snapshot(vaultId)) ?? [];
      if (push.signal.aborted) return BACKUP_OFF;

      // Keep the cancellation guard live through upload, including delta
      // writes, so disable can wait before persisting the off record.
      const out = await this.uploadChanges(vaultId, opts, sent, push.signal);
      if (push.signal.aborted) return BACKUP_OFF;
      if (out.ok) await this.deps!.dirty?.clearSent(sent);
      return out;
    })();
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
  ): Promise<SnapshotOutcome> {
    const deps = this.deps!;
    const base = this.state.lastPushedAt;
    if (!opts.guarded || !deps.dirty || !deps.buildDelta || !base) {
      return this.uploadSnapshot(vaultId, opts, signal);
    }
    if (sent.length === 0) return { ok: true };

    const delta = await deps.buildDelta(
      vaultId,
      sent,
      new Set(Object.keys(this.media.hashes)),
      signal,
    );
    if (signal.aborted) return BACKUP_OFF;
    const out = delta
      ? await this.sendDelta(vaultId, delta, base, signal)
      : null;
    return out ?? this.uploadSnapshot(vaultId, opts, signal);
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
  ): Promise<SnapshotOutcome> {
    const deps = this.deps!;
    const payload = await deps.buildPayload(vaultId, signal);
    if (signal.aborted) return BACKUP_OFF;
    this.state.skippedAssets =
      (payload as { skippedAssets?: string[] }).skippedAssets ?? [];
    this.state.skippedEntities =
      (payload as { skippedEntities?: string[] }).skippedEntities ?? [];
    const { skipAssetUploadIds, freshHashes } = await this.media.planUploads(
      payload.assets ?? [],
      deps.timing,
    );
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
