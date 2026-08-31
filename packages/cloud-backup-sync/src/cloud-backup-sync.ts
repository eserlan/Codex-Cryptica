/**
 * CC Cloud Backup client (spec 162, issue #2593).
 *
 * Pure functions over an injected runtime, so the whole surface is testable
 * without a network or a browser. `apps/web` supplies the real `fetch` and an
 * IndexedDB-backed store; tests supply mocks.
 *
 * Two invariants shape the design:
 *
 * - **Local wins, always.** These functions mirror a vault outward. A push that
 *   fails must never block or roll back the local save (FR-019), so
 *   `pushVaultToCloudBackup` reports failure rather than throwing into the save
 *   path.
 * - **Nothing leaves the device before consent.** No function here transmits
 *   anything for a vault with no local record, which is what makes "off by
 *   default" enforceable rather than merely intended (FR-001, FR-003).
 */
import {
  LocalCloudBackupRecordSchema,
  type CloudBackupManifest,
  type LocalCloudBackupRecord,
} from "schema";
import type { CloudBackupRuntime } from "./runtime";

export interface VaultBundlePayload {
  vaultTitle: string;
  bundle: unknown;
  assets?: { assetId: string; content: string }[];
}

export type CloudBackupOutcome<T> =
  { ok: true; value: T } | { ok: false; error: string; status?: number };

function nowIso(runtime: CloudBackupRuntime): string {
  return (runtime.now?.() ?? new Date()).toISOString();
}

async function readRecord(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<LocalCloudBackupRecord | null> {
  const raw = await runtime.storage.read(vaultId);
  if (!raw) return null;
  const parsed = LocalCloudBackupRecordSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function errorFrom(response: {
  status: number;
  json: () => Promise<unknown>;
}): Promise<string> {
  try {
    const body = (await response.json()) as any;
    return body?.error?.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

/**
 * Reads the stored record for a vault.
 *
 * The app calls this on load so a previously-enabled vault comes back showing
 * its real state rather than a fresh consent prompt (FR-020).
 */
export async function getLocalCloudBackupRecord(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<LocalCloudBackupRecord | null> {
  return readRecord(runtime, vaultId);
}

/** The vault's ownership code, for display or copying in Settings (FR-013). */
export async function getCloudBackupOwnershipCode(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<string | null> {
  return (await readRecord(runtime, vaultId))?.ownerCode ?? null;
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
    const resumed: LocalCloudBackupRecord = { ...existing, enabled: true };
    await runtime.storage.write(vaultId, resumed);
    return { ok: true, value: resumed };
  }

  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/enable`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      error: await errorFrom(response),
      status: response.status,
    };
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
  };
  await runtime.storage.write(vaultId, record);
  return { ok: true, value: record };
}

/**
 * Push-on-save (FR-018).
 *
 * Returns an outcome instead of throwing, and is a no-op for a vault that is
 * not enabled — the caller sits on the save path, where an exception or a
 * stray request would be a bug (FR-019, FR-001).
 */
export async function pushVaultToCloudBackup(
  runtime: CloudBackupRuntime,
  vaultId: string,
  payload: VaultBundlePayload,
): Promise<CloudBackupOutcome<CloudBackupManifest | null>> {
  const record = await readRecord(runtime, vaultId);
  if (!record || !record.enabled) return { ok: true, value: null };

  await runtime.storage.write(vaultId, { ...record, status: "syncing" });

  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/push`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${record.ownerCode}`,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    // Visible failure, never a silent stale success (FR-011). The local save
    // has already happened and is untouched by this.
    await runtime.storage.write(vaultId, { ...record, status: "error" });
    return {
      ok: false,
      error: await errorFrom(response),
      status: response.status,
    };
  }

  // A 200 with an unreadable body is still a failure. This runs on the save
  // path, so it must resolve rather than throw (FR-019) — a malformed response
  // becomes a visible error state, not an exception into the caller's save.
  let manifest: CloudBackupManifest | undefined;
  try {
    manifest = ((await response.json()) as { manifest?: CloudBackupManifest })
      ?.manifest;
  } catch {
    manifest = undefined;
  }
  if (!manifest?.lastPushedAt) {
    await runtime.storage.write(vaultId, { ...record, status: "error" });
    return {
      ok: false,
      error: "The backup service returned an unreadable response.",
    };
  }

  await runtime.storage.write(vaultId, {
    ...record,
    status: "idle",
    lastPushedAt: manifest.lastPushedAt,
  });
  return { ok: true, value: manifest };
}

/** Current remote status for the Settings display (FR-008). */
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

  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/status`,
    { headers: { Authorization: `Bearer ${record.ownerCode}` } },
  );
  if (!response.ok) {
    return {
      ok: false,
      error: await errorFrom(response),
      status: response.status,
    };
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
  credentials: { backupId: string; ownerCode: string },
): Promise<
  CloudBackupOutcome<{ manifest: CloudBackupManifest; bundle: unknown }>
> {
  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${credentials.backupId}/bundle`,
    { headers: { Authorization: `Bearer ${credentials.ownerCode}` } },
  );
  if (!response.ok) {
    return {
      ok: false,
      error: await errorFrom(response),
      status: response.status,
    };
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
    return {
      ok: false,
      error: await errorFrom(response),
      status: response.status,
    };
  }

  // Only cleared once the remote copy is confirmed gone, so a failed delete
  // never leaves the user believing data was erased when it was not.
  await runtime.storage.clear(vaultId);
  return { ok: true, value: null };
}
