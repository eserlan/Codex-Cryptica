/**
 * CC Cloud Backup client (spec 162, issue #2593).
 *
 * Pure functions over an injected runtime, so the whole surface is testable
 * without a network or a browser. `apps/web` supplies the real `fetch` and an
 * IndexedDB-backed store; tests supply mocks.
 *
 * Two invariants shape the design:
 *
 * - **Local wins, always.** These functions mirror a vault outward, on demand.
 *   A failed upload must never affect local work (FR-019), so
 *   `pushVaultToCloudBackup` reports failure rather than throwing.
 * - **Nothing leaves the device before consent.** No function here transmits
 *   anything for a vault with no local record, which is what makes "off by
 *   default" enforceable rather than merely intended (FR-001, FR-003).
 */
import { type CloudBackupManifest, type LocalCloudBackupRecord } from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { detectConflict } from "./auto-sync";
import { readRemoteLastPushedAt } from "./backup-metadata";
import { getLocalCloudBackupRecord as readRecord } from "./backup-records";
import { responseFailure } from "./backup-response";
import type {
  VaultBundlePayload,
  UploadProgress,
  SnapshotUploadOptions,
  CloudBackupOutcome,
} from "./types";
export type {
  VaultBundlePayload,
  UploadProgress,
  CloudBackupTimingStage,
  CloudBackupTiming,
  SnapshotUploadOptions,
  CloudBackupOutcome,
} from "./types";
export {
  getLocalCloudBackupRecord,
  listKnownCloudBackups,
  getCloudBackupOwnershipCode,
  type KnownCloudBackup,
} from "./backup-records";

/** Monotonic clock that survives environments without `performance`. */
function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Asset PUTs in flight at once. Mirrors the hydration bound: enough to stop a
 * media-heavy save taking the sum of every round trip, few enough not to
 * stampede the worker or the browser's per-host connection limit.
 */
export const ASSET_UPLOAD_CONCURRENCY = 8;

/**
 * Uploads the vault's current state, replacing the previous backup (FR-018).
 *
 * Explicitly triggered — the user presses "Save to cloud"; nothing here runs on
 * a timer or a save hook. Returns an outcome instead of throwing, and is a
 * no-op for a vault that is not enabled, so a stray call can never send data
 * for a vault that never opted in (FR-019, FR-001).
 */
/**
 * Uploads a snapshot: every asset, then the commit that publishes it.
 *
 * Assets go first because the commit prunes anything the new snapshot does not
 * list — committing first would briefly describe media that is not there yet.
 * A failed asset aborts before the commit, which leaves the previous snapshot
 * whole rather than half-replaced.
 */
async function uploadSnapshot(
  runtime: CloudBackupRuntime,
  record: Pick<LocalCloudBackupRecord, "backupId" | "ownerCode">,
  payload: VaultBundlePayload,
  onProgress?: (progress: UploadProgress) => void,
  options?: SnapshotUploadOptions,
): Promise<CloudBackupOutcome<CloudBackupManifest | null>> {
  const assets = payload.assets ?? [];
  const auth = `Bearer ${record.ownerCode}`;
  const skip = new Set(options?.skipAssetUploadIds ?? []);
  const uploadStartedAt = nowMs();

  // Bounded concurrency: strictly sequential PUTs make a media-heavy save
  // take the sum of every round trip (measured 29s for 15 files). PUTs are
  // idempotent — same id, same bytes — so completion order is irrelevant
  // and only the finished count is reported.
  let cursor = 0;
  let completed = 0;
  const failures: { error: string; status: number }[] = [];
  const worker = async () => {
    while (cursor < assets.length && failures.length === 0) {
      options?.signal?.throwIfAborted();
      const asset = assets[cursor++];
      if (!skip.has(asset.assetId)) {
        const response = await runtime.fetch(
          `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/assets/${encodeURIComponent(asset.assetId)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": asset.mimeType || "application/octet-stream",
              Authorization: auth,
            },
            body: asset.bytes,
            signal: options?.signal,
          },
        );
        if (failures.length > 0) return;
        if (!response.ok) {
          // First failure wins; the rest stop picking up work and the commit
          // below never runs, so a half-uploaded snapshot is never published.
          failures.push({
            ...(await responseFailure(response)),
          });
          return;
        }
      }
      completed += 1;
      onProgress?.({ uploaded: completed, total: assets.length });
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(ASSET_UPLOAD_CONCURRENCY, assets.length) },
      worker,
    ),
  );
  options?.signal?.throwIfAborted();
  const firstFailure = failures[0];
  if (firstFailure) {
    return {
      ok: false,
      error: firstFailure.error,
      status: firstFailure.status,
    };
  }

  options?.signal?.throwIfAborted();
  // Timed apart from the network: stringify is the one synchronous,
  // main-thread, size-proportional block in this function.
  const serializeStartedAt = nowMs();
  const commitBody = JSON.stringify({
    vaultTitle: payload.vaultTitle,
    bundle: payload.bundle,
    assetIds: assets.map((asset) => asset.assetId),
  });
  options?.onTiming?.({
    stage: "serialize",
    durationMs: nowMs() - serializeStartedAt,
    bytes: commitBody.length,
  });
  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/commit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: commitBody,
      signal: options?.signal,
    },
  );
  options?.signal?.throwIfAborted();
  options?.onTiming?.({
    stage: "upload",
    durationMs: nowMs() - uploadStartedAt,
    count: assets.length,
    bytes:
      commitBody.length +
      assets.reduce((total, asset) => total + asset.bytes.length, 0),
  });

  if (!response.ok) {
    return responseFailure(response);
  }

  // A 200 with an unreadable body is still a failure, never a silent success.
  let manifest: CloudBackupManifest | undefined;
  try {
    manifest = ((await response.json()) as { manifest?: CloudBackupManifest })
      ?.manifest;
  } catch {
    manifest = undefined;
  }
  if (!manifest?.lastPushedAt) {
    return {
      ok: false,
      error: "The backup service returned an unreadable response.",
    };
  }
  return { ok: true, value: manifest };
}

export interface PushVaultOptions extends SnapshotUploadOptions {
  /**
   * Optimistic-concurrency guard (#3189): when set, the remote state is read
   * first and the push aborts — uploading nothing — if the remote
   * lastPushedAt differs, meaning another device committed since. Best
   * effort only: a true race needs server revisions (follow-up).
   */
  expectLastPushedAt?: string | null;
}

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
      ...record,
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

export {
  enableCloudBackup,
  attachCloudBackup,
  disableCloudBackup,
  deleteCloudBackup,
} from "./backup-lifecycle";
export { pushDeltaToCloudBackup, type VaultDeltaPayload } from "./delta-sync";
export { fetchCloudBackupIndex, getCloudBackupStatus } from "./backup-metadata";
export {
  fetchCloudBackupAsset,
  restoreVaultFromCloudBackup,
} from "./backup-restore";
