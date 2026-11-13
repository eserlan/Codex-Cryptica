import type { CloudBackupManifest, LocalCloudBackupRecord } from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { getLocalCloudBackupRecord as readRecord } from "./backup-records";
import { responseFailure } from "./backup-response";
import type { CloudBackupOutcome } from "./types";
import type { VaultBundlePayload } from "./types";
import { readRemoteLastPushedAt } from "./backup-metadata";

function nowIso(runtime: CloudBackupRuntime): string {
  return (runtime.now?.() ?? new Date()).toISOString();
}

/**
 * First backup for a vault.
 *
 * Must only be called after the consent screen has been confirmed — this is the
 * single point at which vault data first leaves the device.
 */
export async function enableCloudBackup(
  runtime: CloudBackupRuntime,
  vaultId: string,
  payload: VaultBundlePayload,
): Promise<CloudBackupOutcome<LocalCloudBackupRecord>> {
  const existing = await readRecord(runtime, vaultId);
  if (existing) {
    // Re-enabling after a disable resumes against the same remote backup; the
    // user never asked for deletion, so there is nothing to recreate.
    const resumed: LocalCloudBackupRecord = {
      ...existing,
      enabled: true,
      // Same backupId, so re-enabling writes over the vault's existing backup
      // rather than opening a second one alongside it.
      vaultTitle: payload.vaultTitle,
    };
    await runtime.storage.write(vaultId, resumed);
    return { ok: true, value: resumed };
  }

  // Only the title: the content follows as individual uploads and a commit.
  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/enable`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultTitle: payload.vaultTitle }),
    },
  );

  if (!response.ok) {
    return responseFailure(response);
  }

  const body = (await response.json().catch(() => null)) as {
    backupId?: string;
    ownerCode?: string;
    manifest?: CloudBackupManifest;
  } | null;

  if (!body?.backupId || !body.ownerCode || !body.manifest?.lastPushedAt) {
    // Without a code there is nothing to store and no way to reach the backup
    // later, so this must fail loudly rather than persist a useless record.
    return {
      ok: false,
      error: "The backup service returned an unreadable response.",
    };
  }

  const record: LocalCloudBackupRecord = {
    vaultId,
    backupId: body.backupId,
    ownerCode: body.ownerCode,
    enabled: true,
    status: "idle",
    lastPushedAt: body.manifest.lastPushedAt,
    consentedAt: nowIso(runtime),
    // Kept so this device can offer the backup by name later.
    vaultTitle: payload.vaultTitle,
  };
  await runtime.storage.write(vaultId, record);
  return { ok: true, value: record };
}

/**
 * Links a local vault to an existing backup (attach).
 *
 * The third path beside "set up" (a brand-new backup) and "load into a new
 * vault" (restore): a vault that is already on this device adopts the cloud
 * copy identified by a recovery key, so the next save pushes there instead of
 * forking a second backup alongside it.
 *
 * The key is verified first — a status read with the ownership code — and
 * nothing is written when the backup cannot be reached, so a mistyped key
 * never links a vault to nowhere. Linking is the deliberate act that data may
 * leave the device, so it stamps consent like enabling does. The stored
 * `lastPushedAt` is the remote timestamp at attach time, which is what lets
 * the guarded auto-push pause on later divergence instead of overwriting it.
 */
export async function attachCloudBackup(
  runtime: CloudBackupRuntime,
  vaultId: string,
  credentials: { backupId: string; ownerCode: string },
  opts: { vaultTitle?: string } = {},
): Promise<CloudBackupOutcome<LocalCloudBackupRecord>> {
  const existing = await readRecord(runtime, vaultId);
  if (existing?.enabled && existing.backupId !== credentials.backupId) {
    // Overwriting this silently would fork the vault onto a second backup
    // while the first keeps billing storage; the user must detach first.
    return {
      ok: false,
      error:
        "This vault is already backing up to a different cloud copy. Turn backup off first, then attach.",
    };
  }

  // Same read the guarded push uses: unreachable or wrong key fails here,
  // before anything is written. A missing stamp means "never pushed".
  const remote = await readRemoteLastPushedAt(runtime, credentials);
  if (!remote.ok) {
    return { ok: false, error: remote.error, status: remote.status };
  }

  const title = opts.vaultTitle ?? existing?.vaultTitle;
  const record: LocalCloudBackupRecord = {
    vaultId,
    backupId: credentials.backupId,
    ownerCode: credentials.ownerCode,
    enabled: true,
    status: "idle",
    lastPushedAt: remote.value,
    consentedAt: existing?.consentedAt ?? nowIso(runtime),
    ...(title !== undefined ? { vaultTitle: title } : {}),
  };
  await runtime.storage.write(vaultId, record);
  return { ok: true, value: record };
}

/**
 * Disable (FR-009).
 *
 * Purely local, by design: it stops future pushes and issues no request. The
 * remote copy is deliberately left alone until the user asks for deletion, and
 * the record is kept so re-enabling resumes without a second consent prompt.
 */
export async function disableCloudBackup(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<CloudBackupOutcome<null>> {
  const record = await readRecord(runtime, vaultId);
  if (!record) return { ok: true, value: null };
  await runtime.storage.write(vaultId, {
    ...record,
    enabled: false,
    status: "idle",
  });
  return { ok: true, value: null };
}

/** Permanent deletion of the remote copy (FR-010). */
export async function deleteCloudBackup(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<CloudBackupOutcome<null>> {
  const record = await readRecord(runtime, vaultId);
  if (!record) return { ok: true, value: null };

  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${record.backupId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${record.ownerCode}` },
    },
  );
  if (!response.ok) {
    return responseFailure(response);
  }

  // Only cleared once the remote copy is confirmed gone, so a failed delete
  // never leaves the user believing data was erased when it was not.
  await runtime.storage.clear(vaultId);
  return { ok: true, value: null };
}
