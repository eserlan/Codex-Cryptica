import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LocalEntity } from "../stores/vault/types";

export interface VaultRecord {
  id: string;
  name: string;
  createdAt: number;
  lastOpenedAt: number;
  entityCount: number;
}

interface CodexDB extends DBSchema {
  settings: {
    key: string;
    value: any;
  };
  vault_cache: {
    key: string; // filePath
    value: {
      path: string;
      lastModified: number;
      entity: LocalEntity;
    };
  };
  chat_history: {
    key: string; // id
    value: any; // ChatMessage
  };
  world_eras: {
    key: string; // id
    value: any; // Era
  };
  vaults: {
    key: string; // id
    value: VaultRecord;
  };
  proposals: {
    key: string; // composite key or auto-inc? Let's use id or [sourceId, targetId]
    value: {
      id: string; // unique id for the proposal
      sourceId: string;
      targetId: string;
      type: string;
      context: string;
      status: "pending" | "accepted" | "rejected";
      timestamp: number;
    };
    indexes: {
      "by-source": string;
      "by-status": string;
    };
  };
}

const DB_NAME = "CodexCryptica";
const DB_VERSION = 6;

let dbPromise: Promise<IDBPDatabase<CodexDB>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CodexDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1 && !db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains("vault_cache")) {
          db.createObjectStore("vault_cache", { keyPath: "path" });
        }
        if (oldVersion < 3 && !db.objectStoreNames.contains("chat_history")) {
          db.createObjectStore("chat_history", { keyPath: "id" });
        }
        if (oldVersion < 4 && !db.objectStoreNames.contains("world_eras")) {
          db.createObjectStore("world_eras", { keyPath: "id" });
        }
        if (oldVersion < 5 && !db.objectStoreNames.contains("vaults")) {
          db.createObjectStore("vaults", { keyPath: "id" });
        }
        if (oldVersion < 6 && !db.objectStoreNames.contains("proposals")) {
          const store = db.createObjectStore("proposals", { keyPath: "id" });
          store.createIndex("by-source", "sourceId");
          store.createIndex("by-status", "status");
        }
      },
    });
  }
  return dbPromise;
}

export async function getPersistedHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await getDB();
  return (await db.get("settings", "lastVaultHandle")) || null;
}

export async function persistHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await getDB();
  await db.put("settings", handle, "lastVaultHandle");
}

export async function clearPersistedHandle(): Promise<void> {
  const db = await getDB();
  await db.delete("settings", "lastVaultHandle");
}

export async function getPersistedSyncHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await getDB();
  return (await db.get("settings", "lastSyncHandle")) || null;
}

export async function persistSyncHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await getDB();
  await db.put("settings", handle, "lastSyncHandle");
}

export async function clearPersistedSyncHandle(): Promise<void> {
  const db = await getDB();
  await db.delete("settings", "lastSyncHandle");
}

// Cache Service methods
export async function getCachedFile(path: string) {
  const db = await getDB();
  return db.get("vault_cache", path);
}

export async function setCachedFile(
  path: string,
  lastModified: number,
  entity: LocalEntity,
) {
  const db = await getDB();

  // Store entity in cache with lastModified timestamp for cache validation.

  await db.put("vault_cache", { path, lastModified, entity });
}

export async function clearCache() {
  const db = await getDB();
  await db.clear("vault_cache");
}
