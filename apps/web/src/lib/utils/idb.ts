import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LocalEntity } from "../stores/vault/types";
import type { SyncEntry, OpfsStateEntry } from "@codex/sync-engine";
import type {
  GuestChatTranscript,
  PublishRegistry,
  StatSheetTemplate,
  PresentationTemplate,
} from "schema";
import type { ImportJournal, ShelfEntry } from "@codex/entity-shelf";
// ... (rest of imports unchanged)
export interface VaultRecord {
  id: string;
  name: string;
  createdAt: number;
  lastOpenedAt: number;
  entityCount: number;
  lastInternalChange?: number;
  lastSavedToFolder?: number;
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
      remoteFolderId: string;
      remoteFolderName?: string;

      lastSyncToken: string | null;
      lastSyncTime: number;
    };
  };
  opfs_file_state: {
    key: [string, string];
    value: OpfsStateEntry;
    indexes: {
      "by-vault": string;
    };
  };
  proposals: {
    key: string; // unique id for the proposal: `${vaultId}:${sourceId}:${targetId}`
    value: {
      id: string;
      vaultId: string;
      sourceId: string;
      targetId: string;
      type: string;
      context: string;
      reason: string;
      confidence: number;
      status: "pending" | "accepted" | "rejected" | "verified";
      timestamp: number;
    };
    indexes: {
      "by-source": string;
      "by-status": string;
      "by-vault": string;
      "by-vault-status": [string, string];
      "by-vault-source": [string, string];
    };
  };
  canvases: {
    key: string; // id
    value: {
      id: string;
      vaultId: string;
      name: string;
      createdAt: number;
      lastModified: number;
    };
    indexes: {
      "by-vault": string;
    };
  };
  dice_history: {
    key: string; // id
    value: any; // RollResult
    indexes: {
      "by-context": string;
    };
  };
  guest_chat_transcripts: {
    key: string;
    value: GuestChatTranscript;
    indexes: {
      "by-character": string;
      "by-speaker": string;
    };
  };
  publish_registry: {
    key: string; // vaultId
    value: PublishRegistry;
  };
  stat_sheet_templates: {
    key: string; // id
    value: StatSheetTemplate & { vaultId: string };
    indexes: {
      "by-vault": string;
    };
  };
  stat_sheet_presentation_templates: {
    key: string; // id
    value: PresentationTemplate;
    indexes: {
      "by-vault": string;
      "by-schema-template-id": string;
    };
  };
  // The Shelf (156-entity-shelf). Deliberately NOT vault-scoped: unlike every
  // other store here it carries no vaultId key and no by-vault index, because
  // being readable from whichever vault is open is the whole feature.
  shelf_entries: {
    key: string; // entry id
    value: ShelfEntry;
    indexes: {
      "by-group": string;
    };
  };
  // Present only while an import is in flight. Anything found at startup is a
  // crashed import whose artifacts need rolling back.
  shelf_journal: {
    key: string; // importId
    value: ImportJournal;
  };
}

export const DB_NAME = "CodexCryptica";
// DB_VERSION was bumped to 21 (not 20 — some browsers already reached 20
// during local dev/testing before the stat_sheet_templates store existed in
// the upgrade() callback below, so 20 was a consumed no-op for them and the
// store never got created) to support vault-scoped stat sheet templates.
// Bumped to 22 to add stat_sheet_presentation_templates (152-stat-sheet-templates).
// Bumped to 23 to add shelf_entries and shelf_journal (156-entity-shelf).
// Bumped to 24 to add a by-speaker index on guest_chat_transcripts, so a
// character's chat history can be queried both as the AI-voiced participant
// and as the human's speaker character (#2302).
export const DB_VERSION = 24;

// Cached on `globalThis` (not a plain module-level `let`) so that a Vite HMR
// update to this file can't leave two separate connection-promise slots
// floating around — one held by importers still referencing the pre-HMR
// module instance, another by anything importing the fresh one. A stale
// slot's `openDB` call captured whatever `DB_VERSION` was in effect at the
// moment it first ran, so it can silently keep serving a connection that
// predates a schema change (missing object stores) for the rest of the
// session even though the file on disk has since moved on.
const DB_PROMISE_KEY = "__codex_idb_db_promise__";

export function getDB() {
  let dbPromise: Promise<IDBPDatabase<CodexDB>> | undefined = (
    globalThis as any
  )[DB_PROMISE_KEY];
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
          if (!store.indexNames.contains("by-remote-id")) {
            store.createIndex("by-remote-id", "remoteId");
          }
        }

        if (!db.objectStoreNames.contains("cloud_sync_metadata")) {
          db.createObjectStore("cloud_sync_metadata", { keyPath: "vaultId" });
        }

        if (!db.objectStoreNames.contains("opfs_file_state")) {
          const store = db.createObjectStore("opfs_file_state", {
            keyPath: ["vaultId", "filePath"],
          });
          store.createIndex("by-vault", "vaultId");
        }

        if (!db.objectStoreNames.contains("proposals")) {
          const store = db.createObjectStore("proposals", { keyPath: "id" });
          store.createIndex("by-source", "sourceId");
          store.createIndex("by-status", "status");
          store.createIndex("by-vault", "vaultId");
          store.createIndex("by-vault-status", ["vaultId", "status"]);
          store.createIndex("by-vault-source", ["vaultId", "sourceId"]);
        } else if (oldVersion < 16) {
          const store = transaction.objectStore("proposals");
          if (!store.indexNames.contains("by-vault")) {
            store.createIndex("by-vault", "vaultId");
          }
          if (!store.indexNames.contains("by-vault-status")) {
            store.createIndex("by-vault-status", ["vaultId", "status"]);
          }
          if (!store.indexNames.contains("by-vault-source")) {
            store.createIndex("by-vault-source", ["vaultId", "sourceId"]);
          }
        }

        if (!db.objectStoreNames.contains("canvases")) {
          const store = db.createObjectStore("canvases", { keyPath: "id" });
          store.createIndex("by-vault", "vaultId");
        }

        if (!db.objectStoreNames.contains("dice_history")) {
          const store = db.createObjectStore("dice_history", { keyPath: "id" });
          store.createIndex("by-context", "context");
        }

        if (!db.objectStoreNames.contains("guest_chat_transcripts")) {
          const store = db.createObjectStore("guest_chat_transcripts", {
            keyPath: "id",
          });
          store.createIndex("by-character", "characterId");
          store.createIndex("by-speaker", "speakerCharacterId");
        } else if (oldVersion < 24) {
          const store = transaction.objectStore("guest_chat_transcripts");
          if (!store.indexNames.contains("by-speaker")) {
            store.createIndex("by-speaker", "speakerCharacterId");
          }
        }

        if (!db.objectStoreNames.contains("publish_registry")) {
          db.createObjectStore("publish_registry", {
            keyPath: "vaultId",
          });
        }

        if (!db.objectStoreNames.contains("stat_sheet_templates")) {
          const store = db.createObjectStore("stat_sheet_templates", {
            keyPath: "id",
          });
          store.createIndex("by-vault", "vaultId");
        }

        if (
          !db.objectStoreNames.contains("stat_sheet_presentation_templates")
        ) {
          const store = db.createObjectStore(
            "stat_sheet_presentation_templates",
            { keyPath: "id" },
          );
          store.createIndex("by-vault", "vaultId");
          store.createIndex("by-schema-template-id", "schemaTemplateId");
        }

        if (!db.objectStoreNames.contains("shelf_entries")) {
          const store = db.createObjectStore("shelf_entries", {
            keyPath: "id",
          });
          store.createIndex("by-group", "groupId");
        }

        if (!db.objectStoreNames.contains("shelf_journal")) {
          db.createObjectStore("shelf_journal", { keyPath: "importId" });
        }
      },
      blocked() {
        console.warn("[IDB] Database Open Blocked");
      },
      blocking() {
        console.warn("[IDB] Database Open Blocking - closing older connection");
        const promiseToClose = (globalThis as any)[DB_PROMISE_KEY];
        if (promiseToClose) {
          (globalThis as any)[DB_PROMISE_KEY] = undefined;
          promiseToClose
            .then((db: IDBPDatabase<CodexDB>) => db.close())
            .catch(() => {});
        }
      },
      terminated() {
        console.error("[IDB] Database Connection Terminated");
      },
    });
    (globalThis as any)[DB_PROMISE_KEY] = dbPromise;
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
