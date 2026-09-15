export const VAULT_APP_ROUTE_PREFIXES = [
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

export const CACHEABLE_APP_DESTINATIONS = new Set([
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

export const VITE_DEV_PATTERNS = [
  /\.svelte($|\?)/,
  /\.ts($|\?)/,
  /\/@vite\//,
  /\/@fs\//,
  /\/node_modules\//,
  /\?v=/,
  /__vite/,
  /\/@id\//,
];

/** Returns whether a URL belongs to the interactive vault app rather than the public discovery site. */
export function isVaultAppPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/import") return true;

  return VAULT_APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Returns whether a URL corresponds to Vite dev-server dynamic modules or HMR endpoints. */
export function isViteDevUrl(url: URL): boolean {
  return VITE_DEV_PATTERNS.some((pattern) =>
    pattern.test(url.pathname + url.search),
  );
}

/** Returns whether a subresource request is potentially a cacheable vault app asset. */
export function isPotentialVaultAsset(
  pathname: string,
  destination: string,
): boolean {
  return (
    CACHEABLE_APP_DESTINATIONS.has(destination) ||
    pathname.startsWith("/_app/immutable/") ||
    pathname.endsWith(".wasm")
  );
}

/**
 * Evaluates whether a request should be bypassed synchronously before calling event.respondWith().
 * Returning true allows the browser to perform native network fetching without service-worker
 * interception, eliminating overhead and unhandled promise rejections on aborted requests.
 */
export function shouldBypassFetchSynchronously(options: {
  url: URL;
  mode: string;
  destination: string;
  origin: string;
}): boolean {
  const { url, mode, destination, origin } = options;

  // 1. Cross-origin bypass (CDNs, Google Drive, external APIs)
  if (url.origin !== origin) {
    return true;
  }

  // 2. Non-HTTP protocols (chrome-extension:, blob:, data:)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return true;
  }

  // 3. Vite development server requests
  if (isViteDevUrl(url)) {
    return true;
  }

  // 4. Navigation requests to non-vault routes (public pages, blogs, generators)
  if (mode === "navigate") {
    return !isVaultAppPath(url.pathname);
  }

  // 5. Subresource requests that cannot possibly be vault app assets (API calls, data JSON, etc.)
  if (!isPotentialVaultAsset(url.pathname, destination)) {
    return true;
  }

  return false;
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

  return isPotentialVaultAsset(request.pathname, request.destination);
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
