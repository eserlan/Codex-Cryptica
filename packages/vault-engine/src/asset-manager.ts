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
}

export class AssetManager {
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

    try {
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
    } catch (err: any) {
      console.error("Failed to save image to OPFS", err);
      throw err;
    }
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
          return URL.createObjectURL(blob);
        } catch {
          let blob: Blob;
          try {
            const response = await fetch(cleanPath, { mode: "cors" });
            if (!response.ok)
              throw new Error(`Fetch failed: ${response.status}`);
            blob = await response.blob();
          } catch (err) {
            console.warn(`Failed to fetch external image ${cleanPath}`, err);
            return cleanPath;
          }

          await this.ioAdapter.writeOpfsFile(
            [".cache", "external_images", safeName],
            blob,
            vaultHandle,
            vaultHandle.name,
          );
          return URL.createObjectURL(blob);
        }
      } catch (err: any) {
        console.warn(
          `Failed to process external image cache for ${cleanPath}`,
          err,
        );
        return cleanPath;
      }
    }

    // 3. P2P / Guest Mode remote fetcher
    if (fileFetcher) {
      try {
        const blob = await fileFetcher(cleanPath);
        return URL.createObjectURL(blob);
      } catch (err) {
        console.warn(`Failed to fetch remote image: ${cleanPath}`, err);
        return "";
      }
    }

    // 4. Local Vault File
    if (!vaultHandle) return cleanPath;

    try {
      const segments = cleanPath
        .replace(/^(\.\/|\/)/, "")
        .split("/")
        .filter((s) => s && s !== ".");

      const blob = await this.ioAdapter.readOpfsBlob(segments, vaultHandle);
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn(`Failed to resolve image path: ${cleanPath}`, err);
      return "";
    }
  }
}
