import { CLOUD_BACKUP_LIMITS } from "../../../../packages/schema/src/publishing";
import {
  type CloudBackupEnv,
  getAssetKey,
  reachableBytes,
  resolveObjects,
} from "./cloud-backup-storage";
import {
  cors,
  json,
  notFoundOrUnauthorized,
  tooLargeToRead,
  isValidAssetId,
  sizeLimitResponse,
  storageUnavailable,
} from "./cloud-backup-http";
import { preserveBeforeOverwrite } from "./cloud-backup-restore-points";
import { authorizeStoredBackup } from "./cloud-backup-auth";

/**
 * PUT /api/cloud-backup/{backupId}/assets/{assetId} — one file, raw bytes.
 *
 * Raw rather than base64-in-JSON: base64 inflates by a third and forces both
 * ends to hold the whole vault in memory at once. Streaming one file per
 * request keeps peak memory bounded by a single asset, and lets a failed
 * upload be retried on its own instead of restarting the backup.
 */
export async function handleCloudBackupAssetUpload(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  assetId: string,
): Promise<Response> {
  const auth = await authorizeStoredBackup(request, env, backupId);
  if ("response" in auth) return auth.response;

  if (!isValidAssetId(assetId)) {
    return json(request, { error: { message: "Invalid asset id" } }, 400);
  }

  const oversized = tooLargeToRead(request, CLOUD_BACKUP_LIMITS.maxAssetBytes);
  if (oversized) return oversized;

  const bytes = new Uint8Array(await request.arrayBuffer());
  // Also enforce the actual size when Content-Length was absent or understated.
  const fileTooLarge = sizeLimitResponse(
    request,
    bytes.byteLength,
    CLOUD_BACKUP_LIMITS.maxAssetBytes,
    "This file is too large to back up.",
  );
  if (fileTooLarge) return fileTooLarge;

  const key = getAssetKey(backupId, assetId);
  // Measured against what is already stored, minus whatever this upload
  // replaces, so a re-uploaded file is not counted twice.
  const existing = await env.BUCKET.head(key);
  const projected =
    (await reachableBytes(
      env,
      backupId,
      await resolveObjects(env, backupId, auth.objects),
    )) -
    (existing?.size ?? 0) +
    bytes.byteLength;
  const vaultTooLarge = sizeLimitResponse(
    request,
    projected,
    CLOUD_BACKUP_LIMITS.maxVaultBytes,
    "This vault is too large to back up.",
  );
  if (vaultTooLarge) return vaultTooLarge;

  if (
    existing &&
    existing.etag &&
    !(await preserveBeforeOverwrite(
      env,
      backupId,
      assetId,
      existing.etag,
      auth.sharing !== undefined,
    ))
  ) {
    return storageUnavailable(request);
  }

  await env.BUCKET.put(key, bytes, {
    httpMetadata: {
      contentType:
        request.headers.get("Content-Type") || "application/octet-stream",
    },
  });

  return json(request, { assetId, sizeBytes: bytes.byteLength });
}

/** GET /api/cloud-backup/{backupId}/assets/{assetId} */
export async function handleGetCloudBackupAsset(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  assetId: string,
): Promise<Response> {
  const auth = await authorizeStoredBackup(request, env, backupId);
  if ("response" in auth) return auth.response;

  const object = await env.BUCKET.get(getAssetKey(backupId, assetId));
  if (!object) return notFoundOrUnauthorized(request);

  return new Response(object.body, {
    status: 200,
    headers: {
      ...cors(request),
      "Content-Type":
        object.httpMetadata?.contentType || "application/octet-stream",
    },
  });
}
