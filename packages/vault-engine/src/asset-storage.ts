import type { IAssetIOAdapter, IImageProcessor } from "./asset-types";
import type { Clock } from "./runtime";

/** Vault image writes, local reads, and migration of resolved assets. */
export class AssetStorage {
  constructor(
    private ioAdapter: IAssetIOAdapter,
    private imageProcessor: IImageProcessor,
    private fetcher: typeof fetch,
    private clock: Clock,
  ) {}

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

  async readLocal(
    path: string,
    vaultHandle?: FileSystemDirectoryHandle,
    fallbackHandle?: FileSystemDirectoryHandle,
  ): Promise<Blob | undefined> {
    const segments = assetSegments(path);
    let blob: Blob | undefined;
    if (vaultHandle) {
      try {
        blob = await this.ioAdapter.readOpfsBlob(segments, vaultHandle);
      } catch (error) {
        if (!fallbackHandle) throw error;
      }
    }
    if (!blob && fallbackHandle) {
      blob = await this.ioAdapter.readOpfsBlob(segments, fallbackHandle);
    }
    return blob;
  }

  async ensureAssetPersisted(
    path: string,
    vaultHandle: FileSystemDirectoryHandle,
    resolve: (path: string) => Promise<string>,
    fileFetcher?: (path: string) => Promise<Blob>,
  ): Promise<void> {
    if (!path) return;
    const cleanPath = path.trim();
    if (/^(data:|blob:|https?:)/i.test(cleanPath)) return;
    const segments = assetSegments(cleanPath);
    if (await this.exists(segments, vaultHandle)) return;
    const blob = await this.readResolvedSource(
      await resolve(cleanPath),
      fileFetcher,
    );
    if (!blob) return;
    await this.ioAdapter.writeOpfsFile(
      segments,
      blob,
      vaultHandle,
      vaultHandle.name,
    );
    console.log(`[AssetManager] Migrated asset to vault: ${cleanPath}`);
  }

  private async exists(
    segments: string[],
    root: FileSystemDirectoryHandle,
  ): Promise<boolean> {
    try {
      await this.ioAdapter.readOpfsBlob(segments, root);
      return true;
    } catch {
      return false;
    }
  }

  private async readResolvedSource(
    source: string,
    fileFetcher?: (path: string) => Promise<Blob>,
  ): Promise<Blob | undefined> {
    if (source && source.startsWith("blob:")) {
      try {
        const response = await this.fetcher(source);
        return await response.blob();
      } catch (err) {
        console.warn(`[AssetManager] Failed to fetch blob from ${source}`, err);
      }
    } else if (source && !source.startsWith("http") && fileFetcher) {
      try {
        return await fileFetcher(source);
      } catch (err) {
        console.warn(
          `[AssetManager] Failed to fetch via fileFetcher: ${source}`,
          err,
        );
      }
    }
  }
}

function assetSegments(path: string): string[] {
  return path
    .replace(/^(\.\/|\/)/, "")
    .split("/")
    .filter((segment) => segment && segment !== ".");
}
