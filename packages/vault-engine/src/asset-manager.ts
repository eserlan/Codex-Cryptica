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
}

export class AssetManager {
  private urlCache = new Map<string, { url: string; refs: number }>();
  private resolving = new Map<string, Promise<string>>();

  constructor(
    private ioAdapter: IAssetIOAdapter,
    private imageProcessor: IImageProcessor,
  ) {}

  async saveImageToVault(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    blob: Blob,
    entityId: string,
    originalName?: string,
  ): Promise<{ image: string; thumbnail: string }> {
    if (!vaultHandle) throw new Error("Vault not open");

    const timestamp = Date.now();
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
          // If no vault handle, we can't persistent-cache it, but we should still
          // try to resolve to a blob URL to satisfy CORS requirements for canvas.
          if (!vaultHandle) {
            try {
              const response = await fetch(cleanPath, { mode: "cors" });
              if (!response.ok) return cleanPath;
              const blob = await response.blob();
              url = URL.createObjectURL(blob);
              this.urlCache.set(cleanPath, { url, refs: 1 });
              return url;
            } catch {
              return cleanPath;
            }
          }

          try {
            const cacheDir = await this.ioAdapter.getDirectoryHandle(
              vaultHandle,
              [".cache"],
              true,
            );
            const externalDir = await this.ioAdapter.getDirectoryHandle(
              cacheDir,
              ["external_images"],
              true,
            );

            const safeName =
              cleanPath
                .replace(/[^a-z0-9]/gi, "_")
                .toLowerCase()
                .slice(-100) + ".cache";

            try {
              const blob = await this.ioAdapter.readOpfsBlob(
                [safeName],
                externalDir,
              );
              url = URL.createObjectURL(blob);
            } catch {
              let blob: Blob;
              try {
                const response = await fetch(cleanPath, { mode: "cors" });
                if (!response.ok)
                  throw new Error(`Fetch failed: ${response.status}`);
                blob = await response.blob();
              } catch {
                return cleanPath;
              }

              await this.ioAdapter.writeOpfsFile(
                [".cache", "external_images", safeName],
                blob,
                vaultHandle,
                vaultHandle.name,
              );
              url = URL.createObjectURL(blob);
            }
          } catch {
            return cleanPath;
          }
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

        return url || cleanPath;
      } finally {
        this.resolving.delete(cleanPath);
      }
    })();

    this.resolving.set(cleanPath, resolutionPromise);
    return resolutionPromise;
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
    this.urlCache.forEach((entry) => {
      URL.revokeObjectURL(entry.url);
    });
    this.urlCache.clear();
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
          const response = await fetch(source);
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
