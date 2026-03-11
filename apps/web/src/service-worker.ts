/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from "$service-worker";

const CACHE_VERSION = "186";
const CACHE = `cache-${version}-${CACHE_VERSION}`;

const ASSETS = [
  ...build, // the app itself
  ...files, // everything in `static`
];

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener("install", (event) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    // Be resilient: add assets individually so one failure doesn't block everything
    for (const asset of ASSETS) {
      try {
        await cache.add(asset);
      } catch (err) {
        console.warn(`[SW] Failed to cache asset: ${asset}`, err);
      }
    }
  }

  event.waitUntil(addFilesToCache());
});

sw.addEventListener("activate", (event) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
});

sw.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);

    // 1. Bypass for cross-origin requests (e.g., CDN, Google Drive, Gemini)
    // We only want to manage local app assets.
    if (url.origin !== location.origin) {
      return fetch(event.request);
    }

    // 2. Bypassing service worker for development server internals or non-http
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fetch(event.request);
    }

    // build/files can always be served from the cache
    if (ASSETS.includes(url.pathname)) {
      const response = await cache.match(event.request);
      if (response) return response;
    }

    // for everything else, try the network first, but fall back to the cache if we're offline
    try {
      const response = await fetch(event.request);

      // Only cache valid successful responses from our own origin
      if (response.status === 200 && url.origin === location.origin) {
        cache.put(event.request, response.clone());
      }

      return response;
    } catch (err) {
      const response = await cache.match(event.request);
      if (response) return response;

      // If it's a navigation request and we don't have it in cache, return index.html (fallback for SPA)
      if (event.request.mode === "navigate") {
        return (await cache.match("/")) || (await cache.match("index.html"));
      }

      // If we are in development, don't return a 503, let the error bubble
      // This helps diagnose real fetch errors instead of swallowing them in a "Offline" response
      throw err;
    }
  }

  event.respondWith(respond());
});
