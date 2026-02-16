import { writeOpfsFile, readOpfsBlob } from "../../utils/opfs";
import { generateThumbnail, convertToWebP } from "../../utils/image-processing";

export async function saveImageToVault(
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
    const imagesDir = await vaultHandle.getDirectoryHandle("images", {
      create: true,
    });

    // Convert original image to WebP and save
    const webpBlob = await convertToWebP(blob);
    await writeOpfsFile([filename], webpBlob, imagesDir);

    // Generate and save thumbnail (already outputs WebP)
    const thumbnailBlob = await generateThumbnail(blob, 200);
    await writeOpfsFile([thumbFilename], thumbnailBlob, imagesDir);

    const imagePath = `images/${filename}`;
    const thumbnailPath = `images/${thumbFilename}`;
    return { image: imagePath, thumbnail: thumbnailPath };
  } catch (err: any) {
    console.error("Failed to save image to OPFS", err);
    throw err;
  }
}

export async function resolveImageUrl(
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

  // 1. Check if it's an external URL (Prioritize this over P2P/Vault)
  if (/^https?:\/\//i.test(cleanPath)) {
    if (!vaultHandle) return cleanPath; // No vault to cache in? Return raw URL.

    try {
      const cacheDir = await vaultHandle.getDirectoryHandle(".cache", {
        create: true,
      });
      const externalDir = await cacheDir.getDirectoryHandle("external_images", {
        create: true,
      });

      // Create a unique filename based on the URL
      const safeName =
        cleanPath
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()
          .slice(-100) + ".cache";

      try {
        // Check if already in cache
        const blob = await readOpfsBlob([safeName], externalDir);
        return URL.createObjectURL(blob);
      } catch {
        // Not in cache, try to fetch it
        let blob: Blob;
        try {
          const response = await fetch(cleanPath, { mode: "cors" });
          if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
          blob = await response.blob();
        } catch (err) {
          // CORS failure or other error
          console.warn(`Failed to fetch external image ${cleanPath}`, err);
          return cleanPath; // Return raw URL on failure
        }

        // Save to cache
        await writeOpfsFile([safeName], blob, externalDir);
        return URL.createObjectURL(blob);
      }
    } catch (err: any) {
      console.warn(
        `Failed to process external image cache for ${cleanPath}`,
        err,
      );
      return cleanPath; // Fallback to raw URL
    }
  }

  // 2. If we have a remote fetcher (Guest Mode), use it for local paths
  if (fileFetcher) {
    try {
      const blob = await fileFetcher(cleanPath);
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn(`Failed to fetch remote image: ${cleanPath}`, err);
      return "";
    }
  }

  if (!vaultHandle) return cleanPath; // Fallback to raw path if no vault

  // 3. Local Vault Lookup
  try {
    // Sanitize path: remove leading './' or '/' and filter empty segments
    const segments = cleanPath
      .replace(/^(\.\/|\/)/, "")
      .split("/")
      .filter((s) => s && s !== ".");

    const blob = await readOpfsBlob(segments, vaultHandle);
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn(`Failed to resolve image path: ${cleanPath}`, err);
    return "";
  }
}
