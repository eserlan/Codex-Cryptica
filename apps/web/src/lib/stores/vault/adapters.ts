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
} from "../../utils/markdown";
import { cacheService } from "../../services/cache";
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
import { uiStore } from "../ui.svelte";
import { readOpfsBlob, getDirHandle } from "../../utils/opfs";
import { convertToWebP, generateThumbnail } from "../../utils/image-processing";
import { DEFAULT_ENTITY_TYPE } from "schema";

export const fileIOAdapter: IFileIOAdapter = {
  walkDirectory: walkOpfsDirectory as any,
  readFileAsText: async (entry) => {
    const file = await entry.handle.getFile();
    return await file.text();
  },
  writeEntityFile: async (dir, vaultId, entity) => {
    const path = entity._path || [`${entity.id}.md`];
    const content = stringifyEntity(entity);
    await writeOpfsFile(path, content, dir, vaultId);
  },
  getCachedEntity: async (vaultId, path) => {
    const cached = await cacheService.get(`${vaultId}:${path}`);
    return cached as any;
  },
  setCachedEntity: async (vaultId, path, lastModified, entity) => {
    await cacheService.set(`${vaultId}:${path}`, lastModified, entity);
  },
  parseMarkdown: (text, path) => {
    const parsed = parseMarkdown(text);
    const id = parsed.metadata.id || deriveIdFromPath(path);
    const connections = parsed.metadata.connections || [];
    return {
      ...parsed.metadata,
      id: id!,
      type: parsed.metadata.type || DEFAULT_ENTITY_TYPE,
      title: parsed.metadata.title || id!,
      tags: parsed.metadata.tags || [],
      labels: parsed.metadata.labels || [],
      connections,
      content: parsed.content,
      lore: (parsed.metadata as any).lore || "",
      _path: path,
    } as any;
  },
  isNotFoundError: (err) => isNotFoundError(err),
};

export const syncIOAdapter: ISyncIOAdapter = {
  walkDirectory: walkOpfsDirectory as any,
  deleteOpfsEntry: deleteOpfsEntry as any,
  writeOpfsFile: writeOpfsFile as any,
  getLocalHandle: async (vaultId) => {
    const db = await getDB();
    return await db.get("settings", `syncHandle_${vaultId}`);
  },
  setLocalHandle: async (vaultId, handle) => {
    const db = await getDB();
    await db.put("settings", handle, `syncHandle_${vaultId}`);
  },
  deleteLocalHandle: async (vaultId) => {
    const db = await getDB();
    await db.delete("settings", `syncHandle_${vaultId}`);
  },
  parseMarkdown: (text) => parseMarkdown(text) as any,
  showDirectoryPicker: async () =>
    await window.showDirectoryPicker({ mode: "readwrite" }),
  readOpfsBlob: readOpfsBlob as any,
  getDirectoryHandle: getDirHandle as any,
  isNotFoundError: (err) => isNotFoundError(err),
};

export const syncNotifier: ISyncNotifier = {
  notify: (msg, type) => {
    const uiType = type === "warning" ? "info" : type;
    uiStore.notify(msg, uiType);
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
  return new LocalSyncService(new SyncRegistry(db));
}
