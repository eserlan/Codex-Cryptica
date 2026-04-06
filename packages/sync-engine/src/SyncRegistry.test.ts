import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { openDB, type IDBPDatabase } from "idb";
import "fake-indexeddb/auto";
import { SyncRegistry } from "./SyncRegistry";

describe("SyncRegistry", () => {
  let db: IDBPDatabase;
  let registry: SyncRegistry;
  let dbName: string;

  beforeEach(async () => {
    dbName = `test-sync-db-${Math.random()}`;
    db = await openDB(dbName, 1, {
      upgrade(db) {
        const syncStore = db.createObjectStore("sync_registry", {
          keyPath: ["vaultId", "filePath"],
        });
        syncStore.createIndex("by-vault", "vaultId");
        syncStore.createIndex("by-remote-id", "remoteId");

        const opfsStore = db.createObjectStore("opfs_file_state", {
          keyPath: ["vaultId", "filePath"],
        });
        opfsStore.createIndex("by-vault", "vaultId");

        db.createObjectStore("cloud_sync_metadata", {
          keyPath: "vaultId",
        });
      },
    });

    registry = new SyncRegistry(db);
  });

  afterEach(async () => {
    if (db) {
      db.close();
    }
  });

  describe("Sync Entries", () => {
    it("should put and get an entry", async () => {
      const entry = {
        vaultId: "v1",
        filePath: "test.md",
        status: "SYNCED" as const,
        lastSyncedFsModified: 100,
        lastSyncedFsSize: 10,
        lastSyncedOpfsHash: "hash1",
      };

      await registry.putEntry(entry);
      const result = await registry.getEntry("v1", "test.md");
      expect(result).toEqual(entry);
    });

    it("should return undefined for missing entry", async () => {
      const result = await registry.getEntry("v1", "missing.md");
      expect(result).toBeUndefined();
    });

    it("should delete an entry", async () => {
      const entry = {
        vaultId: "v1",
        filePath: "test.md",
        status: "SYNCED" as const,
      };
      await registry.putEntry(entry as any);
      await registry.deleteEntry("v1", "test.md");
      const result = await registry.getEntry("v1", "test.md");
      expect(result).toBeUndefined();
    });

    it("should get entries by vault", async () => {
      await registry.putEntry({
        vaultId: "v1",
        filePath: "f1",
        status: "SYNCED",
      } as any);
      await registry.putEntry({
        vaultId: "v1",
        filePath: "f2",
        status: "SYNCED",
      } as any);
      await registry.putEntry({
        vaultId: "v2",
        filePath: "f3",
        status: "SYNCED",
      } as any);

      const entries = await registry.getEntriesByVault("v1");
      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.filePath)).toContain("f1");
      expect(entries.map((e) => e.filePath)).toContain("f2");
    });

    it("should get entry by remote ID", async () => {
      const entry = {
        vaultId: "v1",
        filePath: "f1",
        remoteId: "remote-123",
        status: "SYNCED",
      } as any;
      await registry.putEntry(entry);
      const result = await registry.getEntryByRemoteId("remote-123");
      expect(result).toEqual(entry);
    });

    it("should clear vault", async () => {
      await registry.putEntry({
        vaultId: "v1",
        filePath: "f1",
        status: "SYNCED",
      } as any);
      await registry.putEntry({
        vaultId: "v1",
        filePath: "f2",
        status: "SYNCED",
      } as any);

      await registry.clearVault("v1");

      const entries = await registry.getEntriesByVault("v1");
      expect(entries).toHaveLength(0);
    });

    it("should handle clearVault for empty vault", async () => {
      await registry.clearVault("empty-vault");
      // Should not throw
    });
  });

  describe("OPFS State", () => {
    it("should manage OPFS state", async () => {
      const state = {
        vaultId: "v1",
        filePath: "f1",
        hash: "h1",
        size: 10,
        lastModified: 100,
      };
      await registry.putOpfsState(state);

      const result = await registry.getOpfsState("v1", "f1");
      expect(result).toEqual(state);

      await registry.deleteOpfsState("v1", "f1");
      expect(await registry.getOpfsState("v1", "f1")).toBeUndefined();
    });

    it("should put multiple states", async () => {
      const states = [
        {
          vaultId: "v1",
          filePath: "f1",
          hash: "h1",
          size: 10,
          lastModified: 100,
        },
        {
          vaultId: "v1",
          filePath: "f2",
          hash: "h2",
          size: 20,
          lastModified: 200,
        },
      ];
      await registry.putOpfsStates(states);

      const results = await registry.getOpfsStatesByVault("v1");
      expect(results).toHaveLength(2);
    });

    it("should handle putOpfsStates with empty array", async () => {
      await registry.putOpfsStates([]);
      // Should not throw
    });

    it("should clear OPFS states by vault", async () => {
      await registry.putOpfsState({ vaultId: "v1", filePath: "f1" } as any);
      await registry.clearOpfsStatesByVault("v1");
      expect(await registry.getOpfsStatesByVault("v1")).toHaveLength(0);
    });

    it("should handle clearOpfsStatesByVault for empty vault", async () => {
      await registry.clearOpfsStatesByVault("empty");
      // Should not throw
    });
  });

  describe("Cloud Metadata", () => {
    it("should manage cloud metadata", async () => {
      const meta = {
        vaultId: "v1",
        lastSyncTime: 100,
        remoteFolderId: "folder-1",
        lastSyncToken: "token-1",
      };
      await registry.putCloudMetadata(meta);
      expect(await registry.getCloudMetadata("v1")).toEqual(meta);
    });
  });
});
