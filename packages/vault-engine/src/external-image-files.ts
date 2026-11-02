import type { IAssetIOAdapter } from "./asset-types";

/** Files in the persistent external-image cache, including legacy names. */
export class ExternalImageFiles {
  constructor(private io: IAssetIOAdapter) {}

  async directory(root: FileSystemDirectoryHandle) {
    const cache = await this.io.getDirectoryHandle(root, [".cache"], true);
    return this.io.getDirectoryHandle(cache, ["external_images"], true);
  }

  async read(root: FileSystemDirectoryHandle, name: string): Promise<Blob> {
    return this.readFrom(await this.directory(root), name);
  }

  readFrom(directory: FileSystemDirectoryHandle, name: string): Promise<Blob> {
    return this.io.readOpfsBlob([name], directory);
  }

  write(root: FileSystemDirectoryHandle, name: string, content: string | Blob) {
    return this.io.writeOpfsFile(
      [".cache", "external_images", name],
      content,
      root,
      root.name,
    );
  }

  get canDelete(): boolean {
    return Boolean(this.io.deleteFile);
  }

  async dropOriginal(
    root: FileSystemDirectoryHandle,
    name: string,
  ): Promise<void> {
    await this.io
      .deleteFile?.([".cache", "external_images", name], root, root.name)
      .catch(() => {});
  }
}

/** File name an external image is cached under in `.cache/external_images`. */
export async function externalCacheName(url: string): Promise<string> {
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
export function legacyExternalCacheName(url: string): string {
  return (
    url
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .slice(-100) + ".cache"
  );
}
