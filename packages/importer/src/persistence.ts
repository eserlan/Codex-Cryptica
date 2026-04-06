import type { DiscoveredEntity, ImportRegistry } from "./types";
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "CodexImporterRegistry";
const STORE_NAME = "import_registry";
const MAX_REGISTRY_SIZE = 10;

async function getDB(): Promise<IDBPDatabase<any>> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "hash",
        });
        store.createIndex("by-last-used", "lastUsedAt");
      }
    },
  });
}

/**
 * Retrieves or creates a registry record for a file hash.
 */
export async function getRegistry(
  hash: string,
  fileName: string,
  totalChunks: number,
): Promise<ImportRegistry> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  let record = await store.get(hash);
  let isNew = false;

  if (!record) {
    isNew = true;
    record = {
      hash,
      fileName,
      totalChunks,
      completedIndices: [],
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };
  } else {
    record.lastUsedAt = Date.now();
    record.totalChunks = totalChunks; // Update if chunking logic changed
  }

  await store.put(record);
  await tx.done;

  // Prune registry only after adding a NEW file to minimize transaction conflicts
  if (isNew) {
    await pruneRegistry();
  }

  return record;
}

/**
 * Marks a specific chunk index as completed for a file hash.
 */
export async function markChunkComplete(
  hash: string,
  index: number,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const record = await store.get(hash);
  if (record) {
    if (!record.completedIndices.includes(index)) {
      record.completedIndices.push(index);
      record.lastUsedAt = Date.now();
      await store.put(record);
    }
  }
  await tx.done;
}

/**
 * Clears the registry entry for a specific hash (Manual Restart).
 */
export async function clearRegistryEntry(hash: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, hash);
}

/**
 * Prunes the registry to keep only the 10 most recently used file signatures.
 */
export async function pruneRegistry(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("by-last-used");

  // Traversal from newest to oldest ("prev") to keep the 10 most recent
  const cursor = await index.openCursor(null, "prev");
  let count = 0;

  if (cursor) {
    let currentCursor: typeof cursor | null = cursor;
    while (currentCursor) {
      count++;
      if (count > MAX_REGISTRY_SIZE) {
        await currentCursor.delete();
      }
      currentCursor = await currentCursor.continue();
    }
  }

  await tx.done;
}

export function generateMarkdownFile(entity: DiscoveredEntity): string {
  const frontmatter: Record<string, any> = {
    title: entity.suggestedTitle,
    type: entity.suggestedType,
    ...entity.frontmatter,
  };

  // Include detected links in the frontmatter so they aren't lost
  if (entity.detectedLinks && entity.detectedLinks.length > 0) {
    frontmatter.detectedLinks = entity.detectedLinks;
  }

  const yamlLines = Object.entries(frontmatter).map(([key, value]) => {
    if (Array.isArray(value)) {
      const items = value.map((v) => {
        if (typeof v === "object" && v !== null) {
          // Simple key-value pairing for connection objects
          return `{ ${Object.entries(v)
            .map(([sk, sv]) => `${sk}: "${String(sv).replace(/"/g, '"')}"`)
            .join(", ")} }`;
        }
        return `"${v}"`;
      });
      return `${key}: [${items.join(", ")}]`;
    }
    if (
      typeof value === "string" &&
      (value.includes(":") || value.includes("\n"))
    ) {
      return `${key}: "${value.replace(/"/g, '"')}"`;
    }
    return `${key}: ${value}`;
  });

  return `---
${yamlLines.join("\n")}
---

${entity.content}`;
}

export async function saveAssetToOpfs(asset: {
  id: string;
  blob: Blob;
  originalName: string;
}): Promise<string> {
  // Mock OPFS persistence for MVP or use browser API
  // In a real app, this would use the Origin Private File System API
  // For this library, we might just return the logic or delegate.
  // We'll implement a basic interface placeholder.
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(asset.originalName, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(asset.blob);
  await writable.close();
  return asset.originalName;
}
