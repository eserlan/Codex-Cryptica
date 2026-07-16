interface PrecacheStorage {
  open(cacheName: string): Promise<{
    add(asset: string): Promise<unknown>;
  }>;
}

interface ActivationStorage {
  keys(): Promise<string[]>;
  delete(cacheName: string): Promise<boolean>;
}

export async function precacheBuild(options: {
  cacheName: string;
  assets: string[];
  cacheStorage: PrecacheStorage;
  skipWaiting: () => Promise<unknown>;
  warn: (message: string, error: unknown) => void;
}): Promise<void> {
  try {
    const cache = await options.cacheStorage.open(options.cacheName);

    for (const asset of options.assets) {
      try {
        await cache.add(asset);
      } catch (error) {
        options.warn(`[SW] Failed to cache asset: ${asset}`, error);
      }
    }
  } catch (error) {
    options.warn(`[SW] Failed to open cache: ${options.cacheName}`, error);
  } finally {
    await options.skipWaiting();
  }
}

export async function activateBuild(options: {
  cacheName: string;
  cacheStorage: ActivationStorage;
  claimClients: () => Promise<unknown>;
  warn: (message: string, error: unknown) => void;
}): Promise<void> {
  try {
    let cacheNames: string[] = [];
    try {
      cacheNames = await options.cacheStorage.keys();
    } catch (error) {
      options.warn("[SW] Failed to enumerate caches", error);
    }

    for (const cacheName of cacheNames) {
      if (cacheName === options.cacheName) continue;

      try {
        await options.cacheStorage.delete(cacheName);
      } catch (error) {
        options.warn(`[SW] Failed to delete cache: ${cacheName}`, error);
      }
    }
  } finally {
    await options.claimClients();
  }
}
