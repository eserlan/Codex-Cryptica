import { LocalThumbnailCache } from "./local-thumbnail";
import { type Clock, systemClock } from "./runtime";

export type {
  IAssetIOAdapter,
  IImageProcessor,
  ImageProbe,
} from "./asset-types";
import type {
  IAssetIOAdapter,
  IImageProcessor,
  ImageProbe,
} from "./asset-types";
import { AssetStorage } from "./asset-storage";
import { ExternalImageFiles } from "./external-image-files";
import { ExternalImageNetwork } from "./external-image-network";
import { ExternalImageCache } from "./external-image-cache";
import { AssetUrlCache } from "./asset-url-cache";

const EXTERNAL_URL = /^https?:\/\//i;
/** Cache-key namespace for thumbnail URLs, distinct from their originals. */
const thumbnailKey = (path: string) => `thumbnail:${path}`;

/** Composes vault storage, image caches, and URL resolution for asset consumers. */
export class AssetManager {
  private urlCache = new AssetUrlCache();
  private resolving = new Map<string, Promise<string>>();
  private generation = 0;
  private localThumbnails: LocalThumbnailCache;
  private storage: AssetStorage;
  private network: ExternalImageNetwork;
  private externalImages: ExternalImageCache;

  constructor(
    private ioAdapter: IAssetIOAdapter,
    imageProcessor: IImageProcessor,
    fetcher: typeof fetch = (input, init) => fetch(input, init),
    clock: Clock = systemClock,
    onDeadExternalImage?: (url: string) => void,
    probeImage?: ImageProbe,
  ) {
    this.storage = new AssetStorage(ioAdapter, imageProcessor, fetcher, clock);
    const files = new ExternalImageFiles(ioAdapter);
    this.network = new ExternalImageNetwork(
      files,
      fetcher,
      clock,
      onDeadExternalImage,
      probeImage,
    );
    const isIdle = () => this.resolving.size === 0;
    this.externalImages = new ExternalImageCache(
      files,
      this.network,
      imageProcessor,
      isIdle,
    );
    this.localThumbnails = new LocalThumbnailCache(
      ioAdapter,
      imageProcessor,
      isIdle,
    );
  }

  get pruneDelayMs(): number {
    return this.externalImages.pruneDelayMs;
  }
  set pruneDelayMs(delay: number) {
    this.externalImages.pruneDelayMs = delay;
  }

  setOnDeadExternalImage(handler: ((url: string) => void) | undefined) {
    this.network.setOnDeadExternalImage(handler);
  }

  isDeadExternal(url: string): boolean {
    return this.network.isDeadExternal(url);
  }

  saveImageToVault(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    blob: Blob,
    entityId: string,
    originalName?: string,
  ): Promise<{ image: string; thumbnail: string }> {
    return this.storage.saveImageToVault(
      vaultHandle,
      blob,
      entityId,
      originalName,
    );
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
    const existing = this.urlCache.retain(cleanPath);
    if (existing !== undefined) return Promise.resolve(existing);

    const resolution = this.resolveUncachedImage(
      vaultHandle,
      cleanPath,
      fileFetcher,
      fallbackHandle,
    ).finally(() => this.resolving.delete(cleanPath));
    this.resolving.set(cleanPath, resolution);
    return resolution;
  }

  private async resolveUncachedImage(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    path: string,
    fileFetcher?: (path: string) => Promise<Blob>,
    fallbackHandle?: FileSystemDirectoryHandle,
  ): Promise<string> {
    if (EXTERNAL_URL.test(path))
      return this.resolveExternalImage(vaultHandle, path);
    const url = await this.resolveLocalImage(
      vaultHandle,
      path,
      fileFetcher,
      fallbackHandle,
    );
    if (url === undefined) return "";
    return this.cacheResolvedImage(path, url);
  }

  private async resolveExternalImage(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    path: string,
  ): Promise<string> {
    if (this.network.isDeadExternal(path)) return "";
    if (!vaultHandle) return this.resolveTransientExternal(path);
    const blob = await this.externalImages.readOrFetchExternal(
      vaultHandle,
      path,
    );
    if (!blob) return this.externalFallback(path);
    return this.cacheResolvedImage(path, URL.createObjectURL(blob));
  }

  private async resolveTransientExternal(path: string): Promise<string> {
    try {
      const blob = await this.network.fetchExternal(path);
      if (!blob) return this.externalFallback(path);
      return this.urlCache.publish(path, URL.createObjectURL(blob));
    } catch {
      return this.externalFallback(path);
    }
  }

  private cacheResolvedImage(path: string, url: string): string {
    if (url && url.startsWith("blob:")) {
      const cached = this.urlCache.reuse(path, url);
      if (cached !== undefined) return cached;
      this.urlCache.publish(path, url);
    }
    if (this.network.isDeadExternal(path)) return "";
    return url || path;
  }

  private externalFallback(path: string): string {
    return this.network.isDeadExternal(path) ? "" : path;
  }

  private async resolveLocalImage(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    path: string,
    fileFetcher?: (path: string) => Promise<Blob>,
    fallbackHandle?: FileSystemDirectoryHandle,
  ): Promise<string | undefined> {
    if (fileFetcher) {
      try {
        return URL.createObjectURL(await fileFetcher(path));
      } catch {
        return undefined;
      }
    }
    if (!vaultHandle && !fallbackHandle) return "";
    try {
      const blob = await this.storage.readLocal(
        path,
        vaultHandle,
        fallbackHandle,
      );
      return blob ? URL.createObjectURL(blob) : "";
    } catch (error) {
      // Preserve the adapter's classification of local file errors.
      this.ioAdapter.isNotFoundError(error);
      return undefined;
    }
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
    if (this.network.isDeadExternal(cleanPath)) {
      return Promise.resolve("");
    }
    const key = thumbnailKey(cleanPath);
    const ongoing = this.resolving.get(key);
    if (ongoing) return ongoing;
    const existing = this.urlCache.retain(key);
    if (existing !== undefined) return Promise.resolve(existing);

    const generation = this.generation;
    const resolution = (async () => {
      try {
        if (this.network.isDeadExternal(cleanPath)) return "";
        if (EXTERNAL_URL.test(cleanPath))
          this.externalImages.schedulePrune(vaultHandle);
        const thumbnail = EXTERNAL_URL.test(cleanPath)
          ? await this.externalImages.readOrCreateExternalThumbnail(
              vaultHandle,
              cleanPath,
            )
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
        return this.urlCache.publish(key, url);
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
      this.network.isDeadExternal(path) ||
      this.network.isFreshInSession(path)
    )
      return "";
    if (this.network.cannotBeLoadedAtAll(path)) {
      await this.network.markUnreachable(root, path);
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
    const blob = await this.externalImages.readOrFetchExternal(
      vaultHandle,
      cleanUrl,
    );
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

  releaseImageUrl(path: string) {
    this.urlCache.release(path.trim());
  }

  clear() {
    this.generation++;
    this.externalImages.clear();
    this.localThumbnails.clear();
    this.urlCache.clear();
    this.resolving.clear();
    this.network.clear();
  }

  /**
   * Ensures that an asset (image/thumbnail) at the given path is physically present
   * in the specified vault's OPFS. If missing, it attempts to resolve it (fetching
   * from source if needed) and writes it to the vault.
   */
  ensureAssetPersisted(
    path: string,
    vaultHandle: FileSystemDirectoryHandle,
    fileFetcher?: (path: string) => Promise<Blob>,
    fallbackHandle?: FileSystemDirectoryHandle,
  ) {
    return this.storage.ensureAssetPersisted(
      path,
      vaultHandle,
      (cleanPath) =>
        this.resolveImageUrl(undefined, cleanPath, fileFetcher, fallbackHandle),
      fileFetcher,
    );
  }
}
