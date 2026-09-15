export {
  CACHEABLE_APP_DESTINATIONS,
  getVaultSeedUrls,
  isPotentialVaultAsset,
  isVaultAppPath,
  isViteDevUrl,
  shouldBypassFetchSynchronously,
  shouldHandleVaultRequest,
  VAULT_APP_ROUTE_PREFIXES,
  VITE_DEV_PATTERNS,
} from "./routing";

export {
  createVersionSkewResponse,
  handleFetchRequest,
  isVersionSkewResponse,
  matchCurrentThenOlderCache,
} from "./fetch-handler";

const CACHE_PREFIX = "cache-";

export interface ActivationStorage {
  keys(): Promise<string[]>;
  delete(cacheName: string): Promise<boolean>;
}

export interface VaultSeedStorage extends ActivationStorage {
  open(cacheName: string): Promise<{
    put(url: string, response: Response): Promise<unknown>;
  }>;
}

/** Activates the worker without downloading unrelated public routes at install time. */
export async function installWorker(options: {
  skipWaiting: () => Promise<unknown>;
}): Promise<void> {
  await options.skipWaiting();
}

/** Claims all open clients on activation so subsequent requests can be handled immediately. */
export async function activateBuild(options: {
  claimClients: () => Promise<unknown>;
}): Promise<void> {
  await options.claimClients();
}

/** Seeds the current vault shell before retiring older service-worker caches. */
export async function seedVaultCache(options: {
  cacheName: string;
  urls: string[];
  cacheStorage: VaultSeedStorage;
  fetchResource: (url: string) => Promise<Response>;
  warn: (message: string, error: unknown) => void;
}): Promise<boolean> {
  if (options.urls.length === 0) return false;

  let cache: Awaited<ReturnType<VaultSeedStorage["open"]>>;
  try {
    cache = await options.cacheStorage.open(options.cacheName);
  } catch (error) {
    options.warn("[SW] Failed to open vault cache", error);
    return false;
  }
  let seeded = true;

  for (const url of new Set(options.urls)) {
    try {
      const response = await options.fetchResource(url);
      const contentType = response.headers.get("content-type") ?? "";
      const isImmutableAsset = new URL(url).pathname.includes(
        "/_app/immutable/",
      );

      if (
        !response.ok ||
        (isImmutableAsset && contentType.includes("text/html"))
      ) {
        throw new Error(`Unexpected seed response (${response.status})`);
      }

      await cache.put(url, response);
    } catch (error) {
      seeded = false;
      options.warn(`[SW] Failed to seed vault shell: ${url}`, error);
    }
  }

  if (!seeded) return false;

  let cacheNames: string[];
  try {
    cacheNames = await options.cacheStorage.keys();
  } catch (error) {
    options.warn("[SW] Failed to enumerate caches", error);
    return true;
  }

  for (const cacheName of cacheNames) {
    if (
      cacheName === options.cacheName ||
      !cacheName.startsWith(CACHE_PREFIX)
    ) {
      continue;
    }

    try {
      await options.cacheStorage.delete(cacheName);
    } catch (error) {
      options.warn(`[SW] Failed to delete cache: ${cacheName}`, error);
    }
  }

  return true;
}
