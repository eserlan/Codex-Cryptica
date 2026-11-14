import type { CloudBackupManifest } from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { responseFailure } from "./backup-response";
import {
  cloudBackupHeaders,
  type CloudBackupCredentials,
} from "./request-headers";
import type { CloudBackupOutcome } from "./types";

/**
 * Downloads one asset from a backup.
 *
 * Separate from the bundle fetch so a failing image cannot cost the user the
 * whole restore — the caller decides what to do with a partial set.
 */
export async function fetchCloudBackupAsset(
  runtime: CloudBackupRuntime,
  credentials: CloudBackupCredentials,
  assetId: string,
): Promise<CloudBackupOutcome<Uint8Array>> {
  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${credentials.backupId}/assets/${assetId}`,
    { headers: cloudBackupHeaders(runtime, credentials) },
  );
  if (!response.ok) {
    return responseFailure(response);
  }
  return { ok: true, value: new Uint8Array(await response.arrayBuffer()) };
}

/**
 * Restore (FR-006).
 *
 * The download is fully staged before the caller is given anything to write, so
 * an interruption leaves local data untouched rather than half-replaced
 * (FR-011). This function never writes to the vault itself — it returns the
 * material and lets the caller decide the destination (FR-006a).
 */
export async function restoreVaultFromCloudBackup(
  runtime: CloudBackupRuntime,
  credentials: CloudBackupCredentials,
): Promise<
  CloudBackupOutcome<{ manifest: CloudBackupManifest; bundle: unknown }>
> {
  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${credentials.backupId}/bundle`,
    { headers: cloudBackupHeaders(runtime, credentials) },
  );
  if (!response.ok) {
    return responseFailure(response, credentials);
  }

  const body = (await response.json()) as {
    manifest: CloudBackupManifest;
    bundle: unknown;
  };
  if (!body?.manifest || body.bundle === undefined) {
    return { ok: false, error: "The backup could not be read." };
  }
  return { ok: true, value: body };
}
