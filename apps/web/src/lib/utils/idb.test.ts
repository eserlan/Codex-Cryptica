import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  getDB, 
  persistHandle, 
  getPersistedHandle, 
  clearPersistedHandle,
  setCachedFile, 
  getCachedFile, 
  clearCache,
  DB_NAME
} from "./idb";

describe("idb.ts utility", () => {
  beforeEach(async () => {
    // Clear the database before each test
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });

  it("should initialize the database with all required stores", async () => {
    const db = await getDB();
    expect(db.name).toBe(DB_NAME);

    const storeNames = Array.from(db.objectStoreNames);
    expect(storeNames).toContain("settings");
    expect(storeNames).toContain("vault_cache");
    expect(storeNames).toContain("chat_history");
    expect(storeNames).toContain("world_eras");
    expect(storeNames).toContain("vaults");
    expect(storeNames).toContain("sync_registry");
    expect(storeNames).toContain("cloud_sync_metadata");
    expect(storeNames).toContain("opfs_file_state");
    expect(storeNames).toContain("proposals");
    expect(storeNames).toContain("canvases");
    expect(storeNames).toContain("dice_history");
    
    // Check indexes for a few
    const tx = db.transaction("sync_registry", "readonly");
    const syncStore = tx.objectStore("sync_registry");
    expect(Array.from(syncStore.indexNames)).toContain("by-vault");
    expect(Array.from(syncStore.indexNames)).toContain("by-remote-id");
  });

  it("should persist and retrieve a directory handle", async () => {
    const mockHandle = { name: "test-vault", kind: "directory" };
    await persistHandle(mockHandle as any);
    
    const retrieved = await getPersistedHandle();
    expect(retrieved).toEqual(mockHandle);
  });

  it("should clear the persisted handle", async () => {
    const mockHandle = { name: "test-vault", kind: "directory" };
    await persistHandle(mockHandle as any);
    await clearPersistedHandle();
    
    const retrieved = await getPersistedHandle();
    expect(retrieved).toBeNull();
  });

  it("should cache and retrieve file entities", async () => {
    const mockEntity = { id: "e1", title: "Test Entity" };
    const path = "vault/test.md";
    const lastModified = Date.now();
    
    await setCachedFile(path, lastModified, mockEntity as any);
    
    const cached = await getCachedFile(path);
    expect(cached).toBeDefined();
    expect(cached?.entity).toEqual(mockEntity);
    expect(cached?.lastModified).toBe(lastModified);
  });

  it("should clear the vault cache", async () => {
    const mockEntity = { id: "e1" };
    await setCachedFile("path1", 123, mockEntity as any);
    
    await clearCache();
    
    const cached = await getCachedFile("path1");
    expect(cached).toBeUndefined();
  });

  it("should return null for non-existent handle", async () => {
    const retrieved = await getPersistedHandle();
    expect(retrieved).toBeNull();
  });
});
