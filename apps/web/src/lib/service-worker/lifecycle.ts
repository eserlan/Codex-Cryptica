const VAULT_APP_ROUTE_PREFIXES = [
  "/adventure",
  "/canvas",
  "/decks",
  "/map",
  "/oracle",
  "/table",
  "/tables",
  "/timeline",
  "/vault",
] as const;

const CACHE_PREFIX = "cache-";

const CACHEABLE_APP_DESTINATIONS = new Set([
  "audio",
  "font",
  "image",
  "manifest",
  "script",
  "style",
  "track",
  "video",
  "worker",
]);

/** Returns whether a URL belongs to the interactive vault app rather than the public discovery site. */
export function isVaultAppPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/import") return true;

  return VAULT_APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Limits service-worker handling to vault documents and their static runtime assets. */
export function shouldHandleVaultRequest(request: {
  pathname: string;
  mode: string;
  destination: string;
  clientPathname?: string;
}): boolean {
  if (request.mode === "navigate") {
    return isVaultAppPath(request.pathname);
  }

  if (!request.clientPathname || !isVaultAppPath(request.clientPathname)) {
    return false;
  }

  return (
    CACHEABLE_APP_DESTINATIONS.has(request.destination) ||
    request.pathname.startsWith("/_app/immutable/") ||
    request.pathname.endsWith(".wasm")
  );
}

/** Validates a client-provided shell seed without allowing public or API URLs into the cache. */
export function getVaultSeedUrls(options: {
  sourceUrl: string;
  origin: string;
  requestedUrls: string[];
}): string[] {
  const sourceUrl = new URL(options.sourceUrl);
  sourceUrl.hash = "";

  if (
    sourceUrl.origin !== options.origin ||
    !isVaultAppPath(sourceUrl.pathname)
  ) {
    return [];
  }

  const urls = new Set<string>();
  for (const requestedUrl of options.requestedUrls) {
    let url: URL;
    try {
      url = new URL(requestedUrl, options.origin);
    } catch {
      continue;
    }
    url.hash = "";

    if (url.origin !== options.origin) continue;
    if (
      url.href === sourceUrl.href ||
      url.pathname.includes("/_app/immutable/")
    ) {
      urls.add(url.href);
    }
  }

  return [...urls];
}

interface ActivationStorage {
  keys(): Promise<string[]>;
  delete(cacheName: string): Promise<boolean>;
}

interface VaultSeedStorage extends ActivationStorage {
  open(cacheName: string): Promise<{
    put(url: string, response: Response): Promise<unknown>;
  }>;
}

/** Prefers this build's cache while retaining a fallback to an older usable build. */
export async function matchCurrentThenOlderCache(options: {
  request: RequestInfo | URL;
  currentCache: Pick<Cache, "match">;
  matchOlderCache: (
    request: RequestInfo | URL,
  ) => Promise<Response | undefined>;
}): Promise<Response | undefined> {
  return (
    (await options.currentCache.match(options.request)) ??
    options.matchOlderCache(options.request)
  );
}

/** Activates the worker without downloading unrelated public routes at install time. */
export async function installWorker(options: {
  skipWaiting: () => Promise<unknown>;
}): Promise<void> {
  await options.skipWaiting();
}

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
