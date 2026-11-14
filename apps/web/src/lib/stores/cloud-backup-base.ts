/**
 * The merge base for shared vaults (shared vault, slice 4).
 *
 * Per entity, the content it held when it was last pushed successfully. A
 * three-way merge needs it to tell which side changed what. Entities are kept
 * as plain JSON copies so a later edit, or a reactive proxy, cannot alter a
 * stored base.
 */
import { getDB, type CloudBackupBaseRow } from "#lib/utils/idb.js";

export type { CloudBackupBaseRow };

type RowKey = [string, string];

/** Where bases are kept. IndexedDB in the app; in memory for tests. */
export interface CloudBackupBaseStorage {
  put(row: CloudBackupBaseRow): Promise<void>;
  get(key: RowKey): Promise<CloudBackupBaseRow | undefined>;
  delete(key: RowKey): Promise<void>;
  listVault(vaultId: string): Promise<CloudBackupBaseRow[]>;
}

const plain = <T>(value: T): T =>
  value === undefined ? value : JSON.parse(JSON.stringify(value));

const idOf = (entity: unknown): string => (entity as { id: string }).id;

export class CloudBackupBaseStore {
  constructor(
    private readonly storage: CloudBackupBaseStorage = idbBaseStorage(),
  ) {}

  /** Stores what was sent and drops the base of every id deleted. */
  async recordSent(
    vaultId: string,
    upserts: readonly unknown[],
    deletedIds: readonly string[],
  ): Promise<void> {
    for (const entity of upserts) {
      await this.storage.put({
        vaultId,
        id: idOf(entity),
        entity: plain(entity),
      });
    }
    for (const id of deletedIds) await this.storage.delete([vaultId, id]);
  }

  /** After a full snapshot the bases are exactly the entities sent. */
  async replaceVault(
    vaultId: string,
    entities: readonly unknown[],
  ): Promise<void> {
    const keep = new Set(entities.map(idOf));
    for (const row of await this.storage.listVault(vaultId)) {
      if (!keep.has(row.id)) await this.storage.delete([vaultId, row.id]);
    }
    await this.recordSent(vaultId, entities, []);
  }

  async get(vaultId: string, id: string): Promise<unknown | undefined> {
    return (await this.storage.get([vaultId, id]))?.entity;
  }

  async list(vaultId: string): Promise<CloudBackupBaseRow[]> {
    return this.storage.listVault(vaultId);
  }

  async clearVault(vaultId: string): Promise<void> {
    for (const row of await this.storage.listVault(vaultId)) {
      await this.storage.delete([vaultId, row.id]);
    }
  }
}

/** Rows in the app's IndexedDB `cloud_backup_base` store. */
export function idbBaseStorage(): CloudBackupBaseStorage {
  return {
    async put(row) {
      await (await getDB()).put("cloud_backup_base", row);
    },
    async get(key) {
      return (await getDB()).get("cloud_backup_base", key);
    },
    async delete(key) {
      await (await getDB()).delete("cloud_backup_base", key);
    },
    async listVault(vaultId) {
      return (await getDB()).getAllFromIndex(
        "cloud_backup_base",
        "by-vault",
        vaultId,
      );
    },
  };
}

/** In-memory rows, for tests and contexts without IndexedDB. */
export function memoryBaseStorage(): CloudBackupBaseStorage {
  const rows = new Map<string, CloudBackupBaseRow>();
  const k = ([vaultId, id]: RowKey) => `${vaultId}\u0000${id}`;
  return {
    async put(row) {
      rows.set(k([row.vaultId, row.id]), plain(row));
    },
    async get(key) {
      return plain(rows.get(k(key)));
    },
    async delete(key) {
      rows.delete(k(key));
    },
    async listVault(vaultId) {
      const found: CloudBackupBaseRow[] = [];
      for (const row of rows.values()) {
        if (row.vaultId === vaultId) found.push(plain(row));
      }
      return found;
    },
  };
}
