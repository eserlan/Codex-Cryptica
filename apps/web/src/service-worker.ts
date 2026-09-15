/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import {
  activateBuild,
  getVaultSeedUrls,
  handleFetchRequest,
  installWorker,
  seedVaultCache,
  shouldBypassFetchSynchronously,
  shouldHandleVaultRequest,
} from "$lib/service-worker/lifecycle";

const CACHE_VERSION = "650";
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

  const url = new URL(event.request.url);

  // Fast synchronous bypass: avoid calling event.respondWith() for cross-origin,
  // non-http, Vite dev assets, non-vault navigations, or non-vault subresources.
  // This allows the browser to perform native fetching without service-worker
  // interception, eliminating overhead and unhandled promise rejections.
  if (
    shouldBypassFetchSynchronously({
      url,
      mode: event.request.mode,
      destination: event.request.destination,
      origin: location.origin,
    })
  ) {
    return;
  }

  event.respondWith(
    (async () => {
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
        return fetch(event.request).catch(() => Response.error());
      }

      return handleFetchRequest({
        request: event.request,
        cacheName: CACHE,
        waitUntil: (promise) => event.waitUntil(promise),
        isDev: appVersion === "dev",
      });
    })(),
  );
});
