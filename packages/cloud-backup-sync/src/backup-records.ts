import {
  LocalCloudBackupRecordSchema,
  type LocalCloudBackupRecord,
} from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { formatRecoveryKey } from "./recovery-key";

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
  const raw = await runtime.storage.read(vaultId);
  if (!raw) return null;
  const parsed = LocalCloudBackupRecordSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
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
  return (await getLocalCloudBackupRecord(runtime, vaultId))?.ownerCode ?? null;
}

/**
 * The record carrying the revision a commit returned. A worker that returns
 * none leaves the record without one, so a stale revision is never sent later.
 */
export function withCommittedRevision(
  record: LocalCloudBackupRecord,
  manifest: { revision?: number },
): LocalCloudBackupRecord {
  const { revision: _stale, ...rest } = record;
  return typeof manifest.revision === "number"
    ? { ...rest, revision: manifest.revision }
    : rest;
}
