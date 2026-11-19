/**
 * Client for restore points (shared vault, slice 12): the owner lists a
 * shared vault's daily points and rolls the group back to one.
 */
import { z } from "zod";
import {
  CloudBackupTrashEvictionSchema,
  type CloudBackupTrashEviction,
} from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { getLocalCloudBackupRecord } from "./backup-records";
import { cloudBackupHeaders } from "./request-headers";

const RestorePointSchema = z.object({
  date: z.string(),
  revision: z.number().int().nonnegative(),
  entityCount: z.number().int().nonnegative(),
});

const RestorePointsSchema = z.object({
  restorePoints: z.array(RestorePointSchema),
});

const CountsSchema = z.object({
  changed: z.number().int().nonnegative(),
  returning: z.number().int().nonnegative(),
  trashed: z.number().int().nonnegative(),
});

const PreviewSchema = z.object({
  preview: CountsSchema.extend({
    date: z.string(),
    revision: z.number().int().nonnegative(),
    trashEvicted: CloudBackupTrashEvictionSchema.optional(),
  }),
});

const RolledBackSchema = z.object({
  rollback: CountsSchema,
  trashEvicted: CloudBackupTrashEvictionSchema.optional(),
});

export type CloudBackupRestorePoint = z.infer<typeof RestorePointSchema>;
export type CloudBackupRollbackCounts = z.infer<typeof CountsSchema>;

export type CloudBackupRestorePointsOutcome =
  | { kind: "points"; points: CloudBackupRestorePoint[] }
  /** An older worker without the route, or a body this client cannot read. */
  | { kind: "unsupported" }
  | { kind: "off" }
  | { kind: "failed"; error: string };

export type CloudBackupRollbackOutcome =
  | ({
      kind: "preview";
      date: string;
      revision: number;
      trashEvicted?: CloudBackupTrashEviction;
    } & CloudBackupRollbackCounts)
  | {
      kind: "rolledBack";
      counts: CloudBackupRollbackCounts;
      trashEvicted?: CloudBackupTrashEviction;
    }
  /** The vault changed after the preview. */
  | { kind: "changed" }
  /** The restore point expired or was removed. */
  | { kind: "gone" }
  | { kind: "unsupported" }
  | { kind: "failed"; error: string };

const UNREADABLE = "The backup service returned an unreadable response.";

const failure = (error: unknown) => ({
  kind: "failed" as const,
  error: error instanceof Error ? error.message : "Request failed.",
});

/** Lists the restore points of a shared vault, newest first. Owner only. */
export async function fetchCloudBackupRestorePoints(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<CloudBackupRestorePointsOutcome> {
  const record = await getLocalCloudBackupRecord(runtime, vaultId);
  if (!record?.enabled) return { kind: "off" };
  try {
    const response = await runtime.fetch(
      `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/restore-points`,
      { headers: cloudBackupHeaders(runtime, record) },
    );
    if (response.status === 404) return { kind: "unsupported" };
    if (!response.ok) {
      return { kind: "failed", error: `Request failed (${response.status})` };
    }
    const parsed = RestorePointsSchema.safeParse(
      await response.json().catch(() => null),
    );
    return parsed.success
      ? { kind: "points", points: parsed.data.restorePoints }
      : { kind: "unsupported" };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Rolls the vault back to a restore point, or with `dryRun` only counts what
 * that would do. A commit carries the `revision` the dry run reported.
 */
export async function rollBackCloudBackup(
  runtime: CloudBackupRuntime,
  vaultId: string,
  request: { date: string; dryRun?: boolean; baseRevision?: number },
): Promise<CloudBackupRollbackOutcome> {
  const record = await getLocalCloudBackupRecord(runtime, vaultId);
  if (!record?.enabled) return { kind: "failed", error: "Backup is off." };
  try {
    const response = await runtime.fetch(
      `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/rollback`,
      {
        method: "POST",
        headers: cloudBackupHeaders(runtime, record, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(request),
      },
    );
    if (response.status === 409) return { kind: "changed" };
    if (response.status === 404) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: unknown };
      } | null;
      return body?.error?.code === "restore_point_not_found"
        ? { kind: "gone" }
        : { kind: "unsupported" };
    }
    if (!response.ok) {
      return { kind: "failed", error: `Request failed (${response.status})` };
    }
    const body = await response.json().catch(() => null);
    if (request.dryRun) {
      const preview = PreviewSchema.safeParse(body);
      return preview.success
        ? { kind: "preview", ...preview.data.preview }
        : { kind: "failed", error: UNREADABLE };
    }
    const done = RolledBackSchema.safeParse(body);
    return done.success
      ? {
          kind: "rolledBack",
          counts: done.data.rollback,
          ...(done.data.trashEvicted
            ? { trashEvicted: done.data.trashEvicted }
            : {}),
        }
      : { kind: "failed", error: UNREADABLE };
  } catch (error) {
    return failure(error);
  }
}
