import { writeOpfsFile, readOpfsBlob } from "../../utils/opfs";
import { generateThumbnail, convertToWebP } from "../../utils/image-processing";

export interface IAssetIO {
  readBlob(path: string[], handle: FileSystemDirectoryHandle): Promise<Blob>;
  writeBlob(
    path: string[],
    blob: Blob,
    handle: FileSystemDirectoryHandle,
  ): Promise<void>;
}

export const assetIOAdapter: IAssetIO = {
  readBlob: (path, handle) => readOpfsBlob(path, handle),
  writeBlob: (path, blob, handle) =>
    writeOpfsFile(path, blob, handle, handle.name),
};

export class AssetManager {
  private urlCache = new Map<string, { url: string; refs: number }>();

  async saveImageToVault(
    vaultHandle: FileSystemDirectoryHandle,
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
      const webpBlob = await convertToWebP(blob);
      await writeOpfsFile(
        ["images", filename],
        webpBlob,
        vaultHandle,
        vaultHandle.name,
      );

      // Generate and save thumbnail (already outputs WebP)
      const thumbnailBlob = await generateThumbnail(blob, 200);
      await writeOpfsFile(
        ["images", thumbFilename],
        thumbnailBlob,
        vaultHandle,
        vaultHandle.name,
      );

      const imagePath = `images/${filename}`;
      const thumbnailPath = `images/${thumbFilename}`;
      return { image: imagePath, thumbnail: thumbnailPath };
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

    // If it's already a data URI or blob, return as is
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

    // 1. Check if it's an external URL
    if (/^https?:\/\//i.test(cleanPath)) {
      if (!vaultHandle) return cleanPath;
      try {
        const cacheDir = await vaultHandle.getDirectoryHandle(".cache", {
          create: true,
        });
        const externalDir = await cacheDir.getDirectoryHandle(
          "external_images",
          {
            create: true,
          },
        );

        const safeName =
          cleanPath
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase()
            .slice(-100) + ".cache";

        try {
          const blob = await readOpfsBlob([safeName], externalDir);
          url = URL.createObjectURL(blob);
        } catch {
          const response = await fetch(cleanPath, { mode: "cors" });
          if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
          const blob = await response.blob();
          await writeOpfsFile(
            [".cache", "external_images", safeName],
            blob,
            vaultHandle,
            vaultHandle.name,
          );
          url = URL.createObjectURL(blob);
        }
      } catch (err: any) {
        console.warn(
          `Failed to process external image cache for ${cleanPath}`,
          err,
        );
        return cleanPath;
      }
    } else if (fileFetcher) {
      // 2. Guest Mode fetcher
      try {
        const blob = await fileFetcher(cleanPath);
        url = URL.createObjectURL(blob);
      } catch (err) {
        console.warn(`Failed to fetch remote image: ${cleanPath}`, err);
        return "";
      }
    } else if (vaultHandle) {
      // 3. Local Vault Lookup
      try {
        const segments = cleanPath
          .replace(/^(\.\/|\/)/, "")
          .split("/")
          .filter((s) => s && s !== ".");

        const blob = await readOpfsBlob(segments, vaultHandle);
        url = URL.createObjectURL(blob);
      } catch (err) {
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

/** @deprecated Use AssetManager class */
export const resolveImageUrl = (
  vaultHandle: FileSystemDirectoryHandle | undefined,
  path: string,
  fileFetcher?: (path: string) => Promise<Blob>,
) => new AssetManager().resolveImageUrl(vaultHandle, path, fileFetcher);

/** @deprecated Use AssetManager class */
export const saveImageToVault = (
  vaultHandle: FileSystemDirectoryHandle,
  blob: Blob,
  entityId: string,
  originalName?: string,
) =>
  new AssetManager().saveImageToVault(
    vaultHandle,
    blob,
    entityId,
    originalName,
  );
