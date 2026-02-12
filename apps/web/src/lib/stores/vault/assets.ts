import { writeOpfsFile, readOpfsBlob } from "../../utils/opfs";
import { generateThumbnail } from "../../utils/image-processing";

export async function saveImageToVault(
  vaultHandle: FileSystemDirectoryHandle,
  blob: Blob,
  entityId: string,
  originalName?: string,
): Promise<{ image: string; thumbnail: string }> {
  if (!vaultHandle) throw new Error("Vault not open");

  const extension = blob.type.split("/")[1] || "png";
  const timestamp = Date.now();
  const baseName = originalName
    ? originalName.replace(/\.[^/.]+$/, "")
    : `img_${entityId}_${timestamp}`;
  const filename = `${baseName}.${extension}`;
  const thumbFilename = `${baseName}_thumb.jpg`;

  try {
    const imagesDir = await vaultHandle.getDirectoryHandle("images", {
      create: true,
    });

    // Save original image
    await writeOpfsFile([filename], blob, imagesDir);

    // Generate and save thumbnail
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
): Promise<string> {
  if (!path) return "";

  // If it's already a data URI or blob, return as is
  if (/^(data:|blob:)/.test(path)) {
    return path;
  }

  if (!vaultHandle) return path; // Fallback to raw path if no vault

  // 1. Check if it's an external URL
  if (/^https?:\/\//.test(path)) {
    try {
      const cacheDir = await vaultHandle.getDirectoryHandle(".cache", {
        create: true,
      });
      const externalDir = await cacheDir.getDirectoryHandle("external_images", {
        create: true,
      });

      // Create a unique filename based on the URL
      const safeName =
        path
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
          const response = await fetch(path, { mode: "cors" });
          if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
          blob = await response.blob();
        } catch (err) {
          // CORS failure or other error
          console.warn(`Failed to fetch external image ${path}`, err);
          throw err;
        }

        // Save to cache
        await writeOpfsFile([safeName], blob, externalDir);
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.warn(`Failed to process external image cache for ${path}`, err);
      return path; // Fallback to raw URL
    }
  }

  try {
    // Sanitize path: remove leading './' or '/' and filter empty segments
    const segments = path
      .replace(/^(\.\/|\/)/, "")
      .split("/")
      .filter((s) => s && s !== ".");

    const blob = await readOpfsBlob(segments, vaultHandle);
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn(`Failed to resolve image path: ${path}`, err);
    return "";
  }
}
