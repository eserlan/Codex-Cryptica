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
  /** Removes a file, and does nothing when it is already gone. */
  deleteFile?(
    path: string[],
    root: FileSystemDirectoryHandle,
    vaultId?: string,
  ): Promise<void>;
}

/**
 * Whether the browser can load a URL as a plain image, which needs no CORS
 * headers. `unknown` when it cannot be told (no browser, or it took too long).
 */
export type ImageProbe = (
  url: string,
) => Promise<"loaded" | "failed" | "unknown">;
