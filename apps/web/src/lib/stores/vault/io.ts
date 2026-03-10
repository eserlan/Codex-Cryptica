import {
  writeOpfsFile,
  walkOpfsDirectory,
  getDirHandle,
  isNotFoundError,
  deleteOpfsEntry,
  type FileEntry,
} from "../../utils/opfs";
import { CanvasSchema } from "@codex/canvas-engine";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache";
import {
  parseMarkdown,
  sanitizeId,
  stringifyEntity,
} from "../../utils/markdown";
import type { LocalEntity } from "./types";

import type { Map } from "schema";

// Clock skew tolerance for comparing timestamps across different filesystems
const SKEW_MS = 2000;

export async function saveMapsToDisk(
  vaultHandle: FileSystemDirectoryHandle,
  maps: Record<string, Map>,
) {
  if (!vaultHandle) return;
  const content = JSON.stringify(maps, null, 2);
  await writeOpfsFile(
    [".codex", "maps.json"],
    content,
    vaultHandle,
    vaultHandle.name,
  );
}

export async function saveCanvasToDisk(
  vaultHandle: FileSystemDirectoryHandle,
  id: string,
  data: any,
) {
  if (!vaultHandle) return;
  const content = JSON.stringify(data, null, 2);
  await writeOpfsFile(
    [".codex", "canvases", `${id}.canvas`],
    content,
    vaultHandle,
    vaultHandle.name,
  );
}

export async function deleteCanvasFromDisk(
  vaultHandle: FileSystemDirectoryHandle,
  id: string,
) {
  if (!vaultHandle) return;
  try {
    await deleteOpfsEntry(
      vaultHandle,
      [".codex", "canvases", `${id}.canvas`],
      vaultHandle.name,
    );
  } catch (err: any) {
    if (err.name !== "NotFoundError") {
      console.warn(`Failed to delete canvas file ${id}.canvas`, err);
    }
  }
}

export async function loadMapsFromDisk(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<Record<string, Map>> {
  if (!vaultHandle) return {};
  try {
    const codexDir = await vaultHandle.getDirectoryHandle(".codex", {
      create: true,
    });
    const fileHandle = await codexDir.getFileHandle("maps.json");
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function loadCanvasesFromDisk(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<Record<string, any>> {
  if (!vaultHandle) return {};
  try {
    const codexDir = await vaultHandle.getDirectoryHandle(".codex", {
      create: true,
    });
    const canvasesDir = await codexDir.getDirectoryHandle("canvases", {
      create: true,
    });

    const canvases: Record<string, any> = {};
    for await (const [name, handle] of canvasesDir.entries()) {
      if (handle.kind === "file" && name.endsWith(".canvas")) {
        try {
          const id = name.replace(".canvas", "");
          const file = await (handle as FileSystemFileHandle).getFile();
          const text = await file.text();
          const raw = JSON.parse(text);
          canvases[id] = CanvasSchema.parse(raw);
        } catch (itemErr) {
          console.error(`[VaultIO] Failed to load canvas ${name}`, itemErr);
        }
      }
    }
    return canvases;
  } catch (err) {
    console.warn("[VaultIO] Failed to load individual canvases", err);
    return {};
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
    const dirCache = new Map<string, FileSystemDirectoryHandle>();

    for (const { path, handle } of allFiles) {
      try {
        const localFile = await handle.getFile();

        let shouldWrite = true;
        try {
          // Check if file already exists in OPFS and is up to date
          const fileName = path[path.length - 1];
          const dirPath = path.slice(0, -1);
          const dirPathStr = dirPath.join("/");

          let dirHandle =
            dirPath.length > 0 ? dirCache.get(dirPathStr) : vaultHandle;

          if (!dirHandle && dirPath.length > 0) {
            try {
              dirHandle = await getDirHandle(vaultHandle, dirPath, false);
              dirCache.set(dirPathStr, dirHandle);
            } catch (e: any) {
              if (!isNotFoundError(e)) {
                throw e;
              }
            }
          }

          if (dirHandle) {
            const opfsFileHandle = await dirHandle.getFileHandle(fileName);
            const opfsFile = await opfsFileHandle.getFile();

            if (
              opfsFile.size === localFile.size &&
              opfsFile.lastModified >= localFile.lastModified - SKEW_MS
            ) {
              shouldWrite = false;
            }
          }
        } catch (e: any) {
          if (e.name !== "NotFoundError") {
            debugStore.warn(
              `Pre-import check failed for ${path.join("/")}: ${e.message}`,
            );
          }
        }

        if (shouldWrite) {
          const name = path[path.length - 1].toLowerCase();
          if (name.endsWith(".md") || name.endsWith(".markdown")) {
            const content = await localFile.text();
            await writeOpfsFile(path, content, vaultHandle, activeVaultId);
          } else {
            await writeOpfsFile(path, localFile, vaultHandle, activeVaultId);
          }
          successCount++;
        }
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
  onProgress?: (
    chunkEntities: Record<string, LocalEntity>,
    current: number,
    total: number,
  ) => void,
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

  const total = mdFiles.length;
  debugStore.log(`Found ${total} markdown files in OPFS.`);

  const entities: Record<string, LocalEntity> = {};

  const processFile = async (fileEntry: FileEntry) => {
    const filePath = fileEntry.path.join("/");
    const file = await fileEntry.handle.getFile();
    const lastModified = file.lastModified;
    const cacheKey = `${activeVaultId}:${filePath}`;
    const cached = await cacheService.get(cacheKey);

    let entity: LocalEntity;

    if (cached && cached.lastModified === lastModified) {
      entity = { ...cached.entity, _path: fileEntry.path };
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
        updatedAt: metadata.updatedAt,
        _path: fileEntry.path,
      };
      const cacheKey = `${activeVaultId}:${filePath}`;
      await cacheService.set(cacheKey, lastModified, entity);
    }

    if (!entity.id || entity.id === "undefined") return null;
    return entity;
  };

  const CHUNK_SIZE = 50;
  for (let i = 0; i < mdFiles.length; i += CHUNK_SIZE) {
    const chunk = mdFiles.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(chunk.map(processFile));

    const chunkEntities: Record<string, LocalEntity> = {};
    for (const entity of chunkResults) {
      if (entity) {
        entities[entity.id] = entity;
        chunkEntities[entity.id] = entity;
      }
    }

    if (onProgress) {
      onProgress(chunkEntities, Math.min(i + CHUNK_SIZE, total), total);
    }
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
  await writeOpfsFile(path, content, vaultHandle, activeVaultId);
}
