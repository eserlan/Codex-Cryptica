/**
 * Client for the shared trash (shared vault, slice 9): the removed entities a
 * member can still bring back, and one item's kept content.
 */
import { z } from "zod";
import {
  CloudBackupTombstoneSchema,
  CloudBackupWholeItemAssetSchema,
  type CloudBackupTombstone,
  type CloudBackupWholeItemAsset,
} from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { getLocalCloudBackupRecord } from "./backup-records";
import { cloudBackupHeaders } from "./request-headers";

const TrashItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Absent from an older worker, which only trashes entities. */
  kind: z.enum(["entity", "map", "canvas"]).default("entity"),
  deletedBy: z.string(),
  deletedAt: z.string(),
  restorable: z.boolean(),
});

const TrashListSchema = z.object({
  revision: z.number().int().nonnegative(),
  items: z.array(TrashItemSchema),
  usedBytes: z.number().int().nonnegative().optional(),
  maxBytes: z.number().int().positive().optional(),
});

const TrashEntitySchema = z.object({
  tombstone: CloudBackupTombstoneSchema,
  entity: z.object({ id: z.string() }).passthrough(),
  /** The files a removed map carried. */
  assets: z.array(CloudBackupWholeItemAssetSchema).optional(),
});

export type CloudBackupTrashItem = z.infer<typeof TrashItemSchema>;

export type CloudBackupTrashOutcome =
  | {
      kind: "items";
      revision: number;
      items: CloudBackupTrashItem[];
      usedBytes?: number;
      maxBytes?: number;
    }
  /** An older worker without the trash route, or a body this client cannot read. */
  | { kind: "unsupported" }
  | { kind: "off" }
  | { kind: "failed"; error: string; status?: number };

export type CloudBackupTrashItemOutcome =
  | {
      kind: "entity";
      entity: { id: string } & Record<string, unknown>;
      tombstone: CloudBackupTombstone;
      assets?: CloudBackupWholeItemAsset[];
    }
  /** Restored, expired, or its content was dropped to keep trash small. */
  | { kind: "gone" }
  | { kind: "failed"; error: string; status?: number };

type Fetched =
  | { response: Awaited<ReturnType<CloudBackupRuntime["fetch"]>> }
  | { off: true }
  | { error: string };

async function fetchTrash(
  runtime: CloudBackupRuntime,
  vaultId: string,
  path: string,
): Promise<Fetched> {
  const record = await getLocalCloudBackupRecord(runtime, vaultId);
  if (!record?.enabled) return { off: true };
  try {
    return {
      response: await runtime.fetch(
        `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/${path}`,
        { headers: cloudBackupHeaders(runtime, record) },
      ),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Request failed.",
    };
  }
}

/** Lists the removed entities still inside the retention window. */
export async function fetchCloudBackupTrash(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<CloudBackupTrashOutcome> {
  const fetched = await fetchTrash(runtime, vaultId, "trash");
  if ("off" in fetched) return { kind: "off" };
  if ("error" in fetched) return { kind: "failed", error: fetched.error };
  const { response } = fetched;
  if (response.status === 404) return { kind: "unsupported" };
  if (!response.ok) {
    return {
      kind: "failed",
      error: `Request failed (${response.status})`,
      status: response.status,
    };
  }
  const parsed = TrashListSchema.safeParse(
    await response.json().catch(() => null),
  );
  return parsed.success
    ? { kind: "items", ...parsed.data }
    : { kind: "unsupported" };
}

/** Reads one removed entity's kept content. */
export async function fetchCloudBackupTrashItem(
  runtime: CloudBackupRuntime,
  vaultId: string,
  entityId: string,
): Promise<CloudBackupTrashItemOutcome> {
  const fetched = await fetchTrash(
    runtime,
    vaultId,
    `trash/${encodeURIComponent(entityId)}`,
  );
  if ("off" in fetched) return { kind: "failed", error: "Backup is off." };
  if ("error" in fetched) return { kind: "failed", error: fetched.error };
  const { response } = fetched;
  if (response.status === 410) return { kind: "gone" };
  if (!response.ok) {
    return {
      kind: "failed",
      error: `Request failed (${response.status})`,
      status: response.status,
    };
  }
  const parsed = TrashEntitySchema.safeParse(
    await response.json().catch(() => null),
  );
  return parsed.success
    ? { kind: "entity", ...parsed.data }
    : {
        kind: "failed",
        error: "The backup service returned an unreadable response.",
      };
}
