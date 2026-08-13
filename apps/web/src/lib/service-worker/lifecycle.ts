// Cloudflare Pages' own deploy-time config files — consumed by the platform
// to set headers/redirects, never served back as downloadable assets. Since
// SvelteKit's `$service-worker` `files` list includes everything under
// `static/`, these otherwise end up in the precache list and always fail.
const UNCACHEABLE_STATIC_FILES = new Set(["/_headers", "/_redirects"]);

/** Combines the build/static/prerendered asset lists into the final precache list, dropping files that can never be fetched back (e.g. Cloudflare Pages config). */
export function getPrecacheAssets(sources: {
  build: readonly string[];
  files: readonly string[];
  prerendered: readonly string[];
}): string[] {
  return [
    ...sources.build,
    ...sources.files.filter((file) => !UNCACHEABLE_STATIC_FILES.has(file)),
    ...sources.prerendered,
  ];
}

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
