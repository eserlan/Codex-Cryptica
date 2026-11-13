import { ArtworkCache } from "./artwork-cache";
import { BrowserArtworkCache } from "./browser-artwork-cache";
import { createArtworkCacheLock } from "./browser-cache-lock";
import { readCollectionIndex } from "./collection-storage";

export interface ArtworkLoaderDependencies {
  open(name: string): Promise<Cache>;
  locks: Pick<LockManager, "request"> | undefined;
  fetch(url: string, init: RequestInit): Promise<Response>;
  digest(bytes: ArrayBuffer): Promise<string>;
  dimensions(blob: Blob): Promise<{ width: number; height: number }>;
  protectedUrls?(): Promise<ReadonlySet<string>>;
}

/** Assemble browser IO through explicit ports; callers own lifecycle and enablement. */
export function createArtworkLoader(
  deps: ArtworkLoaderDependencies,
): ArtworkCache {
  const storage = new BrowserArtworkCache({
    open: deps.open,
    withLock: createArtworkCacheLock(deps.locks),
    protectedUrls: deps.protectedUrls,
  });
  return new ArtworkCache({
    read: (url) => storage.read(url),
    write: (url, blob) => storage.write(url, blob),
    touch: (url) => storage.touch(url),
    fetch: deps.fetch,
    digest: deps.digest,
    dimensions: deps.dimensions,
  });
}

/** Construct lazily in a browser so server rendering never touches DOM globals. */
export function createBrowserArtworkLoader(): ArtworkCache {
  return createArtworkLoader({
    open: (name) => caches.open(name),
    locks: navigator.locks,
    protectedUrls: async () =>
      new Set(
        Object.values(readCollectionIndex(localStorage).collections).flatMap(
          (files) => files.map((file) => file.id),
        ),
      ),
    fetch: (url, init) => fetch(url, init),
    digest: async (bytes) => {
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(hash), (value) =>
        value.toString(16).padStart(2, "0"),
      ).join("");
    },
    dimensions: async (blob) => {
      const image = await createImageBitmap(blob);
      try {
        return { width: image.width, height: image.height };
      } finally {
        image.close();
      }
    },
  });
}
