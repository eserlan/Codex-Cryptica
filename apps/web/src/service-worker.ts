/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import {
  activateBuild,
  getVaultSeedUrls,
  installWorker,
  matchCurrentThenOlderCache,
  seedVaultCache,
  shouldHandleVaultRequest,
} from "$lib/service-worker/lifecycle";

const CACHE_VERSION = "608";
const appVersion =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const CACHE = `cache-${appVersion}-${CACHE_VERSION}`;

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener("install", (event) => {
  event.waitUntil(
    installWorker({
      skipWaiting: () => sw.skipWaiting(),
    }),
  );
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    activateBuild({
      claimClients: () => sw.clients.claim(),
    }),
  );
});

sw.addEventListener("message", (event) => {
  const data = event.data as
    { type?: unknown; active?: unknown; urls?: unknown } | undefined;
  if (
    data?.type !== "VAULT_CACHE_SESSION" ||
    data.active !== true ||
    !Array.isArray(data.urls) ||
    !event.source ||
    !("url" in event.source)
  ) {
    return;
  }

  const urls = getVaultSeedUrls({
    sourceUrl: event.source.url,
    origin: location.origin,
    requestedUrls: data.urls.filter(
      (url): url is string => typeof url === "string",
    ),
  });
  if (urls.length === 0) return;

  event.waitUntil(
    seedVaultCache({
      cacheName: CACHE,
      urls,
      cacheStorage: caches,
      fetchResource: (url) => fetch(url),
      warn: (message, error) => console.warn(message, error),
    }),
  );
});

sw.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  async function respond() {
    const url = new URL(event.request.url);

    // 1. Bypass for cross-origin requests (e.g., CDN, Google Drive, Gemini)
    // We only want to manage local app assets.
    if (url.origin !== location.origin) {
      return fetch(event.request);
    }

    // 2. Bypass non-http protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fetch(event.request);
    }

    // 3. Bypass Vite dev server requests — never cache .svelte source files,
    //    Vite modules, filesystem proxies, or hot-module-replacement endpoints.
    //    These are transformed on-the-fly by the dev server and should never
    //    pass through the service worker cache.
    const viteDevPatterns = [
      /\.svelte($|\?)/,
      /\.ts($|\?)/,
      /\/@vite\//,
      /\/@fs\//,
      /\/node_modules\//,
      /\?v=/,
      /__vite/,
      /\/@id\//,
    ];
    if (
      viteDevPatterns.some((pattern) => pattern.test(url.pathname + url.search))
    ) {
      return fetch(event.request);
    }

    // The worker is root-scoped because app and public routes share one origin,
    // but only the interactive vault surface should participate in offline
    // caching. Public generators, blogs, and discovery pages stay network-only.
    let clientPathname: string | undefined;
    if (event.request.mode !== "navigate" && event.clientId) {
      const client = await sw.clients.get(event.clientId);
      if (client) {
        clientPathname = new URL(client.url).pathname;
      }
    }

    if (
      !shouldHandleVaultRequest({
        pathname: url.pathname,
        mode: event.request.mode,
        destination: event.request.destination,
        clientPathname,
      })
    ) {
      return fetch(event.request);
    }

    const cache = await caches.open(CACHE);

    // for everything else, try the network first, but fall back to the cache if we're offline
    try {
      const response = await fetch(event.request);

      const contentType = response.headers.get("content-type") || "";
      const isJsOrCss =
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".css") ||
        url.pathname.includes("/_app/immutable/");

      // If a JS/CSS asset request returns HTML (e.g., Cloudflare SPA 404 fallback),
      // return a 404 text response so script error handlers fail cleanly rather than throwing syntax errors.
      if (isJsOrCss && contentType.includes("text/html")) {
        return new Response("Asset missing (Version Skew)", {
          status: 404,
          statusText: "Not Found",
          headers: { "Content-Type": "text/plain" },
        });
      }

      // Only cache valid successful responses from our own origin
      if (response.status === 200 && url.origin === location.origin) {
        event.waitUntil(
          cache.put(event.request, response.clone()).catch((error) => {
            console.warn(
              `[SW] Failed to cache response: ${url.pathname}`,
              error,
            );
          }),
        );
      }

      return response;
    } catch (err) {
      const response = await matchCurrentThenOlderCache({
        request: event.request,
        currentCache: cache,
        matchOlderCache: (request) => caches.match(request),
      });
      if (response) return response;

      // If it's a navigation request and we don't have it in cache, return index.html (fallback for SPA)
      if (event.request.mode === "navigate") {
        return (
          (await matchCurrentThenOlderCache({
            request: "/",
            currentCache: cache,
            matchOlderCache: (request) => caches.match(request),
          })) ??
          matchCurrentThenOlderCache({
            request: "/index.html",
            currentCache: cache,
            matchOlderCache: (request) => caches.match(request),
          })
        );
      }

      // If we are in development, don't return a 503, let the error bubble
      // This helps diagnose real fetch errors instead of swallowing them in a "Offline" response
      throw err;
    }
  }

  event.respondWith(respond());
});
