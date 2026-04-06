import { type IDBPDatabase } from "idb";
import {
  type SyncEntry,
  type CloudSyncMetadata,
  type OpfsStateEntry,
} from "./types";

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

  async getEntryByRemoteId(remoteId: string): Promise<SyncEntry | undefined> {
    return this.db.getFromIndex("sync_registry", "by-remote-id", remoteId);
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

  async getOpfsState(
    vaultId: string,
    filePath: string,
  ): Promise<OpfsStateEntry | undefined> {
    return this.db.get("opfs_file_state", [vaultId, filePath]);
  }

  async putOpfsState(entry: OpfsStateEntry): Promise<void> {
    await this.db.put("opfs_file_state", entry);
  }

  async putOpfsStates(entries: OpfsStateEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const tx = this.db.transaction("opfs_file_state", "readwrite");
    for (const entry of entries) {
      await tx.store.put(entry);
    }
    await tx.done;
  }

  async deleteOpfsState(vaultId: string, filePath: string): Promise<void> {
    await this.db.delete("opfs_file_state", [vaultId, filePath]);
  }

  async getOpfsStatesByVault(vaultId: string): Promise<OpfsStateEntry[]> {
    return this.db.getAllFromIndex("opfs_file_state", "by-vault", vaultId);
  }

  async clearOpfsStatesByVault(vaultId: string): Promise<void> {
    const entries = await this.getOpfsStatesByVault(vaultId);
    if (entries.length === 0) return;

    const tx = this.db.transaction("opfs_file_state", "readwrite");
    for (const entry of entries) {
      await tx.store.delete([entry.vaultId, entry.filePath]);
    }
    await tx.done;
  }

  async getCloudMetadata(
    vaultId: string,
  ): Promise<CloudSyncMetadata | undefined> {
    return this.db.get("cloud_sync_metadata", vaultId);
  }

  async putCloudMetadata(metadata: CloudSyncMetadata): Promise<void> {
    await this.db.put("cloud_sync_metadata", metadata);
  }
}
