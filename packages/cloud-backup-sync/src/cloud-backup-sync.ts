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
import {
  LocalCloudBackupRecordSchema,
  type CloudBackupManifest,
  type LocalCloudBackupRecord,
} from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { formatRecoveryKey } from "./recovery-key";

export interface VaultBundlePayload {
  vaultTitle: string;
  bundle: unknown;
  /**
   * Media as raw bytes. Uploaded one request each rather than inlined here, so
   * neither end has to hold a whole vault in memory (and so base64 does not
   * add a third to every byte on the wire).
   */
  assets?: { assetId: string; bytes: Uint8Array; mimeType: string }[];
}

/** Progress across a snapshot upload, for a caller that wants to show it. */
export interface UploadProgress {
  uploaded: number;
  total: number;
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

/**
 * Every backup this device knows the key to.
 *
 * A recovery key that is already on the device should never have to be typed
 * back in: after switching vaults, or restoring onto the same machine, the
 * user can pick a known backup instead of hunting for the key they copied.
 * Records that fail to parse are skipped rather than failing the whole list —
 * one bad entry must not hide the rest.
 */
export interface KnownCloudBackup {
  vaultId: string;
  backupId: string;
  vaultTitle: string | null;
  recoveryKey: string;
  lastPushedAt: string | null;
}

export async function listKnownCloudBackups(
  runtime: CloudBackupRuntime,
): Promise<KnownCloudBackup[]> {
  const entries = (await runtime.storage.list?.()) ?? [];
  const known: KnownCloudBackup[] = [];
  for (const entry of entries) {
    const parsed = LocalCloudBackupRecordSchema.safeParse(entry.record);
    if (!parsed.success) continue;
    const record = parsed.data;
    known.push({
      vaultId: record.vaultId,
      backupId: record.backupId,
      vaultTitle: record.vaultTitle ?? null,
      recoveryKey: formatRecoveryKey(record.backupId, record.ownerCode),
      lastPushedAt: record.lastPushedAt,
    });
  }
  // Most recently saved first: the one a user wants is rarely the oldest.
  return known.sort((a, b) =>
    (b.lastPushedAt ?? "").localeCompare(a.lastPushedAt ?? ""),
  );
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
    // Kept so this device can offer the backup by name later.
    vaultTitle: payload.vaultTitle,
  };
  await runtime.storage.write(vaultId, record);
  return { ok: true, value: record };
}

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
): Promise<CloudBackupOutcome<CloudBackupManifest>> {
  const assets = payload.assets ?? [];
  const auth = `Bearer ${record.ownerCode}`;

  for (const [index, asset] of assets.entries()) {
    const response = await runtime.fetch(
      `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/assets/${encodeURIComponent(asset.assetId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": asset.mimeType || "application/octet-stream",
          Authorization: auth,
        },
        body: asset.bytes,
      },
    );
    if (!response.ok) {
      return {
        ok: false,
        error: await errorFrom(response),
        status: response.status,
      };
    }
    onProgress?.({ uploaded: index + 1, total: assets.length });
  }

  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/commit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        vaultTitle: payload.vaultTitle,
        bundle: payload.bundle,
        assetIds: assets.map((asset) => asset.assetId),
      }),
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      error: await errorFrom(response),
      status: response.status,
    };
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

export async function pushVaultToCloudBackup(
  runtime: CloudBackupRuntime,
  vaultId: string,
  payload: VaultBundlePayload,
  onProgress?: (progress: UploadProgress) => void,
): Promise<CloudBackupOutcome<CloudBackupManifest | null>> {
  const record = await readRecord(runtime, vaultId);
  if (!record || !record.enabled) return { ok: true, value: null };

  await runtime.storage.write(vaultId, { ...record, status: "syncing" });

  const result = await uploadSnapshot(runtime, record, payload, onProgress);
  if (!result.ok) {
    // Visible failure, never a silent stale success (FR-011). The local save
    // has already happened and is untouched by this.
    await runtime.storage.write(vaultId, { ...record, status: "error" });
    return result;
  }

  await runtime.storage.write(vaultId, {
    ...record,
    status: "idle",
    lastPushedAt: result.value.lastPushedAt,
    // A renamed vault should show under its current name, not the old one.
    vaultTitle: payload.vaultTitle,
  });
  return { ok: true, value: result.value };
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
/**
 * Downloads one asset from a backup.
 *
 * Separate from the bundle fetch so a failing image cannot cost the user the
 * whole restore — the caller decides what to do with a partial set.
 */
export async function fetchCloudBackupAsset(
  runtime: CloudBackupRuntime,
  credentials: { backupId: string; ownerCode: string },
  assetId: string,
): Promise<CloudBackupOutcome<Uint8Array>> {
  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${credentials.backupId}/assets/${assetId}`,
    { headers: { Authorization: `Bearer ${credentials.ownerCode}` } },
  );
  if (!response.ok) {
    return {
      ok: false,
      error: await errorFrom(response),
      status: response.status,
    };
  }
  return { ok: true, value: new Uint8Array(await response.arrayBuffer()) };
}

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
