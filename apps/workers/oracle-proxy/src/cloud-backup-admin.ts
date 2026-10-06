import { CLOUD_BACKUP_LIMITS } from "../../../../packages/schema/src/publishing";
import type { CloudBackupEnv } from "./cloud-backup";
import {
  PREFIX,
  readManifest,
  eraseBackupObjects,
  generateOwnerCode,
  hashOwnerCode,
  getManifestKey,
  isAdmin,
  json,
} from "./cloud-backup";

/**
 * The owner route needs the vault's code, which is exactly what a user who
 * cleared their browser, lost the device or wants a takedown no longer has.
 * This is the operator's equivalent: same erase, authorised by the support
 * token rather than the vault code.
 *
 * It deletes by explicit backup id only — there is no "delete everything
 * matching" here, for the same reason the lookup route refuses to enumerate.
 * Like the other admin routes it answers 404 rather than 401 when the token is
 * wrong, so probing cannot distinguish a bad token from a missing backup.
 */
export async function handleCloudBackupAdminDelete(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  if (!isAdmin(request, env)) {
    return json(request, { error: { message: "Not found" } }, 404);
  }
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  const existed = (await readManifest(env, backupId)) !== null;
  await eraseBackupObjects(env, backupId);

  return json(request, { deleted: true, existed });
}

/**
 * POST /api/cloud-backup/admin/lookup — support-only metadata lookup.
 *
 * Deliberately narrow. It resolves to exactly one match or to nothing: two
 * matches return the same empty answer as zero, so an admin never learns how
 * many vaults share a title. The scan reads one bounded page and never
 * paginates onward, because walking the whole prefix is bulk enumeration under
 * another name (FR-016).
 */
export async function handleCloudBackupAdminLookup(
  request: Request,
  env: CloudBackupEnv,
): Promise<Response> {
  if (!isAdmin(request, env)) {
    return json(request, { error: { message: "Not found" } }, 404);
  }
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: { message: "Invalid JSON" } }, 400);
  }
  const query =
    typeof body?.vaultTitle === "string" ? body.vaultTitle.trim() : "";
  if (!query) return json(request, { matched: false });

  const listed = await env.BUCKET.list({
    prefix: PREFIX,
    limit: CLOUD_BACKUP_LIMITS.maxLookupScanKeys,
  });

  const normalized = query.toLowerCase();
  const matches = (listed.objects ?? []).filter(
    (object: any) =>
      object.key.endsWith("/manifest.json") &&
      (object.customMetadata?.vaultTitle ?? "").toLowerCase() === normalized,
  );

  if (matches.length !== 1 || listed.truncated) {
    return json(request, { matched: false });
  }

  const backupId = matches[0].key
    .slice(PREFIX.length)
    .replace("/manifest.json", "");
  const record = await readManifest(env, backupId);
  if (!record) return json(request, { matched: false });

  return json(request, {
    matched: true,
    backupId,
    vaultTitle: record.manifest.vaultTitle,
    sizeBytes: record.manifest.sizeBytes,
    lastPushedAt: record.manifest.lastPushedAt,
  });
}

const MAX_STATS_SCAN_OBJECTS = 200_000;

/**
 * GET /api/cloud-backup/admin/stats — aggregate counts only.
 *
 * Deliberately the opposite shape from the lookup above: this one *does* walk
 * the whole `cloud-backup/` prefix, because the only thing it returns is
 * summed totals — vault count, total stored bytes, total asset count. It never
 * returns a title, a backup id, or anything else that identifies one vault, so
 * it does not reopen the bulk-enumeration door FR-016 closes: an operator
 * learns "how many" and "how big", never "which ones".
 */
export async function handleCloudBackupAdminStats(
  request: Request,
  env: CloudBackupEnv,
): Promise<Response> {
  if (!isAdmin(request, env)) {
    return json(request, { error: { message: "Not found" } }, 404);
  }
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  let vaultCount = 0;
  let assetCount = 0;
  let totalBytes = 0;
  let objectsScanned = 0;
  let cursor: string | undefined;
  let complete = true;

  do {
    const listed = await env.BUCKET.list({
      prefix: PREFIX,
      cursor,
      limit: 1000,
    });
    for (const object of listed.objects ?? []) {
      objectsScanned += 1;
      totalBytes += object.size ?? 0;
      if (object.key.endsWith("/manifest.json")) vaultCount += 1;
      else if (object.key.includes("/assets/")) assetCount += 1;
    }
    if (objectsScanned >= MAX_STATS_SCAN_OBJECTS && listed.truncated) {
      complete = false;
      break;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return json(request, {
    vaultCount,
    assetCount,
    totalBytes,
    complete,
  });
}

/**
 * POST /api/cloud-backup/admin/{backupId}/reissue-code
 *
 * Mints a replacement code so a user who lost theirs can self-serve again
 * (FR-017). Only one code is ever valid, so the previous one stops working.
 */
export async function handleCloudBackupReissueCode(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  if (!isAdmin(request, env)) {
    return json(request, { error: { message: "Not found" } }, 404);
  }
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  const record = await readManifest(env, backupId);
  if (!record) return json(request, { error: { message: "Not found" } }, 404);

  const ownerCode = generateOwnerCode();
  await env.BUCKET.put(
    getManifestKey(backupId),
    JSON.stringify(record.manifest),
    {
      httpMetadata: { contentType: "application/json" },
      customMetadata: {
        ownerCodeHash: await hashOwnerCode(ownerCode),
        vaultTitle: record.manifest.vaultTitle,
      },
    },
  );

  return json(request, { ownerCode });
}
