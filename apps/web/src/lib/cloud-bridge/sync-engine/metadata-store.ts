import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type SyncStatus = "SYNCED" | "DIRTY" | "CONFLICT";

export interface SyncMetadata {
  vaultId: string;
  filePath: string;
  remoteId: string;
  localModified: number;
  remoteModified: string;
  etag?: string;
  syncStatus: SyncStatus;
}

interface SyncDB extends DBSchema {
  sync_metadata: {
    key: [string, string]; // [vaultId, filePath]
    value: SyncMetadata;
    indexes: {
      "by-remote-id": string;
      "by-vault-id": string;
    };
  };
}

const DB_NAME = "codex-cryptica-sync";
const STORE_NAME = "sync_metadata";

export class MetadataStore {
  private dbPromise: Promise<IDBPDatabase<SyncDB>>;

  constructor() {
    this.dbPromise = openDB<SyncDB>(DB_NAME, 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains(STORE_NAME)) {
            // TODO: Migrate version 1 entries (no vaultId) to the correct vault
            // instead of wholesale deletion. Wholesale deletion is currently
            // used because the primary key format changed to a composite key.
            db.deleteObjectStore(STORE_NAME);
          }
        }
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: ["vaultId", "filePath"],
          });
          store.createIndex("by-remote-id", "remoteId");
          store.createIndex("by-vault-id", "vaultId");
        }
      },
    });
  }

  async get(
    vaultId: string,
    filePath: string,
  ): Promise<SyncMetadata | undefined> {
    const db = await this.dbPromise;
    return db.get(STORE_NAME, [vaultId, filePath]);
  }

  async getByRemoteId(remoteId: string): Promise<SyncMetadata | undefined> {
    const db = await this.dbPromise;
    return db.getFromIndex(STORE_NAME, "by-remote-id", remoteId);
  }

  async getAllForVault(vaultId: string): Promise<SyncMetadata[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex(STORE_NAME, "by-vault-id", vaultId);
  }

  async put(metadata: SyncMetadata): Promise<[string, string]> {
    const db = await this.dbPromise;
    return db.put(STORE_NAME, metadata);
  }

  async bulkPut(items: SyncMetadata[]): Promise<void> {
    if (items.length === 0) return;
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (const item of items) {
      await store.put(item);
    }
    await tx.done;
  }

  async delete(vaultId: string, filePath: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, [vaultId, filePath]);
  }

  async clearForVault(vaultId: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by-vault-id");
    let cursor = await index.openCursor(IDBKeyRange.only(vaultId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}

export const metadataStore = new MetadataStore();
