export interface CacheMatchStorage {
  open(cacheName: string): Promise<Pick<Cache, "match" | "put">>;
  match(request: RequestInfo | URL): Promise<Response | undefined>;
}

export interface FetchRequestOptions {
  request: Request;
  cacheName: string;
  origin?: string;
  cacheStorage?: CacheMatchStorage;
  fetchFn?: typeof fetch;
  waitUntil?: (promise: Promise<unknown>) => void;
  warn?: (message: string, error?: unknown) => void;
  isDev?: boolean;
}

/**
 * Checks whether an asset request returned an HTML document (e.g. Cloudflare SPA 404 fallback)
 * instead of JavaScript or CSS, which indicates version skew between the loaded shell and static assets.
 */
export function isVersionSkewResponse(
  pathname: string,
  contentType: string,
): boolean {
  const isJsOrCss =
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.includes("/_app/immutable/");

  return isJsOrCss && contentType.includes("text/html");
}

/** Creates a plain-text 404 response so script error handlers fail cleanly rather than throwing syntax errors. */
export function createVersionSkewResponse(): Response {
  return new Response("Asset missing (Version Skew)", {
    status: 404,
    statusText: "Not Found",
    headers: { "Content-Type": "text/plain" },
  });
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

/**
 * Handles an in-scope vault fetch request using a network-first caching strategy
 * with version-skew protection, offline fallback, and safe error handling.
 */
export async function handleFetchRequest(
  options: FetchRequestOptions,
): Promise<Response> {
  const {
    request,
    cacheName,
    origin = typeof location !== "undefined" ? location.origin : "",
    cacheStorage = typeof caches !== "undefined" ? caches : undefined,
    fetchFn = fetch,
    waitUntil = () => {},
    warn = console.warn,
    isDev = false,
  } = options;

  if (!cacheStorage) {
    return fetchFn(request);
  }

  const url = new URL(request.url);
  const cache = await cacheStorage.open(cacheName);

  try {
    const response = await fetchFn(request);
    const contentType = response.headers.get("content-type") || "";

    if (isVersionSkewResponse(url.pathname, contentType)) {
      return createVersionSkewResponse();
    }

    if (response.status === 200 && url.origin === origin) {
      waitUntil(
        cache.put(request, response.clone()).catch((error) => {
          warn(`[SW] Failed to cache response: ${url.pathname}`, error);
        }),
      );
    }

    return response;
  } catch (err) {
    // Attempt offline recovery from current then older caches
    const cachedResponse = await matchCurrentThenOlderCache({
      request,
      currentCache: cache,
      matchOlderCache: (req) => cacheStorage.match(req),
    });
    if (cachedResponse) {
      return cachedResponse;
    }

    // Navigation fallback: return SPA index shell if available in cache
    if (request.mode === "navigate") {
      const spaShell =
        (await matchCurrentThenOlderCache({
          request: "/",
          currentCache: cache,
          matchOlderCache: (req) => cacheStorage.match(req),
        })) ??
        (await matchCurrentThenOlderCache({
          request: "/index.html",
          currentCache: cache,
          matchOlderCache: (req) => cacheStorage.match(req),
        }));

      if (spaShell) {
        return spaShell;
      }
    }

    // Handle cancelled or aborted fetches cleanly without crashing worker runtime
    if (
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"))
    ) {
      return Response.error();
    }

    // In development, bubble non-abort errors to help diagnose network/dev issues
    if (isDev) {
      throw err;
    }

    // In production, return standard network error response instead of uncaught promise rejection
    return Response.error();
  }
}
