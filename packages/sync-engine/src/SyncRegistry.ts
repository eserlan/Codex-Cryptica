import { type IDBPDatabase } from "idb";
import { type SyncEntry } from "./types";

export class SyncRegistry {
  constructor(private db: IDBPDatabase<any>) {}

  async getEntry(
    vaultId: string,
    filePath: string,
  ): Promise<SyncEntry | undefined> {
    return this.db.get("sync_registry", [vaultId, filePath]);
  }

  async putEntry(entry: SyncEntry): Promise<void> {
    await this.db.put("sync_registry", entry);
  }

  async deleteEntry(vaultId: string, filePath: string): Promise<void> {
    await this.db.delete("sync_registry", [vaultId, filePath]);
  }

  async getEntriesByVault(vaultId: string): Promise<SyncEntry[]> {
    return this.db.getAllFromIndex("sync_registry", "by-vault", vaultId);
  }

  async clearVault(vaultId: string): Promise<void> {
    const entries = await this.getEntriesByVault(vaultId);
    if (entries.length === 0) return;

    const tx = this.db.transaction("sync_registry", "readwrite");
    for (const entry of entries) {
      await tx.store.delete([entry.vaultId, entry.filePath]);
    }
    await tx.done;
  }
}
