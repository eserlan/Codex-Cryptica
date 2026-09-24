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
import { detectConflict } from "./auto-sync";

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
  | { ok: true; value: T }
  | {
      ok: false;
      error: string;
      status?: number;
      /**
       * Set on the conflict path (#3189): the remote changed since our last
       * push, so nothing was uploaded. The caller must preserve local data
       * and surface the conflict instead of retrying blindly.
       */
      conflict?: boolean;
      remoteLastPushedAt?: string | null;
    };

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
export interface SnapshotUploadOptions {
  /**
   * Asset ids whose bytes the server already holds (#3189 autosync): their
   * PUT is skipped but they are still listed in the commit, so nothing is
   * pruned. Skipped assets count as uploaded for progress purposes.
   */
  skipAssetUploadIds?: ReadonlySet<string> | readonly string[];
  /** Cancels remaining uploads and prevents an aborted push from rewriting local status. */
  signal?: AbortSignal;
}

async function uploadSnapshot(
  runtime: CloudBackupRuntime,
  record: Pick<LocalCloudBackupRecord, "backupId" | "ownerCode">,
  payload: VaultBundlePayload,
  onProgress?: (progress: UploadProgress) => void,
  options?: SnapshotUploadOptions,
): Promise<CloudBackupOutcome<CloudBackupManifest | null>> {
  const assets = payload.assets ?? [];
  const auth = `Bearer ${record.ownerCode}`;
  const skip = new Set(options?.skipAssetUploadIds ?? []);

  for (const [index, asset] of assets.entries()) {
    options?.signal?.throwIfAborted();
    if (!skip.has(asset.assetId)) {
      const response = await runtime.fetch(
        `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/assets/${encodeURIComponent(asset.assetId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": asset.mimeType || "application/octet-stream",
            Authorization: auth,
          },
          body: asset.bytes,
          signal: options?.signal,
        },
      );
      options?.signal?.throwIfAborted();
      if (!response.ok) {
        return {
          ok: false,
          error: await errorFrom(response),
          status: response.status,
        };
      }
    }
    onProgress?.({ uploaded: index + 1, total: assets.length });
  }

  options?.signal?.throwIfAborted();
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
      signal: options?.signal,
    },
  );
  options?.signal?.throwIfAborted();

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

export interface PushVaultOptions extends SnapshotUploadOptions {
  /**
   * Optimistic-concurrency guard (#3189): when set, the remote state is read
   * first and the push aborts — uploading nothing — if the remote
   * lastPushedAt differs, meaning another device committed since. Best
   * effort only: a true race needs server revisions (follow-up).
   */
  expectLastPushedAt?: string | null;
}

export async function pushVaultToCloudBackup(
  runtime: CloudBackupRuntime,
  vaultId: string,
  payload: VaultBundlePayload,
  onProgress?: (progress: UploadProgress) => void,
  options?: PushVaultOptions,
): Promise<CloudBackupOutcome<CloudBackupManifest | null>> {
  const record = await readRecord(runtime, vaultId);
  if (!record || !record.enabled) return { ok: true, value: null };
  try {
    options?.signal?.throwIfAborted();

    if (options?.expectLastPushedAt !== undefined) {
      const remote = await readRemoteLastPushedAt(
        runtime,
        record,
        options.signal,
      );
      options?.signal?.throwIfAborted();
      if (!remote.ok) {
        await runtime.storage.write(vaultId, { ...record, status: "error" });
        return remote;
      }
      // Any divergence aborts: a newer remote is a conflict, while an older
      // or missing remote means our record is stale and must not overwrite.
      if (remote.value !== options.expectLastPushedAt) {
        await runtime.storage.write(vaultId, { ...record, status: "error" });
        const newerRemote = detectConflict(
          options.expectLastPushedAt,
          remote.value,
        );
        return {
          ok: false,
          error: newerRemote
            ? "Another device updated this backup. Automatic sync paused so nothing is overwritten."
            : "The cloud backup changed unexpectedly. Automatic sync paused.",
          conflict: true,
          remoteLastPushedAt: remote.value,
        };
      }
    }

    options?.signal?.throwIfAborted();
    await runtime.storage.write(vaultId, { ...record, status: "syncing" });

    const result = await uploadSnapshot(runtime, record, payload, onProgress, {
      skipAssetUploadIds: options?.skipAssetUploadIds,
      signal: options?.signal,
    });
    options?.signal?.throwIfAborted();
    if (!result.ok) {
      // Visible failure, never a silent stale success (FR-011). The local save
      // has already happened and is untouched by this.
      await runtime.storage.write(vaultId, { ...record, status: "error" });
      return result;
    }
    if (result.value === null) return { ok: true, value: null };

    await runtime.storage.write(vaultId, {
      ...record,
      status: "idle",
      lastPushedAt: result.value.lastPushedAt,
      // A renamed vault should show under its current name, not the old one.
      vaultTitle: payload.vaultTitle,
    });
    return { ok: true, value: result.value };
  } catch (error) {
    if (options?.signal?.aborted) return { ok: true, value: null };
    throw error;
  }
}

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
): Promise<
  | CloudBackupOutcome<CloudBackupManifest | null>
  | { ok: false; fullPushRequired: true; error: string }
> {
  const record = await readRecord(runtime, vaultId);
  if (!record || !record.enabled) return { ok: true, value: null };

  await runtime.storage.write(vaultId, { ...record, status: "syncing" });
  const response = await runtime.fetch(
    `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/delta`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${record.ownerCode}`,
      },
      body: JSON.stringify({ ...delta, baseLastPushedAt }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string; lastPushedAt?: string };
    } | null;
    const code = body?.error?.code;
    if (response.status === 404 || code === "full_push_required") {
      // Not a failed backup: the caller retries in full straight away.
      await runtime.storage.write(vaultId, record);
      return {
        ok: false,
        fullPushRequired: true,
        error: body?.error?.message ?? "A full upload is required.",
      };
    }
    await runtime.storage.write(vaultId, { ...record, status: "error" });
    return {
      ok: false,
      error: body?.error?.message ?? `Request failed (${response.status})`,
      status: response.status,
      ...(code === "diverged"
        ? {
            conflict: true,
            remoteLastPushedAt: body?.error?.lastPushedAt ?? null,
          }
        : {}),
    };
  }

  const manifest = (
    (await response.json().catch(() => null)) as {
      manifest?: CloudBackupManifest;
    } | null
  )?.manifest;
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
    vaultTitle: delta.vaultTitle,
  });
  return { ok: true, value: manifest };
}

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
    return {
      ok: false,
      error: await errorFrom(response),
      status: response.status,
    };
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

async function readRemoteLastPushedAt(
  runtime: CloudBackupRuntime,
  record: Pick<LocalCloudBackupRecord, "backupId" | "ownerCode">,
  signal?: AbortSignal,
): Promise<CloudBackupOutcome<string | null>> {
  const response = await fetchBackupStatus(runtime, record, signal);
  if (!response.ok) {
    return {
      ok: false,
      error: await errorFrom(response),
      status: response.status,
    };
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
