import type { CloudBackupManifest, LocalCloudBackupRecord } from "schema";
import type { CloudBackupRuntime } from "./runtime";
import type {
  CloudBackupOutcome,
  CloudBackupTiming,
  SnapshotUploadOptions,
  UploadProgress,
  VaultBundlePayload,
} from "./types";
import { uploadSnapshotAssets } from "./asset-upload";
import { responseFailure } from "./backup-response";
import { cloudBackupHeaders } from "./request-headers";

/** Monotonic clock that survives environments without `performance`. */
function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function serializeSnapshot(
  payload: VaultBundlePayload,
  assets: NonNullable<VaultBundlePayload["assets"]>,
  onTiming?: (timing: CloudBackupTiming) => void,
): string {
  // Timed apart from the network: stringify is the synchronous,
  // main-thread, size-proportional block in a snapshot upload.
  const startedAt = nowMs();
  const body = JSON.stringify({
    vaultTitle: payload.vaultTitle,
    bundle: payload.bundle,
    assetIds: assets.map((asset) => asset.assetId),
  });
  onTiming?.({
    stage: "serialize",
    durationMs: nowMs() - startedAt,
    bytes: body.length,
  });
  return body;
}

async function readCommitOutcome(
  response: Awaited<ReturnType<CloudBackupRuntime["fetch"]>>,
): Promise<CloudBackupOutcome<CloudBackupManifest | null>> {
  if (!response.ok) return responseFailure(response);

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

/**
 * Uploads assets before committing the snapshot that references them.
 * A failed asset leaves the previous snapshot whole rather than half-replaced.
 */
export async function uploadSnapshot(
  runtime: CloudBackupRuntime,
  record: Pick<LocalCloudBackupRecord, "backupId" | "ownerCode" | "role">,
  payload: VaultBundlePayload,
  onProgress?: (progress: UploadProgress) => void,
  options?: SnapshotUploadOptions,
): Promise<CloudBackupOutcome<CloudBackupManifest | null>> {
  const assets = payload.assets ?? [];
  const skip = new Set(options?.skipAssetUploadIds ?? []);
  const uploadStartedAt = nowMs();
  const uploaded = await uploadSnapshotAssets(
    runtime,
    record,
    assets,
    onProgress,
    { skip, signal: options?.signal },
  );
  if (!uploaded.ok) return uploaded;

  options?.signal?.throwIfAborted();
  const commitBody = serializeSnapshot(payload, assets, options?.onTiming);
  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/commit`,
    {
      method: "POST",
      headers: cloudBackupHeaders(runtime, record, {
        "Content-Type": "application/json",
      }),
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
  return readCommitOutcome(response);
}
