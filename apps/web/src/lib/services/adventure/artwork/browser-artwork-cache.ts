import {
  planCacheMutation,
  type CachedArtworkEntry,
} from "@codex/adventure-artwork-engine";

export const ARTWORK_CACHE_NAME = "codex-adventure-artwork-v1";
export interface BrowserArtworkCacheDependencies {
  open(name: string): Promise<Cache>;
  withLock<T>(action: () => Promise<T>): Promise<T>;
  /** Read under the same lock used to install and remove collections. */
  protectedUrls?(): Promise<ReadonlySet<string>>;
  now?: () => number;
}

/** CacheStorage adapter; public blobs only. Writes and eviction share a cross-tab lock. */
export class BrowserArtworkCache {
  constructor(private readonly deps: BrowserArtworkCacheDependencies) {}
  async read(url: string): Promise<Blob | null> {
    const cache = await this.deps.open(ARTWORK_CACHE_NAME);
    const response = await cache.match(url);
    return response ? response.blob() : null;
  }
  async touch(url: string): Promise<void> {
    await this.deps.withLock(async () => {
      const cache = await this.deps.open(ARTWORK_CACHE_NAME);
      const response = await cache.match(url);
      if (!response) return;
      const headers = new Headers(response.headers);
      headers.set("x-artwork-last-used", String((this.deps.now ?? Date.now)()));
      await cache.put(url, new Response(await response.blob(), { headers }));
    });
  }
  async write(url: string, blob: Blob): Promise<void> {
    // fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
    await this.deps.withLock(async () => {
      const cache = await this.deps.open(ARTWORK_CACHE_NAME);
      const protectedUrls = await this.deps.protectedUrls?.();
      const entries: CachedArtworkEntry[] = [];
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        if (!response) continue;
        const bytes = (await response.blob()).size;
        const stamp = Number(response.headers.get("x-artwork-last-used"));
        entries.push({
          id: request.url,
          bytes,
          lastUsed: Number.isFinite(stamp) ? stamp : 0,
          protected: protectedUrls
            ? protectedUrls.has(request.url)
            : response.headers.get("x-artwork-protected") === "true",
        });
      }
      const plan = planCacheMutation(entries, { id: url, bytes: blob.size });
      if (!plan.ok) throw new Error(`artwork-cache-${plan.reason}`);
      for (const id of plan.evict)
        if (!(await cache.delete(id)))
          throw new Error("artwork-cache-eviction-failed");
      await cache.put(
        url,
        new Response(blob, {
          headers: {
            "Content-Type": blob.type,
            "x-artwork-last-used": String((this.deps.now ?? Date.now)()),
            ...(!protectedUrls &&
            entries.find((entry) => entry.id === url)?.protected
              ? { "x-artwork-protected": "true" }
              : {}),
          },
        }),
      );
    });
  }
}
