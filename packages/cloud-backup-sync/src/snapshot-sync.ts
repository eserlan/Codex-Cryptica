import type { CloudBackupManifest, LocalCloudBackupRecord } from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { detectConflict } from "./auto-sync";
import { readRemoteLastPushedAt } from "./backup-metadata";
import {
  getLocalCloudBackupRecord as readRecord,
  withCommittedRevision,
} from "./backup-records";
import { uploadSnapshot } from "./snapshot-upload";
import type {
  VaultBundlePayload,
  UploadProgress,
  SnapshotUploadOptions,
  CloudBackupOutcome,
} from "./types";

export interface PushVaultOptions extends SnapshotUploadOptions {
  /**
   * Optimistic-concurrency guard (#3189): when set, the remote state is read
   * first and the push aborts — uploading nothing — if the remote
   * lastPushedAt differs, meaning another device committed since. Best
   * effort only: a true race needs the race-safe commit (shared vault slice 2); revisions now exist.
   */
  expectLastPushedAt?: string | null;
}

/**
 * The record after a commit. An unguarded push is the user's explicit
 * overwrite, so it settles any commit another device made; a guarded one
 * leaves the flag as it was.
 */
function committedRecord(
  record: LocalCloudBackupRecord,
  manifest: CloudBackupManifest,
  guard: string | null | undefined,
): LocalCloudBackupRecord {
  const { foreignCommitSeen, ...committed } = withCommittedRevision(
    record,
    manifest,
  );
  return foreignCommitSeen && guard !== undefined
    ? { ...committed, foreignCommitSeen }
    : committed;
}

/**
 * Uploads the vault's current state, replacing the previous backup (FR-018).
 *
 * Explicitly triggered — the user presses "Save to cloud"; nothing here runs on
 * a timer or a save hook. Returns an outcome instead of throwing, and is a
 * no-op for a vault that is not enabled, so a stray call can never send data
 * for a vault that never opted in (FR-019, FR-001).
 */
export async function pushVaultToCloudBackup(
  runtime: CloudBackupRuntime,
  vaultId: string,
  payload: VaultBundlePayload,
  onProgress?: (progress: UploadProgress) => void,
  options?: PushVaultOptions,
): Promise<CloudBackupOutcome<CloudBackupManifest | null>> {
  const record = await readRecord(runtime, vaultId);
  if (!record || !record.enabled) return { ok: true, value: null };
  try {
    options?.signal?.throwIfAborted();

    if (options?.expectLastPushedAt !== undefined) {
      const remote = await readRemoteLastPushedAt(
        runtime,
        record,
        options.signal,
      );
      options?.signal?.throwIfAborted();
      if (!remote.ok) {
        await runtime.storage.write(vaultId, { ...record, status: "error" });
        return remote;
      }
      // Any divergence aborts: a newer remote is a conflict, while an older
      // or missing remote means our record is stale and must not overwrite.
      if (remote.value !== options.expectLastPushedAt) {
        await runtime.storage.write(vaultId, { ...record, status: "error" });
        const newerRemote = detectConflict(
          options.expectLastPushedAt,
          remote.value,
        );
        return {
          ok: false,
          error: newerRemote
            ? "Another device updated this backup. Automatic sync paused so nothing is overwritten."
            : "The cloud backup changed unexpectedly. Automatic sync paused.",
          conflict: true,
          remoteLastPushedAt: remote.value,
        };
      }
    }

    options?.signal?.throwIfAborted();
    await runtime.storage.write(vaultId, { ...record, status: "syncing" });

    const result = await uploadSnapshot(runtime, record, payload, onProgress, {
      skipAssetUploadIds: options?.skipAssetUploadIds,
      signal: options?.signal,
      onTiming: options?.onTiming,
    });
    options?.signal?.throwIfAborted();
    if (!result.ok) {
      // Visible failure, never a silent stale success (FR-011). The local save
      // has already happened and is untouched by this.
      await runtime.storage.write(vaultId, { ...record, status: "error" });
      return result;
    }
    if (result.value === null) return { ok: true, value: null };

    await runtime.storage.write(vaultId, {
      ...committedRecord(record, result.value, options?.expectLastPushedAt),
      status: "idle",
      lastPushedAt: result.value.lastPushedAt,
      // A renamed vault should show under its current name, not the old one.
      vaultTitle: payload.vaultTitle,
    });
    return { ok: true, value: result.value };
  } catch (error) {
    if (options?.signal?.aborted) return { ok: true, value: null };
    throw error;
  }
}
