import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LocalEntity } from "../stores/vault/types";
import type { SyncEntry } from "@codex/sync-engine";

export interface VaultRecord {
  id: string;
  name: string;
  createdAt: number;
  lastOpenedAt: number;
  entityCount: number;
  gdriveSyncEnabled?: boolean;
  gdriveFolderId?: string | null;
  syncState?: {
    lastSyncMs: number | null;
    remoteHash: string | null;
    status: "idle" | "syncing" | "error";
  };
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
  sync_registry: {
    key: [string, string]; // [vaultId, filePath]
    value: SyncEntry;
    indexes: {
      "by-vault": string;
      "by-remote-id": string;
    };
  };
  cloud_sync_metadata: {
    key: string; // vaultId
    value: {
      vaultId: string;
      gdriveFolderId: string;
      lastSyncToken: string | null;
      lastSyncTime: number;
    };
  };
  proposals: {
    key: string; // composite key or auto-inc? Let's use id or [sourceId, targetId]
    value: {
      id: string; // unique id for the proposal
      sourceId: string;
      targetId: string;
      type: string;
      context: string;
      reason: string;
      confidence: number;
      status: "pending" | "accepted" | "rejected";
      timestamp: number;
    };
    indexes: {
      "by-source": string;
      "by-status": string;
    };
  };
}

export const DB_NAME = "CodexCryptica";
// DB_VERSION was bumped to 11 to add cloud sync stores and indexes.
export const DB_VERSION = 11;

let dbPromise: Promise<IDBPDatabase<CodexDB>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CodexDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
        if (!db.objectStoreNames.contains("vault_cache")) {
          db.createObjectStore("vault_cache", { keyPath: "path" });
        }
        if (!db.objectStoreNames.contains("chat_history")) {
          db.createObjectStore("chat_history", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("world_eras")) {
          db.createObjectStore("world_eras", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("vaults")) {
          db.createObjectStore("vaults", { keyPath: "id" });
        }

        // Recreate sync_registry if schema changes
        if (db.objectStoreNames.contains("sync_registry") && oldVersion < 10) {
          db.deleteObjectStore("sync_registry");
        }

        if (!db.objectStoreNames.contains("sync_registry")) {
          const store = db.createObjectStore("sync_registry", {
            keyPath: ["vaultId", "filePath"],
          });
          store.createIndex("by-vault", "vaultId");
          store.createIndex("by-remote-id", "remoteId");
        } else if (oldVersion < 11) {
          const store = transaction.objectStore("sync_registry");
          store.createIndex("by-remote-id", "remoteId");
        }

        if (!db.objectStoreNames.contains("cloud_sync_metadata")) {
          db.createObjectStore("cloud_sync_metadata", { keyPath: "vaultId" });
        }

        if (!db.objectStoreNames.contains("proposals")) {
          const store = db.createObjectStore("proposals", { keyPath: "id" });
          store.createIndex("by-source", "sourceId");
          store.createIndex("by-status", "status");
        }
      },
      blocked() {
        console.warn("[IDB] Database Open Blocked");
      },
      blocking() {
        console.warn("[IDB] Database Open Blocking - closing older connection");
        if (dbPromise) {
          dbPromise.then((db) => db.close());
        }
      },
      terminated() {
        console.error("[IDB] Database Connection Terminated");
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
