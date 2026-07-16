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
  const cache = await options.cacheStorage.open(options.cacheName);

  for (const asset of options.assets) {
    try {
      await cache.add(asset);
    } catch (error) {
      options.warn(`[SW] Failed to cache asset: ${asset}`, error);
    }
  }

  await options.skipWaiting();
}

export async function activateBuild(options: {
  cacheName: string;
  cacheStorage: ActivationStorage;
  claimClients: () => Promise<unknown>;
}): Promise<void> {
  for (const cacheName of await options.cacheStorage.keys()) {
    if (cacheName !== options.cacheName) {
      await options.cacheStorage.delete(cacheName);
    }
  }

  await options.claimClients();
}
