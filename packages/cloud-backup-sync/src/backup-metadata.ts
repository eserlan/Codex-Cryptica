import type { LocalCloudBackupRecord } from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { getLocalCloudBackupRecord as readRecord } from "./backup-records";
import { responseFailure } from "./backup-response";
import type { CloudBackupOutcome } from "./types";

/**
 * Per-entity content hashes of a v2 backup (#3354), for the idle consistency
 * check. Hashes only — the response never carries vault content.
 */
export async function fetchCloudBackupIndex(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<CloudBackupOutcome<Record<string, string>>> {
  const record = await readRecord(runtime, vaultId);
  if (!record?.enabled) return { ok: false, error: "Cloud backup is off." };
  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/index`,
    { headers: { Authorization: `Bearer ${record.ownerCode}` } },
  );
  if (!response.ok) {
    return responseFailure(response);
  }
  const body = (await response.json().catch(() => null)) as {
    entityHashes?: unknown;
  } | null;
  const hashes = body?.entityHashes;
  return {
    ok: true,
    value:
      hashes && typeof hashes === "object"
        ? Object.fromEntries(
            Object.entries(hashes).filter(
              ([, value]) => typeof value === "string",
            ) as [string, string][],
          )
        : {},
  };
}

/**
 * Reads just the remote lastPushedAt for the optimistic-concurrency guard.
 * Returns null (not an error) when the remote has no timestamp yet.
 */
async function fetchBackupStatus(
  runtime: CloudBackupRuntime,
  record: Pick<LocalCloudBackupRecord, "backupId" | "ownerCode">,
  signal?: AbortSignal,
): Promise<Awaited<ReturnType<CloudBackupRuntime["fetch"]>>> {
  return runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/status`,
    { headers: { Authorization: `Bearer ${record.ownerCode}` }, signal },
  );
}

export async function readRemoteLastPushedAt(
  runtime: CloudBackupRuntime,
  record: Pick<LocalCloudBackupRecord, "backupId" | "ownerCode">,
  signal?: AbortSignal,
): Promise<CloudBackupOutcome<string | null>> {
  const response = await fetchBackupStatus(runtime, record, signal);
  if (!response.ok) {
    return responseFailure(response);
  }
  const body = (await response.json().catch(() => null)) as {
    lastPushedAt?: unknown;
  } | null;
  // The timestamp is untrusted server JSON: only a string participates in
  // the guard. Anything else degrades to "no timestamp" (first push wins /
  // divergence pauses), never to a mis-compared overwrite.
  const lastPushedAt = body?.lastPushedAt;
  return {
    ok: true,
    value: typeof lastPushedAt === "string" ? lastPushedAt : null,
  };
}

export async function getCloudBackupStatus(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<
  CloudBackupOutcome<{
    status: string;
    lastPushedAt: string | null;
    sizeBytes: number;
  }>
> {
  const record = await readRecord(runtime, vaultId);
  if (!record)
    return { ok: false, error: "Cloud backup is not set up for this vault." };

  const response = await fetchBackupStatus(runtime, record);
  if (!response.ok) {
    return responseFailure(response);
  }
  return {
    ok: true,
    value: (await response.json()) as {
      status: string;
      lastPushedAt: string | null;
      sizeBytes: number;
    },
  };
}
