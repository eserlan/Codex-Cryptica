import { debugStore } from "$lib/stores/debug.svelte";
import { writeFile } from "./fs";

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

export async function writeWithRetry(
  rootHandle: FileSystemDirectoryHandle | undefined,
  handle: FileSystemFileHandle,
  content: Blob | string,
  path: string,
): Promise<FileSystemFileHandle> {
  // DEBUG: Check current handle permission
  try {
    const currentPerm = await handle.queryPermission({ mode: "readwrite" });
    if (currentPerm !== "granted") {
      debugStore.warn(
        `[VaultIO] Write starting on handle with ${currentPerm} permission for ${path}`,
      );
    }
  } catch (e) {
    debugStore.warn(
      `[VaultIO] Failed to query handle permission for ${path}`,
      e,
    );
  }

  try {
    if (typeof content === "string") {
      await writeFile(handle, content);
    } else {
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    }
    return handle;
  } catch (err: any) {
    debugStore.warn(
      `[VaultIO] Write failed for ${path}. Attempting re-resolution... ${err.name} - ${err.message}`,
      err,
    );

    if (!rootHandle) {
      throw new Error("Root handle missing during retry");
    }

    try {
      const freshHandle = await reResolveFileHandle(
        rootHandle,
        path.split("/"),
        true,
      );
      if (typeof content === "string") {
        await writeFile(freshHandle, content);
      } else {
        const writable = await freshHandle.createWritable();
        await writable.write(content);
        await writable.close();
      }
      debugStore.log(`[VaultIO] Write retry successful for ${path}`);
      return freshHandle;
    } catch (retryErr: any) {
      debugStore.error(
        `[VaultIO] Retry failed for ${path}: ${retryErr.name} - ${retryErr.message}`,
        retryErr,
      );
      throw retryErr;
    }
  }
}
