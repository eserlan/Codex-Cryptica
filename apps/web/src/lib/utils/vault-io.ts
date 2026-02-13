import { debugStore } from "$lib/stores/debug.svelte";
import { writeFile } from "./fs";

/**
 * Re-resolves a file handle from a root directory handle and a path.
 * This is useful when a handle becomes stale.
 */
export async function reResolveFileHandle(
  rootHandle: FileSystemDirectoryHandle,
  path: string | string[],
  create = false,
): Promise<FileSystemFileHandle> {
  if (!rootHandle) throw new Error("Root handle missing");
  const pathParts = Array.isArray(path) ? path : path.split("/");
  const fileName = pathParts[pathParts.length - 1];
  const dirParts = pathParts.slice(0, -1);

  let currentDir = rootHandle;
  for (const part of dirParts) {
    currentDir = await currentDir.getDirectoryHandle(part, { create });
  }
  return await currentDir.getFileHandle(fileName, { create });
}

/**
 * A simplified write utility for the File System Access API, used for syncing to local folders.
 * The primary write logic for the app is now in opfs.ts.
 */
export async function writeWithRetry(
  rootHandle: FileSystemDirectoryHandle,
  handle: FileSystemFileHandle,
  content: Blob | string,
  path: string,
): Promise<FileSystemFileHandle> {
  try {
    await writeFile(handle, content);
    return handle;
  } catch (err: any) {
    debugStore.warn(`Write failed for ${path}, retrying once...`, err);
    try {
      const freshHandle = await reResolveFileHandle(
        rootHandle,
        path.split("/"),
        true,
      );
      await writeFile(freshHandle, content);
      debugStore.log(`Write retry successful for ${path}`);
      return freshHandle;
    } catch (retryErr: any) {
      debugStore.error(`Retry failed for ${path}`, retryErr);
      throw retryErr;
    }
  }
}
