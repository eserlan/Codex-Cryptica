const VAULT_APP_ROUTE_PREFIXES = [
  "/adventure",
  "/canvas",
  "/decks",
  "/dice",
  "/guest",
  "/help",
  "/map",
  "/oracle",
  "/table",
  "/tables",
  "/templates",
  "/timeline",
  "/vault",
] as const;

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

interface ActivationStorage {
  keys(): Promise<string[]>;
  delete(cacheName: string): Promise<boolean>;
}

/** Activates the worker without downloading unrelated public routes at install time. */
export async function installWorker(options: {
  skipWaiting: () => Promise<unknown>;
}): Promise<void> {
  await options.skipWaiting();
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
