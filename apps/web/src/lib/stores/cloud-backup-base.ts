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

/** Maps and canvases sync as whole items; their bases sit beside the entities. */
export type WholeKind = "map" | "canvas";

const wholeId = (kind: WholeKind, id: string) => `${kind}:${id}`;

const isWholeRow = (row: CloudBackupBaseRow) =>
  row.id.startsWith("map:") || row.id.startsWith("canvas:");

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

  /** Stores the maps or canvases sent or received and drops the deleted ones. */
  async recordSentWhole(
    vaultId: string,
    kind: WholeKind,
    upserts: readonly unknown[],
    deletedIds: readonly string[],
  ): Promise<void> {
    for (const item of upserts) {
      await this.storage.put({
        vaultId,
        id: wholeId(kind, idOf(item)),
        entity: plain(item),
      });
    }
    for (const id of deletedIds) {
      await this.storage.delete([vaultId, wholeId(kind, id)]);
    }
  }

  /**
   * After a full snapshot or a resync the bases are exactly what was sent. Map
   * and canvas bases are replaced only when `whole` is given.
   */
  async replaceVault(
    vaultId: string,
    entities: readonly unknown[],
    whole?: { maps: readonly unknown[]; canvases: readonly unknown[] },
  ): Promise<void> {
    const { maps = [], canvases = [] } = whole ?? {};
    const keep = new Set([
      ...entities.map(idOf),
      ...maps.map((m) => wholeId("map", idOf(m))),
      ...canvases.map((c) => wholeId("canvas", idOf(c))),
    ]);
    // Without `whole`, the map and canvas bases are left as they are.
    const replaced = (row: CloudBackupBaseRow) => !!whole || !isWholeRow(row);
    const rows = await this.storage.listVault(vaultId);
    for (const row of rows.filter(replaced)) {
      if (!keep.has(row.id)) await this.storage.delete([vaultId, row.id]);
    }
    await this.recordSent(vaultId, entities, []);
    await this.recordSentWhole(vaultId, "map", maps, []);
    await this.recordSentWhole(vaultId, "canvas", canvases, []);
  }

  async get(vaultId: string, id: string): Promise<unknown | undefined> {
    return (await this.storage.get([vaultId, id]))?.entity;
  }

  async getWhole(
    vaultId: string,
    kind: WholeKind,
    id: string,
  ): Promise<unknown | undefined> {
    return this.get(vaultId, wholeId(kind, id));
  }

  /** The entity bases; map and canvas bases are listed by `listWhole`. */
  async list(vaultId: string): Promise<CloudBackupBaseRow[]> {
    return (await this.storage.listVault(vaultId)).filter(
      (row) => !isWholeRow(row),
    );
  }

  /** The bases of every map or canvas, keyed by the item's own id. */
  async listWhole(
    vaultId: string,
    kind: WholeKind,
  ): Promise<Record<string, unknown>> {
    const prefix = `${kind}:`;
    const found: Record<string, unknown> = {};
    for (const row of await this.storage.listVault(vaultId)) {
      if (row.id.startsWith(prefix)) {
        found[row.id.slice(prefix.length)] = row.entity;
      }
    }
    return found;
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
