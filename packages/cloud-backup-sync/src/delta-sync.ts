import type { CloudBackupManifest, LocalCloudBackupRecord } from "schema";
import type { CloudBackupRuntime } from "./runtime";
import {
  getLocalCloudBackupRecord as readRecord,
  withCommittedRevision,
} from "./backup-records";
import type { CloudBackupOutcome } from "./types";

/** The changed-only part of a vault, for `pushDeltaToCloudBackup` (#3354). */
export interface VaultDeltaPayload {
  vaultTitle: string;
  upserts: { id: string }[];
  deletes: string[];
  /** Complete set of currently referenced media, used to prune removed files. */
  assetIds: string[];
  /** Present only when maps changed; replaces the backup's maps whole. */
  maps?: unknown[];
  /** Present only when canvases changed; replaces the backup's canvases whole. */
  canvases?: unknown[];
}

/**
 * Publishes only what changed since `baseLastPushedAt` (#3354).
 *
 * `fullPushRequired` means the backup cannot take a delta — still in the older
 * whole-vault format, or a worker without the delta route — and the caller
 * should send a full snapshot instead. Both answer 404 for an unknown route and
 * for a wrong code; a full push re-checks the code, so a 404 falls back too.
 */
export async function pushDeltaToCloudBackup(
  runtime: CloudBackupRuntime,
  vaultId: string,
  delta: VaultDeltaPayload,
  baseLastPushedAt: string,
  signal?: AbortSignal,
): Promise<
  | CloudBackupOutcome<CloudBackupManifest | null>
  | { ok: false; fullPushRequired: true; error: string }
> {
  const record = await readRecord(runtime, vaultId);
  if (!record || !record.enabled) return { ok: true, value: null };
  if (signal?.aborted) return { ok: true, value: null };

  await runtime.storage.write(vaultId, { ...record, status: "syncing" });
  try {
    const response = await runtime.fetch(
      `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/delta`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${record.ownerCode}`,
        },
        body: JSON.stringify({
          ...delta,
          baseLastPushedAt,
          ...(typeof record.revision === "number"
            ? { baseRevision: record.revision }
            : {}),
        }),
        signal,
      },
    );
    if (await restoreDeltaRecordAfterAbort(runtime, vaultId, record, signal)) {
      return { ok: true, value: null };
    }
    return response.ok
      ? applyDeltaSuccess(runtime, vaultId, record, delta, response, signal)
      : applyDeltaFailure(runtime, vaultId, record, response, signal);
  } catch (error) {
    if (await restoreDeltaRecordAfterAbort(runtime, vaultId, record, signal)) {
      return { ok: true, value: null };
    }
    throw error;
  }
}

async function restoreDeltaRecordAfterAbort(
  runtime: CloudBackupRuntime,
  vaultId: string,
  record: LocalCloudBackupRecord,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!signal?.aborted) return false;
  await runtime.storage.write(vaultId, record);
  return true;
}

async function applyDeltaFailure(
  runtime: CloudBackupRuntime,
  vaultId: string,
  record: LocalCloudBackupRecord,
  response: Awaited<ReturnType<CloudBackupRuntime["fetch"]>>,
  signal?: AbortSignal,
): Promise<
  | CloudBackupOutcome<CloudBackupManifest | null>
  | { ok: false; fullPushRequired: true; error: string }
> {
  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string; lastPushedAt?: string };
  } | null;
  if (await restoreDeltaRecordAfterAbort(runtime, vaultId, record, signal)) {
    return { ok: true, value: null };
  }
  const code = body?.error?.code;
  const fullPushRequired =
    response.status === 404 || code === "full_push_required";
  const outcome = fullPushRequired
    ? fullPushDeltaFailure(body?.error?.message)
    : ordinaryDeltaFailure(response.status, code, body?.error);
  await runtime.storage.write(
    vaultId,
    fullPushRequired ? record : { ...record, status: "error" },
  );
  return outcome;
}

function fullPushDeltaFailure(message?: string) {
  return {
    ok: false as const,
    fullPushRequired: true as const,
    error: message ?? "A full upload is required.",
  };
}

function ordinaryDeltaFailure(
  status: number,
  code?: string,
  error?: { message?: string; lastPushedAt?: string },
) {
  return {
    ok: false as const,
    error: error?.message ?? `Request failed (${status})`,
    status,
    ...(code === "diverged"
      ? { conflict: true, remoteLastPushedAt: error?.lastPushedAt ?? null }
      : {}),
  };
}

async function applyDeltaSuccess(
  runtime: CloudBackupRuntime,
  vaultId: string,
  record: LocalCloudBackupRecord,
  delta: VaultDeltaPayload,
  response: Awaited<ReturnType<CloudBackupRuntime["fetch"]>>,
  signal?: AbortSignal,
): Promise<CloudBackupOutcome<CloudBackupManifest | null>> {
  const manifest = (
    (await response.json().catch(() => null)) as {
      manifest?: CloudBackupManifest;
    } | null
  )?.manifest;
  if (await restoreDeltaRecordAfterAbort(runtime, vaultId, record, signal)) {
    return { ok: true, value: null };
  }
  if (!manifest?.lastPushedAt) {
    await runtime.storage.write(vaultId, { ...record, status: "error" });
    return {
      ok: false,
      error: "The backup service returned an unreadable response.",
    };
  }
  await runtime.storage.write(vaultId, {
    ...withCommittedRevision(record, manifest),
    status: "idle",
    lastPushedAt: manifest.lastPushedAt,
    vaultTitle: delta.vaultTitle,
  });
  return { ok: true, value: manifest };
}
