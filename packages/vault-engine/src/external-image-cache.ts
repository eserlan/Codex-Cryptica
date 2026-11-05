import type { IImageProcessor } from "./asset-types";
import {
  ExternalImageFiles,
  externalCacheName,
  legacyExternalCacheName,
} from "./external-image-files";
import { ExternalImageNetwork } from "./external-image-network";

/** Persistent external originals, derived thumbnails, and deferred pruning. */
export class ExternalImageCache {
  private activeThumbnails = 0;
  private thumbnailWaiters: (() => void)[] = [];
  private generation = 0;
  private prunedVaults = new Set<string>();
  /** How long the original-copy sweep waits for image loading to settle. */
  pruneDelayMs = 2000;
  private pruneTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private files: ExternalImageFiles,
    private network: ExternalImageNetwork,
    private imageProcessor: IImageProcessor,
    private canPrune: () => boolean,
  ) {}

  async readOrFetchExternal(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<Blob | null> {
    try {
      const name = await externalCacheName(url);
      // Directory failures stop resolution; only a missing file tries migration.
      const directory = await this.files.directory(vaultHandle);
      try {
        return await this.files.readFrom(directory, name);
      } catch {
        const legacy = await this.migrateLegacyExternal(vaultHandle, url, name);
        if (legacy) return legacy;
        // Cached copies win over the markers; only the network is skipped.
        if (await this.network.isMarkedUnreachable(vaultHandle, url))
          return null;
        const blob = await this.network.fetchFromHost(vaultHandle, url);
        if (!blob) return null;
        await this.files.write(vaultHandle, name, blob);
        return blob;
      }
    } catch {
      return null;
    }
  }

  private async migrateLegacyExternal(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
    name: string,
  ): Promise<Blob | null> {
    let blob: Blob;
    try {
      blob = await this.files.read(vaultHandle, legacyExternalCacheName(url));
    } catch {
      return null;
    }
    await this.files.write(vaultHandle, name, blob).catch(() => {});
    return blob;
  }

  async readOrCreateExternalThumbnail(
    vaultHandle: FileSystemDirectoryHandle,
    url: string,
  ): Promise<Blob | null> {
    const name = (await externalCacheName(url)).replace(
      /\.cache$/,
      ".thumb.webp",
    );
    try {
      return await this.files.read(vaultHandle, name);
    } catch {
      // Not generated yet.
    }
    const original = await this.readOrFetchExternal(vaultHandle, url);
    if (!original) return null;
    try {
      const thumbnail = await this.withThumbnailSlot(() =>
        this.imageProcessor.generateThumbnail(original, 200),
      );
      await this.files.write(vaultHandle, name, thumbnail);
      // The graph only ever reads the thumbnail. Keeping the full-size copy
      // cost hundreds of MB; a full-size view fetches and caches it again.
      await this.files.dropOriginal(
        vaultHandle,
        name.replace(/\.thumb\.webp$/, ".cache"),
      );
      return thumbnail;
    } catch {
      return null;
    }
  }

  schedulePrune(vaultHandle: FileSystemDirectoryHandle) {
    if (!this.files.canDelete || this.prunedVaults.has(vaultHandle.name))
      return;
    this.prunedVaults.add(vaultHandle.name);
    const attempt = () => {
      if (!this.canPrune()) {
        this.pruneTimer = setTimeout(attempt, this.pruneDelayMs);
        return;
      }
      this.pruneTimer = undefined;
      void this.pruneExternalOriginals(vaultHandle).catch(() => {});
    };
    this.pruneTimer = setTimeout(attempt, this.pruneDelayMs);
  }

  private async pruneExternalOriginals(vaultHandle: FileSystemDirectoryHandle) {
    const generation = this.generation;
    const dir = await this.files.directory(vaultHandle);
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
      await this.files.dropOriginal(vaultHandle, name);
      // Yield so a long sweep never blocks painting.
      if (++removed % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }
  }

  private async withThumbnailSlot<T>(task: () => Promise<T>): Promise<T> {
    while (this.activeThumbnails >= 2) {
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

  clear() {
    this.generation++;
    if (this.pruneTimer !== undefined) clearTimeout(this.pruneTimer);
    this.pruneTimer = undefined;
    this.prunedVaults.clear();
  }
}
