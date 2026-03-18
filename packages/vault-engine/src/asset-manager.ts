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

  async resolveImageUrl(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    path: string,
    fileFetcher?: (path: string) => Promise<Blob>,
  ): Promise<string> {
    if (!path) return "";
    const cleanPath = path.trim();

    // 1. Data URI or existing Blob URL
    if (/^(data:|blob:)/i.test(cleanPath)) {
      return cleanPath;
    }

    // Ref-counting cache check
    const existing = this.urlCache.get(cleanPath);
    if (existing) {
      existing.refs++;
      return existing.url;
    }

    let url = "";

    // 2. External URL caching
    if (/^https?:\/\//i.test(cleanPath)) {
      if (!vaultHandle) return cleanPath;

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
    } else if (vaultHandle) {
      // 4. Local Vault File
      try {
        const segments = cleanPath
          .replace(/^(\.\/|\/)/, "")
          .split("/")
          .filter((s) => s && s !== ".");

        const blob = await this.ioAdapter.readOpfsBlob(segments, vaultHandle);
        url = URL.createObjectURL(blob);
      } catch (err: any) {
        // Gracefully handle "Not Found" errors from the File System API.
        if (this.ioAdapter.isNotFoundError(err)) {
          return "";
        }
        console.warn(`Failed to resolve image path: ${cleanPath}`, err);
        return "";
      }
    }

    if (url && url.startsWith("blob:")) {
      this.urlCache.set(cleanPath, { url, refs: 1 });
    }

    return url || cleanPath;
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
}
