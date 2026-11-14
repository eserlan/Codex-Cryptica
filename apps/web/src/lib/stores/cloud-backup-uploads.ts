import {
  equalContent,
  getLocalCloudBackupRecord,
  pushDeltaToCloudBackup,
  pushVaultToCloudBackup,
  type MergeEntity,
  type VaultDeltaPayload,
} from "@codex/cloud-backup-sync";
import { browserStorage } from "#lib/utils/runtime-deps.js";
import type { CloudBackupBaseStore } from "./cloud-backup-base";
import type { CloudBackupDirtyRow } from "./cloud-backup-dirty";
import {
  BACKUP_OFF,
  blockedFrom,
  type CloudBackupDepsProvider,
  type CloudBackupViewState,
  type SnapshotOutcome,
} from "./cloud-backup-types";
import { CloudBackupMediaCache } from "./cloud-backup-media-cache";
import { runArtworkBackup } from "./cloud-backup-artwork-scope";
import type { PullOutcome } from "./cloud-backup-pulls";

/** Pull-merge-push rounds after a first push is rejected. */
const REBASE_ROUNDS = 3;

const FOREIGN_COMMIT_MESSAGE =
  "Another device updated this backup. Automatic sync paused so nothing is overwritten.";

type UploadState = Pick<
  CloudBackupViewState,
  "lastPushedAt" | "skippedAssets" | "skippedEntities" | "uploadProgress"
> & { artworkConsentVersion?: number; keptLocal?: boolean };

/** What an editor's push needs from the rest of the store. */
export interface EditorHooks {
  /** The consistency check; `ok` is false when the index could not be read. */
  reconcile: (vaultId: string) => Promise<{ ok: boolean; recorded: number }>;
}

function uploadFailure(result: {
  error: string;
  status?: number;
  code?: string;
  linkGone?: true;
  conflict?: boolean;
  remoteLastPushedAt?: string | null;
}): SnapshotOutcome {
  const blocked = blockedFrom(result);
  return {
    ok: false,
    conflict: result.conflict,
    remoteAt: result.remoteLastPushedAt,
    error: result.error,
    ...(blocked ? { blocked } : {}),
  };
}

/** An editor's push that sent nothing the backup cannot take: changes stay here. */
const KEPT_LOCAL: SnapshotOutcome = { ok: true, keptLocal: true };

/** Plain JSON copy, so later edits and reactive proxies cannot change it. */
const deepCopy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Records a full snapshot's entities as the new bases, if it has any. */
function fullSnapshotBase(vaultId: string, bundle: unknown) {
  const entities = (bundle as { entities?: unknown })?.entities;
  if (!Array.isArray(entities)) return null;
  const copy = deepCopy(entities);
  return (base: CloudBackupBaseStore) => base.replaceVault(vaultId, copy);
}

const isEntityOnly = (rows: readonly CloudBackupDirtyRow[]) =>
  rows.every((row) => row.kind === "entity");

/** The outcome that ends a rebase because a pull did not complete; null to go on. */
function pullStop(
  pulled: PullOutcome,
  rejected: SnapshotOutcome,
): SnapshotOutcome | null {
  if (pulled.kind === "done") return null;
  if (pulled.kind === "unsupported") return rejected;
  if (pulled.kind === "held") {
    return { ok: false, held: true, error: "An entity is open for editing." };
  }
  if (pulled.kind === "blocked") {
    return {
      ok: false,
      blocked: pulled.blocked,
      error: "Sync has stopped for this shared vault.",
    };
  }
  const error =
    pulled.kind === "failed" ? pulled.error : "Cloud backup is off.";
  return { ok: false, error };
}

const isEmptyDelta = (delta: VaultDeltaPayload) =>
  delta.upserts.length === 0 &&
  delta.deletes.length === 0 &&
  !delta.maps &&
  !delta.canvases;

/** Serial snapshot/delta uploads, cancellation and version-guarded dirty clearing. */
export class CloudBackupUploads {
  pushing = false;
  private activeBuild: AbortController | null = null;
  private activePush: Promise<SnapshotOutcome> | null = null;
  /** What the running push sends, copied before the request, to become the merge base. */
  private sentBase: ((base: CloudBackupBaseStore) => Promise<void>) | null =
    null;
  /** The dirty rows the running push clears on success; a rebase refreshes them. */
  private sentRows: readonly CloudBackupDirtyRow[] = [];
  /** True while the running push is for an editor, who never sends a full snapshot. */
  private editor = false;
  /** Whether the running editor push left some changes pending. */
  private kept = false;
  readonly media: CloudBackupMediaCache;

  constructor(
    private state: UploadState,
    private getDeps: CloudBackupDepsProvider,
    private runPull?: () => Promise<PullOutcome>,
    private editorHooks?: EditorHooks,
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
    // A gone link makes no request until a rejoin clears it.
    this.editor = record?.role === "editor";
    return !signal.aborted && Boolean(record?.enabled) && !record?.linkGone;
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
    this.sentRows = sent;
    const out = await this.dispatchScopedUpload(vaultId, opts, sent, signal);
    return this.finalizePushOperation(out, this.sentRows, signal);
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
      if (this.editor) this.state.keptLocal = this.kept;
    }
    // An editor never has a conflict to resolve: the failure just retries.
    if (this.editor && out.conflict) return { ok: false, error: out.error };
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
    if (!scope || this.editor)
      return this.uploadChanges(vaultId, opts, sent, signal);
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
    const delta = await this.buildDelta(vaultId, sent, signal);
    if (signal.aborted) return BACKUP_OFF;
    if (!delta) return this.editor ? KEPT_LOCAL : null;
    const outboundDelta = await this.dropEchoes(vaultId, deepCopy(delta));
    // Only a delta that held nothing but echoes is skipped.
    if (
      outboundDelta.upserts.length < delta.upserts.length &&
      isEmptyDelta(outboundDelta)
    ) {
      this.sentBase = null;
      return { ok: true };
    }
    this.sentBase = (base) =>
      base.recordSent(vaultId, outboundDelta.upserts, outboundDelta.deletes);
    return this.sendDelta(
      vaultId,
      outboundDelta,
      this.state.lastPushedAt!,
      signal,
    );
  }

  /**
   * The delta for these rows. An editor's carries only the entity rows that
   * need no new media, and `sentRows` shrinks to exactly those, so the rest
   * stay pending.
   */
  private async buildDelta(
    vaultId: string,
    rows: readonly CloudBackupDirtyRow[],
    signal: AbortSignal,
  ): Promise<VaultDeltaPayload | null> {
    const deps = this.deps!;
    const uploaded = new Set(Object.keys(this.media.hashes));
    if (!this.editor) return deps.buildDelta!(vaultId, rows, uploaded, signal);
    const built = await deps.buildEditorDelta?.(
      vaultId,
      rows,
      uploaded,
      signal,
    );
    this.sentRows = built?.sent ?? [];
    this.kept = this.kept || rows.length > this.sentRows.length;
    return built?.delta ?? null;
  }

  /** Upserts equal to their merge base are pulled changes echoing back. */
  private async dropEchoes(
    vaultId: string,
    delta: VaultDeltaPayload,
  ): Promise<VaultDeltaPayload> {
    const base = this.deps!.base;
    if (!base) return delta;
    const upserts: { id: string }[] = [];
    for (const upsert of delta.upserts) {
      const stored = (await base.get(vaultId, upsert.id)) as
        MergeEntity | undefined;
      if (!stored || !equalContent(stored, upsert as MergeEntity)) {
        upserts.push(upsert);
      }
    }
    return { ...delta, upserts };
  }

  /** A pause outcome when another device committed and whole items would be replaced. */
  private async foreignCommitPause(
    vaultId: string,
  ): Promise<SnapshotOutcome | null> {
    const record = await getLocalCloudBackupRecord(this.deps!.runtime, vaultId);
    if (!record?.foreignCommitSeen) return null;
    return {
      ok: false,
      conflict: true,
      remoteAt: this.state.lastPushedAt,
      error: FOREIGN_COMMIT_MESSAGE,
    };
  }

  /** A guarded full snapshot, unless a whole-item push would overwrite another device. */
  private async uploadWhole(
    vaultId: string,
    opts: { guarded: boolean },
    signal: AbortSignal,
    artwork?: { includeAdventures: boolean },
  ): Promise<SnapshotOutcome> {
    if (this.editor) return KEPT_LOCAL;
    if (opts.guarded) {
      const paused = await this.foreignCommitPause(vaultId);
      if (paused) return paused;
    }
    return this.uploadSnapshot(vaultId, opts, signal, artwork);
  }

  /**
   * After a rejected entity delta: pull, merge, push again. Gives up after
   * three rounds, or when a pull fails, and leaves every dirty row in place.
   */
  private async rebase(
    vaultId: string,
    signal: AbortSignal,
    rejected: SnapshotOutcome,
  ): Promise<SnapshotOutcome | null> {
    for (let round = 0; round < REBASE_ROUNDS; round++) {
      const step = await this.rebaseRound(vaultId, signal, rejected);
      if (step !== "again") return step;
    }
    return { ok: false, error: "Another device keeps changing this backup." };
  }

  /** One pull-merge-push; "again" when the push was rejected once more. */
  private async rebaseRound(
    vaultId: string,
    signal: AbortSignal,
    rejected: SnapshotOutcome,
  ): Promise<SnapshotOutcome | null | "again"> {
    const stopped = pullStop(await this.runPull!(), rejected);
    if (stopped) return stopped;
    const rows = (await this.deps!.dirty?.snapshot(vaultId)) ?? [];
    // Edits made during the pull are in these rows, and clear with them.
    this.sentRows = rows;
    let toSend = rows;
    if (this.editor) toSend = this.editorEntityRows(rows);
    else if (!isEntityOnly(rows)) return rejected;
    const out = await this.trySendDelta(vaultId, toSend, signal);
    return out?.conflict ? "again" : out;
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
    if (this.editor) return this.uploadEditorChanges(vaultId, sent, signal);
    if (!this.canUseDelta(opts, artwork)) {
      return this.uploadWhole(vaultId, opts, signal, artwork);
    }
    if (sent.length === 0) return { ok: true };
    const out = await this.sendRecorded(vaultId, sent, signal);
    return out ?? this.uploadWhole(vaultId, opts, signal, artwork);
  }

  /**
   * An editor's upload: the recorded entity changes as one delta. Maps and
   * canvases stay pending, as do entities that need new media. A `full` row
   * means the change set cannot be trusted; the consistency check replaces it
   * with specific entity rows, and the row is cleared only once that worked.
   */
  private async uploadEditorChanges(
    vaultId: string,
    sent: readonly CloudBackupDirtyRow[],
    signal: AbortSignal,
  ): Promise<SnapshotOutcome> {
    this.kept = false;
    const deps = this.deps!;
    const fullRows = sent.filter((row) => row.kind === "full");
    if (fullRows.length === 0)
      return this.sendEditorRows(vaultId, sent, signal);
    const checked = await this.editorHooks?.reconcile(vaultId);
    if (signal.aborted) return BACKUP_OFF;
    if (!checked?.ok) {
      return {
        ok: false,
        error: "Could not check this vault against the group.",
      };
    }
    await deps.dirty?.clearSent(fullRows);
    const rows = (await deps.dirty?.snapshot(vaultId)) ?? [];
    this.sentRows = rows;
    return this.sendEditorRows(vaultId, rows, signal);
  }

  /** The rows an editor may send; the others stay pending. */
  private editorEntityRows(
    rows: readonly CloudBackupDirtyRow[],
  ): CloudBackupDirtyRow[] {
    const entityRows = rows.filter((row) => row.kind === "entity");
    this.kept = rows.length > entityRows.length;
    this.sentRows = entityRows;
    return entityRows;
  }

  /** Sends the entity rows of an editor's pending set, rebasing like an owner's. */
  private async sendEditorRows(
    vaultId: string,
    rows: readonly CloudBackupDirtyRow[],
    signal: AbortSignal,
  ): Promise<SnapshotOutcome> {
    const out = await this.trySendDelta(
      vaultId,
      this.editorEntityRows(rows),
      signal,
    );
    if (!out?.conflict) return out ?? KEPT_LOCAL;
    return this.runPull && this.deps!.remote
      ? ((await this.rebase(vaultId, signal, out)) ?? KEPT_LOCAL)
      : out;
  }

  /** The delta for the recorded rows, rebased when another device got there first. */
  private async sendRecorded(
    vaultId: string,
    sent: readonly CloudBackupDirtyRow[],
    signal: AbortSignal,
  ): Promise<SnapshotOutcome | null> {
    const entityOnly = isEntityOnly(sent);
    if (!entityOnly) {
      const paused = await this.foreignCommitPause(vaultId);
      if (paused) return paused;
    }
    const out = await this.trySendDelta(vaultId, sent, signal);
    if (!out?.conflict || !entityOnly) return out;
    return this.runPull && this.deps!.remote
      ? this.rebase(vaultId, signal, out)
      : out;
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
      if ("fullPushRequired" in result) return this.keepLocal();
      return uploadFailure(result);
    }
    if (!result.value) return BACKUP_OFF;
    this.state.lastPushedAt = result.value.lastPushedAt;
    return { ok: true };
  }

  /** A full upload was asked for; an editor keeps everything and sends nothing. */
  private keepLocal(): SnapshotOutcome | null {
    if (!this.editor) return null;
    this.sentRows = [];
    this.kept = true;
    return KEPT_LOCAL;
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
    // Snapshot construction returns live entity objects. Detach the bundle
    // before hashing or uploading assets, both of which await before the
    // request body is serialised.
    const outboundPayload = { ...payload, bundle: deepCopy(payload.bundle) };
    this.state.skippedAssets =
      (payload as { skippedAssets?: string[] }).skippedAssets ?? [];
    this.state.skippedEntities =
      (payload as { skippedEntities?: string[] }).skippedEntities ?? [];
    const { skipAssetUploadIds, freshHashes } = await this.media.planUploads(
      payload.assets ?? [],
      deps.timing,
    );
    this.sentBase = fullSnapshotBase(vaultId, outboundPayload.bundle);
    const result = await pushVaultToCloudBackup(
      deps.runtime,
      vaultId,
      outboundPayload,
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
