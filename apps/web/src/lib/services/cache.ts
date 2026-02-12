import { getCachedFile, setCachedFile, clearCache } from "../utils/idb";
import type { LocalEntity } from "../stores/vault/types";

export class CacheService {
  async get(path: string) {
    return await getCachedFile(path);
  }

  async set(path: string, lastModified: number, entity: LocalEntity) {
    await setCachedFile(path, lastModified, entity);
  }

  async clear() {
    await clearCache();
  }
}

export const cacheService = new CacheService();
