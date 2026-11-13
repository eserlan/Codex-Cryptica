import type { LocalCloudBackupRecord } from "schema";
import type { CloudBackupRuntime } from "./runtime";
import type {
  CloudBackupOutcome,
  UploadProgress,
  VaultBundlePayload,
} from "./types";
import { responseFailure } from "./backup-response";

type Asset = NonNullable<VaultBundlePayload["assets"]>[number];
type Credentials = Pick<LocalCloudBackupRecord, "backupId" | "ownerCode">;

/**
 * Asset PUTs in flight at once. Mirrors the hydration bound: enough to stop a
 * media-heavy save taking the sum of every round trip, few enough not to
 * stampede the worker or the browser's per-host connection limit.
 */
export const ASSET_UPLOAD_CONCURRENCY = 8;

function putAsset(
  runtime: CloudBackupRuntime,
  record: Credentials,
  asset: Asset,
  signal?: AbortSignal,
) {
  return runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/assets/${encodeURIComponent(asset.assetId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        Authorization: `Bearer ${record.ownerCode}`,
      },
      body: asset.bytes,
      signal,
    },
  );
}

/** Uploads media with bounded concurrency; skipped assets still count as complete. */
export async function uploadSnapshotAssets(
  runtime: CloudBackupRuntime,
  record: Credentials,
  assets: Asset[],
  onProgress?: (progress: UploadProgress) => void,
  options?: { skip: ReadonlySet<string>; signal?: AbortSignal },
): Promise<CloudBackupOutcome<null>> {
  // PUTs are idempotent — same id, same bytes — so completion order is
  // irrelevant and only the finished count is reported.
  let cursor = 0;
  let completed = 0;
  const failures: { ok: false; error: string; status: number }[] = [];
  async function uploadNextAssets() {
    while (cursor < assets.length && failures.length === 0) {
      options?.signal?.throwIfAborted();
      const asset = assets[cursor++];
      if (!options?.skip.has(asset.assetId)) {
        const response = await putAsset(
          runtime,
          record,
          asset,
          options?.signal,
        );
        if (failures.length > 0) return;
        if (!response.ok) {
          // First failure wins; workers stop picking up work so a partial
          // upload is never published by the snapshot commit.
          failures.push(await responseFailure(response));
          return;
        }
      }
      completed += 1;
      onProgress?.({ uploaded: completed, total: assets.length });
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(ASSET_UPLOAD_CONCURRENCY, assets.length) },
      uploadNextAssets,
    ),
  );
  options?.signal?.throwIfAborted();
  return failures[0] ?? { ok: true, value: null };
}
