import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type SyncStatus = 'SYNCED' | 'DIRTY' | 'CONFLICT';

export interface SyncMetadata {
  filePath: string;
  remoteId: string;
  localModified: number;
  remoteModified: string;
  etag?: string;
  syncStatus: SyncStatus;
}

interface SyncDB extends DBSchema {
  sync_metadata: {
    key: string; // filePath
    value: SyncMetadata;
    indexes: { 'by-remote-id': string };
  };
}

const DB_NAME = 'codex-arcana-sync';
const STORE_NAME = 'sync_metadata';

export class MetadataStore {
  private dbPromise: Promise<IDBPDatabase<SyncDB>>;

  constructor() {
    this.dbPromise = openDB<SyncDB>(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'filePath' });
        store.createIndex('by-remote-id', 'remoteId');
      },
    });
  }

  async get(filePath: string): Promise<SyncMetadata | undefined> {
    const db = await this.dbPromise;
    return db.get(STORE_NAME, filePath);
  }

  async getByRemoteId(remoteId: string): Promise<SyncMetadata | undefined> {
    const db = await this.dbPromise;
    return db.getFromIndex(STORE_NAME, 'by-remote-id', remoteId);
  }

  async getAll(): Promise<SyncMetadata[]> {
    const db = await this.dbPromise;
    return db.getAll(STORE_NAME);
  }

  async put(metadata: SyncMetadata): Promise<string> {
    const db = await this.dbPromise;
    return db.put(STORE_NAME, metadata);
  }

  async delete(filePath: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, filePath);
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear(STORE_NAME);
  }
}

export const metadataStore = new MetadataStore();
