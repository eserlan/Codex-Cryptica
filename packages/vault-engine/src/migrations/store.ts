import { openDB, type IDBPDatabase } from "idb";
import type { MigrationLogEntry } from "schema";

const DB_NAME = "codex_vault_migrations";
const STORE_NAME = "migration_log";

export class MigrationStore {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  constructor(
    private dbName = DB_NAME,
    private storeName = STORE_NAME,
  ) {}

  private getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      const { dbName, storeName } = this;
      this.dbPromise = openDB(dbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: "version",
            });
            store.createIndex("timestamp", "timestamp");
          }
        },
      });
    }
    return this.dbPromise;
  }

  async getLog(): Promise<MigrationLogEntry[]> {
    const db = await this.getDB();
    const all = await db.getAll(this.storeName);
    // Sort by timestamp descending
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getEntry(version: number): Promise<MigrationLogEntry | undefined> {
    const db = await this.getDB();
    return db.get(this.storeName, version);
  }

  async addEntry(entry: MigrationLogEntry): Promise<void> {
    const db = await this.getDB();
    await db.put(this.storeName, entry);
    await this.pruneLogs();
  }

  private async pruneLogs(): Promise<void> {
    const db = await this.getDB();
    const all = await this.getLog();
    if (all.length > 5) {
      const toDelete = all.slice(5);
      const tx = db.transaction(this.storeName, "readwrite");
      for (const entry of toDelete) {
        await tx.store.delete(entry.version);
      }
      await tx.done;
    }
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    await db.clear(this.storeName);
  }
}

export const migrationStore = new MigrationStore();
