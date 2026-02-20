import {
  writeOpfsFile,
  walkOpfsDirectory,
  type FileEntry,
} from "../../utils/opfs";
import { reResolveFileHandle, writeWithRetry } from "../../utils/vault-io";
import { getDB } from "../../utils/idb";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache";
import {
  parseMarkdown,
  sanitizeId,
  stringifyEntity,
} from "../../utils/markdown";
import type { LocalEntity } from "./types";

export async function syncToLocal(
  activeVaultId: string,
  vaultHandle: FileSystemDirectoryHandle,
  updateStatus: (status: "saving" | "idle" | "error", msg?: string) => void,
) {
  if (!activeVaultId || !vaultHandle) {
    updateStatus("error", "No active vault to sync.");
    return;
  }

  let localHandle: FileSystemDirectoryHandle | null = null;
  const handleKey = `syncHandle_${activeVaultId}`;

  try {
    const db = await getDB();
    localHandle = await db.get("settings", handleKey);

    if (localHandle) {
      const permission = await localHandle.queryPermission({
        mode: "readwrite",
      });
      if (permission !== "granted") {
        await localHandle.requestPermission({ mode: "readwrite" });
      }
    }

    if (!localHandle) {
      localHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      await db.put("settings", localHandle, handleKey);
    }

    updateStatus("saving");
    debugStore.log(
      `Syncing Vault (${activeVaultId}) to local folder: ${localHandle.name}`,
    );

    const opfsFiles = await walkOpfsDirectory(vaultHandle);
    for (const fileEntry of opfsFiles) {
      const blob = await fileEntry.handle.getFile();
      const localFileHandle = await reResolveFileHandle(
        localHandle,
        fileEntry.path,
        true,
      );
      await writeWithRetry(
        localHandle,
        localFileHandle,
        blob,
        fileEntry.path.join("/"),
      );
    }

    debugStore.log("Sync to local folder complete.");
    updateStatus("idle");
  } catch (err: any) {
    if (err.name === "NotFoundError" && localHandle) {
      debugStore.error("Sync folder not found.", err);
      const msg = `Sync folder "${localHandle.name}" not found. Please select it again.`;
      const db = await getDB();
      await db.delete("settings", handleKey);
      updateStatus("error", msg);
    } else if (err.name !== "AbortError") {
      console.error("Sync failed", err);
      updateStatus("error", `Sync failed: ${err.message}`);
    } else {
      updateStatus("idle");
    }
  }
}

export async function importFromFolder(
  activeVaultId: string,
  vaultHandle: FileSystemDirectoryHandle,
  handle?: FileSystemDirectoryHandle,
): Promise<{ success: boolean; error?: string; count?: number }> {
  if (!vaultHandle) return { success: false, error: "Vault not open" };

  let localHandle: FileSystemDirectoryHandle;
  if (handle) {
    localHandle = handle;
  } else {
    try {
      localHandle = await window.showDirectoryPicker({ mode: "read" });
    } catch {
      return { success: false }; // User cancelled
    }
  }

  try {
    const allFiles = await walkAllFiles(localHandle);
    debugStore.log(`Importing ${allFiles.length} files from local folder...`);

    let successCount = 0;
    let errorCount = 0;

    for (const { path, handle } of allFiles) {
      try {
        const file = await handle.getFile();
        const name = path[path.length - 1].toLowerCase();
        if (name.endsWith(".md") || name.endsWith(".markdown")) {
          const content = await file.text();
          await writeOpfsFile(path, content, vaultHandle);
        } else {
          await writeOpfsFile(path, file, vaultHandle);
        }
        successCount++;
      } catch (fileErr) {
        console.error(`Failed to import ${path.join("/")}:`, fileErr);
        errorCount++;
      }
    }

    if (errorCount > 0 && successCount === 0) {
      throw new Error("No files were successfully imported.");
    }

    return { success: true, count: successCount };
  } catch (e: unknown) {
    console.error("Import failed", e);
    const msg = `Import failed: ${e instanceof Error ? e.message : String(e)}`;
    return { success: false, error: msg };
  }
}

async function walkAllFiles(
  dirHandle: FileSystemDirectoryHandle,
  path: string[] = [],
): Promise<{ path: string[]; handle: FileSystemFileHandle }[]> {
  const results: { path: string[]; handle: FileSystemFileHandle }[] = [];

  for await (const [name, handle] of dirHandle.entries()) {
    const currentPath = [...path, name];
    if (handle.kind === "file") {
      results.push({
        path: currentPath,
        handle: handle as FileSystemFileHandle,
      });
    } else if (handle.kind === "directory") {
      const subResults = await walkAllFiles(
        handle as FileSystemDirectoryHandle,
        currentPath,
      );
      results.push(...subResults);
    }
  }

  return results;
}

export async function loadVaultFiles(
  activeVaultId: string,
  vaultHandle: FileSystemDirectoryHandle,
): Promise<{
  entities: Record<string, LocalEntity>;
}> {
  debugStore.log("Loading files from OPFS...");

  const files = await walkOpfsDirectory(vaultHandle, [], (err, path) => {
    debugStore.error(`Failed to scan ${path.join("/")}`, err);
  });

  const mdFiles = files.filter((f) => {
    const name = f.path[f.path.length - 1].toLowerCase();
    return name.endsWith(".md") || name.endsWith(".markdown");
  });

  debugStore.log(`Found ${mdFiles.length} markdown files in OPFS.`);

  const entities: Record<string, LocalEntity> = {};

  const processFile = async (fileEntry: FileEntry) => {
    const filePath = fileEntry.path.join("/");
    const file = await fileEntry.handle.getFile();
    const lastModified = file.lastModified;
    const cacheKey = `${activeVaultId}:${filePath}`;
    const cached = await cacheService.get(cacheKey);

    let entity: LocalEntity;

    if (cached && cached.lastModified === lastModified) {
      entity = { ...cached.entity, _path: fileEntry.path, synced: true };
    } else {
      const text = await file.text();
      const { metadata, content, wikiLinks } = parseMarkdown(text || "");
      const id =
        metadata.id ||
        sanitizeId(
          fileEntry.path[fileEntry.path.length - 1].replace(
            /\.(md|markdown)$/i,
            "",
          ),
        );

      const connections = [...(metadata.connections || []), ...wikiLinks];
      entity = {
        id: id!,
        type: metadata.type || "character",
        title: metadata.title || id!,
        tags: metadata.tags || [],
        labels: metadata.labels || [],
        connections,
        content: content,
        lore: metadata.lore,
        image: metadata.image,
        thumbnail: metadata.thumbnail,
        date: metadata.date,
        start_date: metadata.start_date,
        end_date: metadata.end_date,
        metadata: metadata.metadata,
        _path: fileEntry.path,
        synced: true,
      };
      const cacheKey = `${activeVaultId}:${filePath}`;
      await cacheService.set(cacheKey, lastModified, entity);
    }

    if (!entity.id || entity.id === "undefined") return;
    entities[entity.id] = entity;
  };

  const CHUNK_SIZE = 5;
  for (let i = 0; i < mdFiles.length; i += CHUNK_SIZE) {
    const chunk = mdFiles.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(processFile));
  }

  debugStore.log(
    `Vault loaded: ${Object.keys(entities).length} entities from OPFS.`,
  );

  return { entities };
}

export async function saveEntityToDisk(
  vaultHandle: FileSystemDirectoryHandle,
  activeVaultId: string,
  entity: LocalEntity,
  isGuest: boolean,
) {
  if (isGuest) return;

  if (!vaultHandle) {
    console.warn("OPFS not available, skipping save.");
    return;
  }

  const path = entity._path || [`${entity.id}.md`];
  const content = stringifyEntity(entity);
  await writeOpfsFile(path, content, vaultHandle);
}
