import { LocalThumbnailCache } from "./local-thumbnail";
import { type Clock, systemClock } from "./runtime";

export interface IImageProcessor {
  convertToWebP(blob: Blob, quality?: number): Promise<Blob>;
  generateThumbnail(blob: Blob, size: number): Promise<Blob>;
}

export interface IAssetIOAdapter {
  writeOpfsFile(
    path: string[],
    content: string | Blob | File,
    root: FileSystemDirectoryHandle,
    vaultId?: string,
  ): Promise<void>;
  readOpfsBlob(path: string[], root: FileSystemDirectoryHandle): Promise<Blob>;
  getDirectoryHandle(
    root: FileSystemDirectoryHandle,
    path: string[],
    create?: boolean,
  ): Promise<FileSystemDirectoryHandle>;
  isNotFoundError(err: any): boolean;
  /** Removes a file, and does nothing when it is already gone. */
  deleteFile?(
    path: string[],
    root: FileSystemDirectoryHandle,
    vaultId?: string,
  ): Promise<void>;
}

/** Longest side of a generated thumbnail; matches uploaded images' `_thumb`. */
const THUMBNAIL_SIZE = 200;

/** Thumbnails generated at once, so a vault of photos is not decoded together. */
const THUMBNAIL_CONCURRENCY = 2;

const EXTERNAL_URL = /^https?:\/\//i;

/** An external image that has not answered by now is treated as unreachable. */
const EXTERNAL_FETCH_TIMEOUT_MS = 8_000;

/**
 * How long an unreachable external image is left alone. Long enough that a
 * graph re-sync does not retry every blocked image, short enough that an image
 * that was only briefly down is tried again.
 */
const EXTERNAL_FAILURE_TTL_MS = 5 * 60_000;

/**
 * How long an external image that could not be loaded at all is left alone
 * across sessions. A host that answers 404 without CORS headers never shows us
 * the status, so the link cannot be called dead (and is never deleted), but
 * asking again on every load only adds a console error each time. A link that
 * was merely down is tried again after this.
 */
const UNREACHABLE_TTL_MS = 24 * 60 * 60_000;

/**
 * How long a host that serves images but sends no CORS headers is remembered
 * across sessions. The CORS fetch for such a host can never succeed (and so a
 * thumbnail can never be made), but it fails with a console error for every
 * image on every load. A host that later adds CORS is noticed after this.
 */
const NO_CORS_HOST_TTL_MS = 7 * 24 * 60 * 60_000;

/**
 * Whether the browser can load a URL as a plain image, which needs no CORS
 * headers. `unknown` when it cannot be told (no browser, or it took too long).
 */
export type ImageProbe = (
  url: string,
) => Promise<"loaded" | "failed" | "unknown">;

const probeImageLoad: ImageProbe = (url) =>
  new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve("unknown");
    const image = new Image();
    const finish = (result: "loaded" | "failed" | "unknown") => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };
    const timer = setTimeout(
      () => finish("unknown"),
      EXTERNAL_FETCH_TIMEOUT_MS,
    );
    image.onload = () => finish("loaded");
    image.onerror = () => finish("failed");
    image.src = url;
  });

/** Cache-key namespace for thumbnail URLs, distinct from their originals. */
const thumbnailKey = (path: string) => `thumbnail:${path}`;

/** File name an external image is cached under in `.cache/external_images`. */
async function externalCacheName(url: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(url),
  );
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hash}.cache`;
}

/**
 * The name external images were cached under before names were hashed. Still
 * read so existing caches survive: for an expired link (Discord attachment
 * URLs expire) or a deleted image, the cached copy is the only one left.
 */
function legacyExternalCacheName(url: string): string {
  return (
    url
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .slice(-100) + ".cache"
  );
}

export class AssetManager {
  private urlCache = new Map<string, { url: string; refs: number }>();
  private resolving = new Map<string, Promise<string>>();
  private activeThumbnails = 0;
  private generation = 0;
  private prunedVaults = new Set<string>();
  private pruneTimer?: ReturnType<typeof setTimeout>;
  private localThumbnails: LocalThumbnailCache;
  private thumbnailWaiters: (() => void)[] = [];
  /**
   * When each unreachable external image last failed, by URL. `opaque` marks a
   * failure whose status was hidden from us (a network or CORS error), as
   * opposed to a timeout or an HTTP error we could read.
   */
  private failedExternal = new Map<
    string,
    {
      at: number;
      opaque: boolean;
      /** What loading it as a plain image showed, once that was asked. */
      probe?: "loaded" | "failed" | "unknown";
    }
  >();
  /** Hosts known to serve images without CORS headers, and when they were learned. */
  private corslessHosts = new Map<string, number>();
  /** Hosts whose marker has already been looked for on disk this session. */
  private corslessChecked = new Set<string>();
  /**
   * The first attempt at each host, so a batch of images from one host waits for
   * that one attempt to say whether the host allows CORS instead of every image
   * failing on its own.
   */
  private hostScouts = new Map<string, Promise<void>>();
  /**
   * When each URL was marked unreachable, so the marker is read from disk once.
   * Held with its time, not as a bare set, so it expires with the same
   * 24 hours as the marker file; reset by `clear()` like the other state.
   */
  private unreachableThisSession = new Map<string, number>();
  /** URLs confirmed to be permanently missing (404/410). */
  private deadExternal = new Set<string>();

  constructor(
    private ioAdapter: IAssetIOAdapter,
    private imageProcessor: IImageProcessor,
    // Injected for tests; default wraps the global `fetch` lazily.
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
    private clock: Clock = systemClock,
    private onDeadExternalImage?: (url: string) => void,
    // Injected for tests; the default asks the browser to load the image.
    private probeImage: ImageProbe = probeImageLoad,
  ) {
    this.localThumbnails = new LocalThumbnailCache(
      ioAdapter,
      imageProcessor,
      () => this.resolving.size === 0,
    );
  }

  setOnDeadExternalImage(handler: ((url: string) => void) | undefined) {
    this.onDeadExternalImage = handler;
  }

  isDeadExternal(url: string): boolean {
    return this.deadExternal.has(url);
  }

  async saveImageToVault(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    blob: Blob,
    entityId: string,
    originalName?: string,
  ): Promise<{ image: string; thumbnail: string }> {
    if (!vaultHandle) throw new Error("Vault not open");

    const timestamp = this.clock.now();
    const baseName = originalName
      ? originalName.replace(/\.[^/.]+$/, "")
      : `img_${entityId}_${timestamp}`;
    const filename = `${baseName}.webp`;
    const thumbFilename = `${baseName}_thumb.webp`;

    // Convert original image to WebP and save
    const webpBlob = await this.imageProcessor.convertToWebP(blob);
    await this.ioAdapter.writeOpfsFile(
      ["images", filename],
      webpBlob,
      vaultHandle,
      vaultHandle.name,
    );

    // Generate and save thumbnail
    const thumbnailBlob = await this.imageProcessor.generateThumbnail(
      blob,
      200,
    );
    await this.ioAdapter.writeOpfsFile(
      ["images", thumbFilename],
      thumbnailBlob,
      vaultHandle,
      vaultHandle.name,
    );

    return {
      image: `images/${filename}`,
      thumbnail: `images/${thumbFilename}`,
    };
  }

  resolveImageUrl(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    path: string,
    fileFetcher?: (path: string) => Promise<Blob>,
    fallbackHandle?: FileSystemDirectoryHandle,
  ): Promise<string> {
    if (!path) return Promise.resolve("");
    const cleanPath = path.trim();

    // 1. Data URI or existing Blob URL
    if (/^(data:|blob:)/i.test(cleanPath)) {
      return Promise.resolve(cleanPath);
    }

    // Check if already resolving this path
    const ongoing = this.resolving.get(cleanPath);
    if (ongoing) {
      return ongoing;
    }

    // Ref-counting cache check
    const existing = this.urlCache.get(cleanPath);
    if (existing) {
      existing.refs++;
      return Promise.resolve(existing.url);
    }

    // Start resolution and track it
    const resolutionPromise = (async () => {
      try {
        let url = "";

        // 2. External URL caching
        if (/^https?:\/\//i.test(cleanPath)) {
          if (this.deadExternal.has(cleanPath)) return "";

          // If no vault handle, we can't persistent-cache it, but we should still
          // try to resolve to a blob URL to satisfy CORS requirements for canvas.
          if (!vaultHandle) {
            try {
              const blob = await this.fetchExternal(cleanPath);
              if (!blob) {
                if (this.deadExternal.has(cleanPath)) return "";
                return cleanPath;
              }
              url = URL.createObjectURL(blob);
              this.urlCache.set(cleanPath, { url, refs: 1 });
              return url;
            } catch {
              if (this.deadExternal.has(cleanPath)) return "";
              return cleanPath;
            }
          }

          const blob = await this.readOrFetchExternal(vaultHandle, cleanPath);
          if (!blob) {
            if (this.deadExternal.has(cleanPath)) return "";
            return cleanPath;
          }
          url = URL.createObjectURL(blob);
        } else if (fileFetcher) {
          // 3. P2P / Guest Mode remote fetcher
          try {
            const blob = await fileFetcher(cleanPath);
            url = URL.createObjectURL(blob);
          } catch {
            return "";
          }
        } else if (vaultHandle || fallbackHandle) {
          // 4. Local Vault File (with fallback to Local FS for synced vaults)
          try {
            const segments = cleanPath
              .replace(/^(\.\/|\/)/, "")
              .split("/")
              .filter((s) => s && s !== ".");

            let blob: Blob | undefined;

            // Try primary storage (OPFS)
            if (vaultHandle) {
              try {
                blob = await this.ioAdapter.readOpfsBlob(segments, vaultHandle);
              } catch (err) {
                // If not found and we have a fallback, keep going
                if (!fallbackHandle) throw err;
              }
            }

            // Try fallback storage (Local FS)
            if (!blob && fallbackHandle) {
              blob = await this.ioAdapter.readOpfsBlob(
                segments,
                fallbackHandle,
              );
            }

            if (blob) {
              url = URL.createObjectURL(blob);
            }
          } catch (err: any) {
            // Gracefully handle "Not Found" errors from the File System API.
            if (this.ioAdapter.isNotFoundError(err)) {
              return "";
            }
            return "";
          }
        }

        if (url && url.startsWith("blob:")) {
          // Double check cache in case another resolution finished while we were async
          const inCache = this.urlCache.get(cleanPath);
          if (inCache) {
            URL.revokeObjectURL(url); // Clean up our redundant URL
            inCache.refs++;
            return inCache.url;
          }
          this.urlCache.set(cleanPath, { url, refs: 1 });
        }

        if (this.deadExternal.has(cleanPath)) return "";
        return url || cleanPath;
      } finally {
        this.resolving.delete(cleanPath);
      }
    })();

    this.resolving.set(cleanPath, resolutionPromise);
    return resolutionPromise;
  }

  /**
   * A graph-sized version of an image.
   *
   * Uploaded thumbnails resolve directly. Other local images get a persistent
   * derived thumbnail keyed by source revision. Imported entities usually point at external images and
   * set `thumbnail` to the same full-size URL; painting those at tens of pixels
   * cost seconds per graph redraw. For them a thumbnail is generated once, with
   * the same generator uploads use, and cached beside the cached original.
   * Anything that cannot be read (no CORS, fetch failure) falls back to the
   * normal resolution.
   */
  resolveThumbnailUrl(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    path: string,
    fileFetcher?: (path: string) => Promise<Blob>,
    fallbackHandle?: FileSystemDirectoryHandle,
  ): Promise<string> {
    const cleanPath = (path ?? "").trim();
    if (!vaultHandle || this.useOriginalThumbnail(cleanPath, fileFetcher)) {
      return this.resolveImageUrl(
        vaultHandle,
        cleanPath,
        fileFetcher,
        fallbackHandle,
      );
    }
    if (this.deadExternal.has(cleanPath)) {
      return Promise.resolve("");
    }
    const key = thumbnailKey(cleanPath);
    const ongoing = this.resolving.get(key);
    if (ongoing) return ongoing;
    const existing = this.urlCache.get(key);
    if (existing) {
      existing.refs++;
      return Promise.resolve(existing.url);
    }

    const generation = this.generation;
    const resolution = (async () => {
      try {
        if (this.deadExternal.has(cleanPath)) return "";
        if (EXTERNAL_URL.test(cleanPath)) this.schedulePrune(vaultHandle);
        const thumbnail = EXTERNAL_URL.test(cleanPath)
          ? await this.readOrCreateExternalThumbnail(vaultHandle, cleanPath)
          : await this.localThumbnails
              .resolve(vaultHandle, cleanPath, fallbackHandle)
              .catch(() => null);
        if (generation !== this.generation) return "";
        if (!thumbnail) {
          return this.resolveThumbnailFallback(
            vaultHandle,
            cleanPath,
            fileFetcher,
            fallbackHandle,
          );
        }
        const url = URL.createObjectURL(thumbnail);
        this.urlCache.set(key, { url, refs: 1 });
        return url;
      } finally {
        if (generation === this.generation) this.resolving.delete(key);
      }
    })();
    this.resolving.set(key, resolution);
    return resolution;
  }

  private useOriginalThumbnail(
    path: string,
    fetcher?: (path: string) => Promise<Blob>,
  ) {
    return (
      !path ||
      /^(data:|blob:)/i.test(path) ||
      /_thumb\.webp$/i.test(path) ||
      Boolean(fetcher)
    );
  }

  private async resolveThumbnailFallback(
    root: FileSystemDirectoryHandle,
    path: string,
    fetcher?: (path: string) => Promise<Blob>,
    fallback?: FileSystemDirectoryHandle,
  ): Promise<string> {
    if (
      !EXTERNAL_URL.test(path) ||
      this.deadExternal.has(path) ||
      this.isFreshInSession(path)
    )
      return "";
    if (this.cannotBeLoadedAtAll(path)) {
      await this.markUnreachable(root, path);
      return "";
    }
    return this.resolveImageUrl(root, path, fetcher, fallback);
  }

  /**
   * Copies an external image into the vault as if it had been uploaded —
   * WebP plus a `_thumb` — so the entity no longer depends on the remote host
   * and dense views get a real thumbnail. Reuses the cached copy when the image
   * was already fetched. Returns `null` when it cannot be read (no CORS, gone).
   */
  async importExternalImage(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    url: string,
    entityId: string,
  ): Promise<{ image: string; thumbnail: string } | null> {
    const cleanUrl = url.trim();
    if (!vaultHandle || !EXTERNAL_URL.test(cleanUrl)) return null;
    const blob = await this.readOrFetchExternal(vaultHandle, cleanUrl);
    if (!blob) return null;
    try {
      return await this.saveImageToVault(vaultHandle, blob, entityId);
    } catch {
      return null;
    }
  }

  /** Releases a URL from `resolveThumbnailUrl`, whichever form it resolved to. */
  releaseThumbnailUrl(path: string) {
    const cleanPath = path.trim();
    this.releaseImageUrl(
      this.urlCache.has(thumbnailKey(cleanPath))
        ? thumbnailKey(cleanPath)
        : cleanPath,
    );
  }

  private async externalDir(vaultHandle: FileSystemDirectoryHandle) {
    const cacheDir = await this.ioAdapter.getDirectoryHandle(
      vaultHandle,
      [".cache"],
      true,
    );
    return this.ioAdapter.getDirectoryHandle(
      cacheDir,
      ["external_images"],
      true,
    );
  }

  private hasRecentFailure(url: string): boolean {
    const failure = this.failedExternal.get(url);
    if (failure === undefined) return false;
    if (this.clock.now() - failure.at < EXTERNAL_FAILURE_TTL_MS) return true;
    this.failedExternal.delete(url);
    return false;
  }

  /**
   * Fetches an external image, or `null` when it cannot be had. A failure
   * (blocked by CORS, gone, too slow) is remembered for a while, so a graph
   * with hundreds of dead links does not retry each on every load.
   */
  private async fetchExternal(
    url: string,
    vaultHandle?: FileSystemDirectoryHandle,
  ): Promise<Blob | null> {
    if (this.deadExternal.has(url) || this.hasRecentFailure(url)) return null;
    try {
      const response = await this.fetcher(url, {
        mode: "cors",
        signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.noteDeadStatus(url, response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      await this.recordFailure(url, error, vaultHandle);
      return null;
    }
  }

  /** A 404 or 410 means the image is gone for good, not just unreachable. */
  private noteDeadStatus(url: string, status: number): void {
    if (status !== 404 && status !== 410) return;
    this.deadExternal.add(url);
    this.onDeadExternalImage?.(url);
  }

  /**
   * Remembers a failed fetch. A TypeError is how fetch reports a network or
   * CORS failure, where the response (and so any 404) is hidden from us; for
   * those the browser is asked, once and here, whether it can load the image
   * plainly, so everything that follows (the host verdict, and showing nothing)
   * rests on the same attempt.
   */
  private async recordFailure(
    url: string,
    error: unknown,
    vaultHandle?: FileSystemDirectoryHandle,
  ): Promise<void> {
    const failure: NonNullable<ReturnType<typeof this.failedExternal.get>> = {
      at: this.clock.now(),
      opaque: error instanceof TypeError,
    };
    this.failedExternal.set(url, failure);
    if (!failure.opaque || !vaultHandle) return;
    failure.probe = await this.probeImage(url);
    if (failure.probe === "loaded") {
      await this.markHostWithoutCors(vaultHandle, url);
    }
  }

  private async unreachableMarkerName(url: string): Promise<string> {
    return (await externalCacheName(url)).replace(/\.cache$/, ".unreachable");
  }

  /** Whether an earlier session found this link unreachable, recently. */
  private async isMarkedUnreachable(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<boolean> {
    if (this.isFreshInSession(url)) return true;
    try {
      const marker = await this.ioAdapter.readOpfsBlob(
        [await this.unreachableMarkerName(url)],
        await this.externalDir(vaultHandle),
      );
      const markedAt = Number(await marker.text());
      if (!this.isFreshMarkerTime(markedAt)) return false;
      this.unreachableThisSession.set(url, markedAt);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Whether a marker time still counts: a real time, not in the future, less
   * than a day old. A time ahead of now (a damaged file, or the clock having
   * gone backwards) gives a negative age that would otherwise look fresh and
   * suppress the link far beyond the day.
   */
  private isFreshMarkerTime(
    markedAt: number,
    ttl: number = UNREACHABLE_TTL_MS,
  ): boolean {
    if (!Number.isFinite(markedAt)) return false;
    const age = this.clock.now() - markedAt;
    return age >= 0 && age < ttl;
  }

  /** Marked unreachable earlier in this session and still within the day. */
  private isFreshInSession(url: string): boolean {
    const markedAt = this.unreachableThisSession.get(url);
    if (markedAt === undefined) return false;
    if (this.isFreshMarkerTime(markedAt)) return true;
    this.unreachableThisSession.delete(url);
    return false;
  }

  private async markUnreachable(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<void> {
    this.unreachableThisSession.set(url, this.clock.now());
    await this.ioAdapter
      .writeOpfsFile(
        [".cache", "external_images", await this.unreachableMarkerName(url)],
        String(this.clock.now()),
        vaultHandle,
        vaultHandle.name,
      )
      .catch(() => {});
  }

  /**
   * For a link whose CORS fetch failed without a readable status: true when the
   * browser could not load it as a plain image either. The graph would
   * otherwise hand it to Cytoscape, which requests it again, logs a 404, and
   * does so on every load. The browser is asked once, when the fetch fails.
   */
  private cannotBeLoadedAtAll(url: string): boolean {
    return this.failedExternal.get(url)?.probe === "failed";
  }

  private hostOf(url: string): string | null {
    try {
      return new URL(url).host.toLowerCase() || null;
    } catch {
      return null;
    }
  }

  private async noCorsMarkerName(host: string): Promise<string> {
    return (await externalCacheName(`host:${host}`)).replace(
      /\.cache$/,
      ".nocors",
    );
  }

  /** Whether this link's host is known to serve images without CORS headers. */
  private async isHostWithoutCors(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<boolean> {
    const host = this.hostOf(url);
    if (!host) return false;
    const learned = this.corslessHosts.get(host);
    if (learned !== undefined) {
      if (this.isFreshMarkerTime(learned, NO_CORS_HOST_TTL_MS)) return true;
      this.corslessHosts.delete(host);
    }
    if (this.corslessChecked.has(host)) return false;
    this.corslessChecked.add(host);
    try {
      const marker = await this.ioAdapter.readOpfsBlob(
        [await this.noCorsMarkerName(host)],
        await this.externalDir(vaultHandle),
      );
      const markedAt = Number(await marker.text());
      if (!this.isFreshMarkerTime(markedAt, NO_CORS_HOST_TTL_MS)) return false;
      this.corslessHosts.set(host, markedAt);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * A CORS fetch failed opaquely, yet the browser can load the image plainly:
   * the host serves images and sends no CORS headers. Remember that, so the
   * fetch that can never succeed is not made for every other image.
   */
  private async markHostWithoutCors(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<void> {
    const host = this.hostOf(url);
    if (!host) return;
    const now = this.clock.now();
    this.corslessHosts.set(host, now);
    this.corslessChecked.add(host);
    await this.ioAdapter
      .writeOpfsFile(
        [".cache", "external_images", await this.noCorsMarkerName(host)],
        String(now),
        vaultHandle,
        vaultHandle.name,
      )
      .catch(() => {});
  }

  /**
   * Fetches from the network, letting the first image from each host find out
   * whether the host allows CORS before the rest try. A host known to refuse it
   * is not asked at all: the fetch could only fail, and log, for every image.
   */
  private async fetchFromHost(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<Blob | null> {
    const host = this.hostOf(url);
    if (!host) return this.fetchExternal(url, vaultHandle);

    const scout = this.hostScouts.get(host);
    if (scout) {
      await scout;
      if (await this.isHostWithoutCors(vaultHandle, url)) return null;
      return this.fetchExternal(url, vaultHandle);
    }

    // Become the scout before any await, so an image that arrives while this
    // one is still reading the marker from disk waits instead of also trying.
    let finished!: () => void;
    this.hostScouts.set(
      host,
      new Promise<void>((resolve) => (finished = resolve)),
    );
    try {
      if (await this.isHostWithoutCors(vaultHandle, url)) return null;
      return await this.fetchExternal(url, vaultHandle);
    } finally {
      finished();
    }
  }

  /** The cached copy of an external image, fetching and caching it if needed. */
  private async readOrFetchExternal(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<Blob | null> {
    try {
      const name = await externalCacheName(url);
      const dir = await this.externalDir(vaultHandle);
      try {
        return await this.ioAdapter.readOpfsBlob([name], dir);
      } catch {
        const legacy = await this.migrateLegacyExternal(vaultHandle, url, name);
        if (legacy) return legacy;
        // Cached copies win over the markers; only the network is skipped.
        if (await this.isMarkedUnreachable(vaultHandle, url)) return null;
        const blob = await this.fetchFromHost(vaultHandle, url);
        if (!blob) return null;
        await this.ioAdapter.writeOpfsFile(
          [".cache", "external_images", name],
          blob,
          vaultHandle,
          vaultHandle.name,
        );
        return blob;
      }
    } catch {
      return null;
    }
  }

  /**
   * Adopts a copy cached under the legacy name: returns it and writes it under
   * the hashed name so later reads are direct. The legacy file is left as is —
   * two URLs differing only in case could share it.
   */
  private async migrateLegacyExternal(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
    name: string,
  ): Promise<Blob | null> {
    let blob: Blob;
    try {
      blob = await this.ioAdapter.readOpfsBlob(
        [legacyExternalCacheName(url)],
        await this.externalDir(vaultHandle),
      );
    } catch {
      return null;
    }
    await this.ioAdapter
      .writeOpfsFile(
        [".cache", "external_images", name],
        blob,
        vaultHandle,
        vaultHandle.name,
      )
      .catch(() => {});
    return blob;
  }

  private async readOrCreateExternalThumbnail(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<Blob | null> {
    const name = (await externalCacheName(url)).replace(
      /\.cache$/,
      ".thumb.webp",
    );
    try {
      return await this.ioAdapter.readOpfsBlob(
        [name],
        await this.externalDir(vaultHandle),
      );
    } catch {
      // Not generated yet.
    }
    const original = await this.readOrFetchExternal(vaultHandle, url);
    if (!original) return null;
    try {
      const thumbnail = await this.withThumbnailSlot(() =>
        this.imageProcessor.generateThumbnail(original, THUMBNAIL_SIZE),
      );
      await this.ioAdapter.writeOpfsFile(
        [".cache", "external_images", name],
        thumbnail,
        vaultHandle,
        vaultHandle.name,
      );
      // The graph only ever reads the thumbnail. Keeping the full-size copy
      // cost hundreds of MB; a full-size view fetches and caches it again.
      await this.dropOriginal(
        vaultHandle,
        name.replace(/\.thumb\.webp$/, ".cache"),
      );
      return thumbnail;
    } catch {
      return null;
    }
  }

  private async dropOriginal(
    vaultHandle: FileSystemDirectoryHandle,
    originalName: string,
  ): Promise<void> {
    await this.ioAdapter
      .deleteFile?.(
        [".cache", "external_images", originalName],
        vaultHandle,
        vaultHandle.name,
      )
      .catch(() => {});
  }

  /**
   * Once per session and vault, removes full-size copies that already have a
   * thumbnail (cached by versions that kept both). Runs after image loading
   * settles so it never competes with it.
   */
  private schedulePrune(vaultHandle: FileSystemDirectoryHandle) {
    if (!this.ioAdapter.deleteFile || this.prunedVaults.has(vaultHandle.name))
      return;
    this.prunedVaults.add(vaultHandle.name);
    const attempt = () => {
      if (this.resolving.size > 0) {
        this.pruneTimer = setTimeout(attempt, 2000);
        return;
      }
      this.pruneTimer = undefined;
      void this.pruneExternalOriginals(vaultHandle).catch(() => {});
    };
    this.pruneTimer = setTimeout(attempt, 2000);
  }

  private async pruneExternalOriginals(vaultHandle: FileSystemDirectoryHandle) {
    const generation = this.generation;
    const dir = await this.externalDir(vaultHandle);
    const names = new Set<string>();
    for await (const [name] of (dir as any).entries() as AsyncIterable<
      [string, unknown]
    >) {
      names.add(name);
    }
    let removed = 0;
    for (const name of names) {
      if (generation !== this.generation) return;
      const match = /^([0-9a-f]{64})\.cache$/.exec(name);
      if (!match || !names.has(`${match[1]}.thumb.webp`)) continue;
      await this.dropOriginal(vaultHandle, name);
      // Yield so a long sweep never blocks painting.
      if (++removed % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }
  }

  private async withThumbnailSlot<T>(task: () => Promise<T>): Promise<T> {
    while (this.activeThumbnails >= THUMBNAIL_CONCURRENCY) {
      await new Promise<void>((resolve) => this.thumbnailWaiters.push(resolve));
    }
    this.activeThumbnails++;
    try {
      return await task();
    } finally {
      this.activeThumbnails--;
      this.thumbnailWaiters.shift()?.();
    }
  }

  releaseImageUrl(path: string) {
    const cleanPath = path.trim();
    const entry = this.urlCache.get(cleanPath);
    if (!entry) return;

    entry.refs--;
    if (entry.refs <= 0) {
      URL.revokeObjectURL(entry.url);
      this.urlCache.delete(cleanPath);
    }
  }

  clear() {
    this.generation++;
    if (this.pruneTimer !== undefined) clearTimeout(this.pruneTimer);
    this.pruneTimer = undefined;
    this.prunedVaults.clear();
    this.localThumbnails.clear();
    this.urlCache.forEach((entry) => {
      URL.revokeObjectURL(entry.url);
    });
    this.urlCache.clear();
    this.resolving.clear();
    this.failedExternal.clear();
    this.corslessHosts.clear();
    this.corslessChecked.clear();
    this.hostScouts.clear();
    this.deadExternal.clear();
    this.unreachableThisSession.clear();
  }

  /**
   * Ensures that an asset (image/thumbnail) at the given path is physically present
   * in the specified vault's OPFS. If missing, it attempts to resolve it (fetching
   * from source if needed) and writes it to the vault.
   */
  async ensureAssetPersisted(
    path: string,
    vaultHandle: FileSystemDirectoryHandle,
    fileFetcher?: (path: string) => Promise<Blob>,
    fallbackHandle?: FileSystemDirectoryHandle,
  ) {
    if (!path) return;
    const cleanPath = path.trim();
    if (/^(data:|blob:|https?:)/i.test(cleanPath)) return;

    const segments = cleanPath
      .replace(/^(\.\/|\/)/, "")
      .split("/")
      .filter((s) => s && s !== ".");

    // 1. Check if it already exists in OPFS
    try {
      await this.ioAdapter.readOpfsBlob(segments, vaultHandle);
      // If no error, it's already there.
      return;
    } catch {
      // 2. Not in OPFS, resolve it to get a Blob (or at least a source path)
      const source = await this.resolveImageUrl(
        undefined,
        cleanPath,
        fileFetcher,
        fallbackHandle,
      );

      let blob: Blob | undefined;

      if (source && source.startsWith("blob:")) {
        try {
          const response = await this.fetcher(source);
          blob = await response.blob();
        } catch (err) {
          console.warn(
            `[AssetManager] Failed to fetch blob from ${source}`,
            err,
          );
        }
      } else if (source && !source.startsWith("http") && fileFetcher) {
        // Source is a relative path (common in demo mode)
        try {
          blob = await fileFetcher(source);
        } catch (err) {
          console.warn(
            `[AssetManager] Failed to fetch via fileFetcher: ${source}`,
            err,
          );
        }
      }

      if (blob) {
        // 3. Write to this vault
        await this.ioAdapter.writeOpfsFile(
          segments,
          blob,
          vaultHandle,
          vaultHandle.name,
        );
        console.log(`[AssetManager] Migrated asset to vault: ${cleanPath}`);
      }
    }
  }
}
