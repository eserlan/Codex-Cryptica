import {
  walkOpfsDirectory,
  writeOpfsFile,
  deleteOpfsEntry,
  isNotFoundError,
} from "../../utils/opfs";
import {
  parseMarkdown,
  stringifyEntity,
  deriveIdFromPath,
  sanitizeId,
} from "../../utils/markdown";
import { cacheService } from "../../services/cache.svelte";
import type { IFileIOAdapter } from "@codex/vault-engine/src/repository.svelte";
import type {
  ISyncIOAdapter,
  ISyncEngine,
  ISyncNotifier,
} from "@codex/vault-engine/src/sync-coordinator";
import type {
  IAssetIOAdapter,
  IImageProcessor,
} from "@codex/vault-engine/src/asset-manager";
import { LocalSyncService, SyncRegistry } from "@codex/sync-engine";
import { getDB } from "../../utils/idb";
import { readOpfsBlob, getDirHandle } from "../../utils/opfs";
import { pickDirectory } from "../../utils/fs";
import { convertToWebP, generateThumbnail } from "../../utils/image-processing";
import { DEFAULT_ENTITY_TYPE } from "schema";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

export const fileIOAdapter: IFileIOAdapter = {
  walkDirectory: walkOpfsDirectory as any,
  readFileAsText: async (entry) => {
    const file = await entry.handle.getFile();
    return await file.text();
  },
  writeEntityFile: async (dir, vaultId, entity) => {
    const path = entity._path || [`${entity.id}.md`];
    // Svelte 5: ensure we have a plain object for YAML serialization
    const snapshot = $state.snapshot(entity);
    const content = stringifyEntity(snapshot);
    await writeOpfsFile(path, content, dir, vaultId);
  },
  getCachedEntity: async (vaultId, path) => {
    const cached = await cacheService.get(`${vaultId}:${path}`);
    return cached as any;
  },
  setCachedEntity: async (vaultId, path, lastModified, entity) => {
    await cacheService.set(`${vaultId}:${path}`, lastModified, entity);
  },
  setCachedEntitiesBulk: async (vaultId, entries) => {
    const formatted = entries.map((e) => ({
      path: `${vaultId}:${e.path}`,
      lastModified: e.lastModified,
      entity: e.entity,
    }));
    await cacheService.bulkSet(formatted);
  },
  parseMarkdown: (text, path) => {
    const parsed = parseMarkdown(text);
    const rawId = parsed.metadata.id || deriveIdFromPath(path);
    const id = sanitizeId(rawId);
    const connections = parsed.metadata.connections || [];

    let parent = parsed.metadata.parent
      ? sanitizeId(parsed.metadata.parent)
      : undefined;

    // Derive parent from subdirectories if not explicitly defined in frontmatter
    if (!parent && path && path.length > 1) {
      for (let i = path.length - 2; i >= 0; i--) {
        const dirId = sanitizeId(path[i]);
        if (dirId !== id) {
          parent = dirId;
          break;
        }
      }
    }

    const entity = {
      ...parsed.metadata,
      id: id!,
      type: parsed.metadata.type || DEFAULT_ENTITY_TYPE,
      title:
        parsed.metadata.title ||
        (path && path.length > 0
          ? path[path.length - 1].replace(/\.(md|markdown)$/i, "")
          : rawId),
      status: parsed.metadata.status || "active",
      tags: parsed.metadata.tags || [],
      labels: parsed.metadata.labels || parsed.metadata.tags || [],
      aliases: parsed.metadata.aliases || [],
      connections,
      content: parsed.content,
      lore: parsed.metadata.lore || "",
      parent,
      _path: path,
    };

    const hasEndDate =
      entity.end_date &&
      typeof entity.end_date.year === "number" &&
      Number.isFinite(entity.end_date.year);
    const hasPastLabel = entity.labels.includes("past");
    if (hasEndDate && !hasPastLabel) {
      entity.labels = [...entity.labels, "past"];
    } else if (!hasEndDate && hasPastLabel) {
      entity.labels = entity.labels.filter((l) => l !== "past");
    }

    return entity;
  },
  isNotFoundError: (err) => isNotFoundError(err),
};

export const syncIOAdapter: ISyncIOAdapter = {
  walkDirectory: walkOpfsDirectory as any,
  deleteOpfsEntry: deleteOpfsEntry as any,
  writeOpfsFile: writeOpfsFile as any,
  getLocalHandle: async (vaultId) => {
    const db = await getDB();
    let handle = await db.get("settings", `folderHandle_${vaultId}`);
    if (!handle) {
      // Migrate from old key name
      handle = await db.get("settings", `syncHandle_${vaultId}`);
      if (handle) {
        try {
          await db.put("settings", handle, `folderHandle_${vaultId}`);
          await db.delete("settings", `syncHandle_${vaultId}`);
        } catch {
          // Best-effort migration — still return the handle
        }
      }
    }
    return handle;
  },
  setLocalHandle: async (vaultId, handle) => {
    const db = await getDB();
    await db.put("settings", handle, `folderHandle_${vaultId}`);
  },
  deleteLocalHandle: async (vaultId) => {
    const db = await getDB();
    await db.delete("settings", `folderHandle_${vaultId}`);
    await db.delete("settings", `syncHandle_${vaultId}`);
  },
  parseMarkdown: (text) => parseMarkdown(text) as any,
  showDirectoryPicker: async () => await pickDirectory({ mode: "readwrite" }),
  readOpfsBlob: readOpfsBlob as any,
  getDirectoryHandle: getDirHandle as any,
  isNotFoundError: (err) => isNotFoundError(err),
};

export const syncNotifier: ISyncNotifier = {
  notify: (msg, type) => {
    const uiType = type === "warning" ? "info" : type;
    notificationStore.notify(msg, uiType);
  },
  alert: (msg) => window.alert(msg),
};

export const assetIOAdapter: IAssetIOAdapter = {
  writeOpfsFile: writeOpfsFile as any,
  readOpfsBlob: readOpfsBlob as any,
  getDirectoryHandle: getDirHandle as any,
  isNotFoundError: (err) => isNotFoundError(err),
};

export const imageProcessor: IImageProcessor = {
  convertToWebP,
  generateThumbnail,
};

export async function createSyncEngine(): Promise<ISyncEngine> {
  const db = await getDB();
  return new LocalSyncService(new SyncRegistry(db)) as unknown as ISyncEngine;
}
