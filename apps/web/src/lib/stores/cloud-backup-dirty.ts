/**
 * Changed-item tracking for incremental Cloud Backup (#3354, spec 162 FR-021–
 * FR-023).
 *
 * Every durable write reports what it touched; while a vault's backup is on,
 * those items are recorded here so the next upload can send only them. The set
 * lives in IndexedDB because the close-time flush is best-effort: an in-memory
 * set would lose a session's last edits if the tab died before uploading.
 *
 * Each write stamps its row with a unique `version`. An upload snapshots the
 * rows it sends and, once it succeeds, clears only rows still holding the
 * stamp it sent — so an edit landing mid-upload stays pending (FR-022).
 */
import { getDB, type CloudBackupDirtyRow } from "$lib/utils/idb";
import type { DurableVaultChange } from "./vault/registry";

export type { CloudBackupDirtyRow };

type RowKey = [string, CloudBackupDirtyRow["kind"], string];

/** Where rows are kept. IndexedDB in the app; in memory for tests. */
export interface CloudBackupDirtyStorage {
  put(row: CloudBackupDirtyRow): Promise<void>;
  get(key: RowKey): Promise<CloudBackupDirtyRow | undefined>;
  delete(key: RowKey): Promise<void>;
  listVault(vaultId: string): Promise<CloudBackupDirtyRow[]>;
}

/** Row marking that the change set cannot be trusted (FR-023). */
const FULL_PUSH_ID = "*";

const keyOf = (row: CloudBackupDirtyRow): RowKey => [
  row.vaultId,
  row.kind,
  row.id,
];

export class CloudBackupDirtyStore {
  constructor(
    private readonly storage: CloudBackupDirtyStorage = idbDirtyStorage(),
    private readonly stamp: () => string = () => crypto.randomUUID(),
  ) {}

  /**
   * Records one durable change. A change without a description could have
   * touched anything, so it requires a full upload instead of guessing.
   */
  async record(vaultId: string, change?: DurableVaultChange): Promise<void> {
    if (!change) return this.requireFullPush(vaultId);
    if (change.kind === "maps") {
      return this.put(vaultId, "maps", FULL_PUSH_ID, false);
    }
    for (const id of change.ids) {
      await this.put(vaultId, change.kind, id, change.deleted === true);
    }
  }

  /** The next upload for this vault must be full (FR-023). */
  requireFullPush(vaultId: string): Promise<void> {
    return this.put(vaultId, "full", FULL_PUSH_ID, false);
  }

  /** Every pending row for a vault, as sent by the upload that reads it. */
  snapshot(vaultId: string): Promise<CloudBackupDirtyRow[]> {
    return this.storage.listVault(vaultId);
  }

  /**
   * Clears rows an upload has published. A row rewritten since the snapshot
   * holds a newer stamp and is kept for the next upload.
   */
  async clearSent(sent: readonly CloudBackupDirtyRow[]): Promise<void> {
    for (const row of sent) {
      const current = await this.storage.get(keyOf(row));
      if (current?.version === row.version) {
        await this.storage.delete(keyOf(row));
      }
    }
  }

  /** Drops everything for a vault, e.g. when its backup is turned off. */
  async clearVault(vaultId: string): Promise<void> {
    for (const row of await this.storage.listVault(vaultId)) {
      await this.storage.delete(keyOf(row));
    }
  }

  private put(
    vaultId: string,
    kind: CloudBackupDirtyRow["kind"],
    id: string,
    deleted: boolean,
  ): Promise<void> {
    return this.storage.put({
      vaultId,
      kind,
      id,
      version: this.stamp(),
      deleted,
    });
  }
}

/** Rows in the app's IndexedDB `cloud_backup_dirty` store. */
export function idbDirtyStorage(): CloudBackupDirtyStorage {
  return {
    async put(row) {
      await (await getDB()).put("cloud_backup_dirty", row);
    },
    async get(key) {
      return (await getDB()).get("cloud_backup_dirty", key);
    },
    async delete(key) {
      await (await getDB()).delete("cloud_backup_dirty", key);
    },
    async listVault(vaultId) {
      return (await getDB()).getAllFromIndex(
        "cloud_backup_dirty",
        "by-vault",
        vaultId,
      );
    },
  };
}

/** In-memory rows, for tests and contexts without IndexedDB. */
export function memoryDirtyStorage(): CloudBackupDirtyStorage {
  const rows = new Map<string, CloudBackupDirtyRow>();
  const k = (key: RowKey) => key.join("\u0000");
  return {
    async put(row) {
      rows.set(k(keyOf(row)), { ...row });
    },
    async get(key) {
      const row = rows.get(k(key));
      return row ? { ...row } : undefined;
    },
    async delete(key) {
      rows.delete(k(key));
    },
    async listVault(vaultId) {
      return [...rows.values()]
        .filter((row) => row.vaultId === vaultId)
        .map((row) => ({ ...row }));
    },
  };
}
