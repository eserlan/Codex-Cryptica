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

function toCachedEntry(
  url: string,
  bytes: number,
  headers: Headers,
  protectedUrls: ReadonlySet<string> | undefined,
): CachedArtworkEntry {
  const stamp = Number(headers.get("x-artwork-last-used"));
  const isProtected = protectedUrls
    ? protectedUrls.has(url)
    : headers.get("x-artwork-protected") === "true";
  return {
    id: url,
    bytes,
    lastUsed: Number.isFinite(stamp) ? stamp : 0,
    protected: isProtected,
  };
}

function buildWriteHeaders(
  blob: Blob,
  url: string,
  now: () => number,
  protectedUrls: ReadonlySet<string> | undefined,
  entries: readonly CachedArtworkEntry[],
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": blob.type,
    "x-artwork-last-used": String(now()),
  };
  const keepProtected =
    !protectedUrls && entries.find((entry) => entry.id === url)?.protected;
  if (keepProtected) headers["x-artwork-protected"] = "true";
  return headers;
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
  private async collectEntries(
    cache: Cache,
    protectedUrls: ReadonlySet<string> | undefined,
  ): Promise<CachedArtworkEntry[]> {
    const entries: CachedArtworkEntry[] = [];
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      if (!response) continue;
      const bytes = (await response.blob()).size;
      entries.push(
        toCachedEntry(request.url, bytes, response.headers, protectedUrls),
      );
    }
    return entries;
  }
  private async evictPlanned(
    cache: Cache,
    ids: readonly string[],
  ): Promise<void> {
    for (const id of ids) {
      if (!(await cache.delete(id))) {
        throw new Error("artwork-cache-eviction-failed");
      }
    }
  }
  private async writeLocked(url: string, blob: Blob): Promise<void> {
    const cache = await this.deps.open(ARTWORK_CACHE_NAME);
    const protectedUrls = await this.deps.protectedUrls?.();
    const entries = await this.collectEntries(cache, protectedUrls);
    const plan = planCacheMutation(entries, { id: url, bytes: blob.size });
    if (!plan.ok) throw new Error(`artwork-cache-${plan.reason}`);
    await this.evictPlanned(cache, plan.evict);
    const headers = buildWriteHeaders(
      blob,
      url,
      this.deps.now ?? Date.now,
      protectedUrls,
      entries,
    );
    await cache.put(url, new Response(blob, { headers }));
  }
  async write(url: string, blob: Blob): Promise<void> {
    await this.deps.withLock(() => this.writeLocked(url, blob));
  }
}
