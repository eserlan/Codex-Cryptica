import { getDB } from "./idb";
import { hashBlob } from "@codex/sync-engine";

export interface FileEntry {
  handle: FileSystemFileHandle;
  path: string[];
}

export const VAULTS_DIR = "vaults";

function normalizeVaultId(vaultId?: string | null): string | null {
  if (!vaultId) return null;
  const trimmed = vaultId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function persistOpfsState(
  vaultId: string | null,
  filePath: string,
  file: File,
): Promise<void> {
  if (!vaultId) return;

  const db = await getDB();
  await db.put("opfs_file_state", {
    vaultId,
    filePath,
    hash: await hashBlob(file),
    size: file.size,
    lastModified: file.lastModified,
  });
}

async function deleteOpfsState(
  vaultId: string | null,
  filePath: string,
): Promise<void> {
  if (!vaultId) return;

  const db = await getDB();
  await db.delete("opfs_file_state", [vaultId, filePath]);
}

/**
 * Gets the root directory handle for the Origin Private File System.
 */
export async function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  return await navigator.storage.getDirectory();
}

/**
 * Checks if an error is a NotFoundError, potentially unwrapping it if it was re-thrown.
 */
export function isNotFoundError(err: any): boolean {
  if (!err) return false;
  return (
    err.name === "NotFoundError" ||
    err.code === 8 || // Legacy DOMException.NOT_FOUND_ERR
    err.message?.toLowerCase().includes("not found") ||
    err.cause?.name === "NotFoundError" ||
    (err instanceof Error && err.message.includes("not found"))
  );
}

/**
 * Gets a directory handle at the specified path relative to the root handle.
 * @param create If true, creates the directory if it doesn't exist.
 */
export async function getDirHandle(
  root: FileSystemDirectoryHandle,
  path: string[],
  create: boolean = false,
): Promise<FileSystemDirectoryHandle> {
  let currentDir = root;
  for (const part of path) {
    try {
      currentDir = await currentDir.getDirectoryHandle(part, { create });
    } catch (err: any) {
      if (err.name === "NotFoundError" && !create) {
        const error = new Error(`Directory not found: ${path.join("/")}`, {
          cause: err,
        });
        error.name = "NotFoundError";
        throw error;
      }
      throw err;
    }
  }
  return currentDir;
}

/**
 * Gets or creates a directory at the specified path relative to the root handle.
 * @deprecated Use getDirHandle(root, path, true) instead.
 */
export async function getOrCreateDir(
  root: FileSystemDirectoryHandle,
  path: string[],
): Promise<FileSystemDirectoryHandle> {
  return getDirHandle(root, path, true);
}

/**
 * Recursively walks an OPFS directory and returns a list of all files.
 */
export async function walkOpfsDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path: string[] = [],
  onError?: (error: unknown, path: string[]) => void,
): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      try {
        const currentPath = [...path, name];
        if (handle.kind === "file") {
          files.push({
            handle: handle as FileSystemFileHandle,
            path: currentPath,
          });
        } else if (handle.kind === "directory") {
          const subFiles = await walkOpfsDirectory(
            handle as FileSystemDirectoryHandle,
            currentPath,
            onError,
          );
          files.push(...subFiles);
        }
      } catch (error: any) {
        if (isNotFoundError(error)) continue;

        if (onError) {
          onError(error, [...path, name]);
        } else {
          console.error(
            `Error processing entry ${[...path, name].join("/")}:`,
            error,
          );
        }
      }
    }
  } catch (error: any) {
    if (isNotFoundError(error)) return files;

    if (onError) {
      onError(error, path);
    } else {
      console.error(`Error walking directory ${path.join("/")}:`, error);
    }
    throw error;
  }
  return files;
}

/**
 * Reads a file as text from OPFS given its path segments.
 */
export async function readFileAsText(
  root: FileSystemDirectoryHandle,
  path: string[],
): Promise<string> {
  if (path.length === 0) throw new Error("Path cannot be empty");

  const fileName = path[path.length - 1];
  const dirPath = path.slice(0, -1);

  try {
    const dirHandle = await getDirHandle(root, dirPath, false);
    const fileHandle = await dirHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (err: any) {
    if (isNotFoundError(err)) {
      const error = new Error(`File not found: ${path.join("/")}`, {
        cause: err,
      });
      error.name = "NotFoundError";
      throw error;
    }
    throw err;
  }
}

/**
 * Reads a file as a Blob from OPFS given its path segments.
 */
export async function readOpfsBlob(
  path: string[],
  root: FileSystemDirectoryHandle,
): Promise<Blob> {
  if (path.length === 0) throw new Error("Path cannot be empty");

  const fileName = path[path.length - 1];
  const dirPath = path.slice(0, -1);

  try {
    // If dirPath is empty, we are at root (relative to provided handle)
    let dirHandle = root;
    if (dirPath.length > 0) {
      dirHandle = await getDirHandle(root, dirPath, false);
    }

    const fileHandle = await dirHandle.getFileHandle(fileName);
    return await fileHandle.getFile();
  } catch (err: any) {
    if (isNotFoundError(err)) {
      const error = new Error(`File not found: ${path.join("/")}`, {
        cause: err,
      });
      error.name = "NotFoundError";
      throw error;
    }
    throw err;
  }
}

/**
 * Writes content (string or Blob) to a file in OPFS.
 */
export async function writeOpfsFile(
  path: string[],
  content: string | Blob | File,
  root: FileSystemDirectoryHandle,
  vaultId?: string,
): Promise<void> {
  if (path.length === 0) throw new Error("Path cannot be empty");

  const fileName = path[path.length - 1];
  const dirPath = path.slice(0, -1);

  const dirHandle = await getOrCreateDir(root, dirPath);
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });

  // Create a writable stream to the file
  const writable = await fileHandle.createWritable({ keepExistingData: false });
  await writable.write(content);
  await writable.close();

  try {
    const writtenFile = await fileHandle.getFile();
    await persistOpfsState(
      normalizeVaultId(vaultId),
      path.join("/"),
      writtenFile,
    );
  } catch (err) {
    console.warn(
      `[OPFS] Failed to update fingerprint cache for ${path.join("/")}. Sync performance may be affected.`,
      err,
    );
  }
}

/**
 * Deletes a file or directory in OPFS.
 */
export async function deleteOpfsEntry(
  root: FileSystemDirectoryHandle,
  path: string[],
  vaultId?: string,
): Promise<void> {
  if (path.length === 0) throw new Error("Path cannot be empty");

  const entryName = path[path.length - 1];
  const dirPath = path.slice(0, -1);

  const dirHandle = await getDirHandle(root, dirPath, false).catch((err) => {
    if (isNotFoundError(err)) return null;
    throw err;
  });

  if (!dirHandle) return;

  try {
    await dirHandle.removeEntry(entryName, { recursive: true });
  } catch (err) {
    if (isNotFoundError(err)) return;
    throw err;
  }

  // Best-effort cache cleanup
  try {
    await deleteOpfsState(normalizeVaultId(vaultId), path.join("/"));
  } catch (err) {
    console.warn(
      `[OPFS] Failed to clear fingerprint cache for ${path.join("/")}`,
      err,
    );
  }
}

/**
 * Gets the directory handle for a specific vault.
 */
export async function getVaultDir(
  root: FileSystemDirectoryHandle,
  vaultId: string,
): Promise<FileSystemDirectoryHandle> {
  return await getOrCreateDir(root, [VAULTS_DIR, vaultId]);
}

/**
 * Creates a new vault directory.
 */
export async function createVaultDir(
  root: FileSystemDirectoryHandle,
  vaultId: string,
): Promise<FileSystemDirectoryHandle> {
  return await getOrCreateDir(root, [VAULTS_DIR, vaultId]);
}

/**
 * Deletes a vault directory and all its contents.
 */
export async function deleteVaultDir(
  root: FileSystemDirectoryHandle,
  vaultId: string,
): Promise<void> {
  const normalized = normalizeVaultId(vaultId);
  if (!normalized) return;

  try {
    const vaultsDir = await getDirHandle(root, [VAULTS_DIR], false);
    await vaultsDir.removeEntry(normalized, { recursive: true });
  } catch (err) {
    if (isNotFoundError(err)) {
      // Already deleted or never existed, that's fine
    } else {
      throw err;
    }
  }

  // Best-effort cache cleanup for the entire vault
  // Use cursor with bounded chunks to avoid memory spikes on large vaults
  try {
    const db = await getDB();
    const tx = db.transaction("opfs_file_state", "readwrite");
    const index = tx.store.index("by-vault");
    let cursor = await index.openKeyCursor(normalized);
    if (cursor) {
      const chunkSize = 50;
      let chunk: [string, string][] = [];

      // Iterate through all keys using cursor

      while (true) {
        chunk.push(cursor.primaryKey as [string, string]);
        if (chunk.length >= chunkSize) {
          await Promise.all(chunk.map((key) => tx.store.delete(key)));
          chunk = [];
        }
        const nextCursor = await cursor.continue();
        if (!nextCursor) break;
        cursor = nextCursor;
      }

      // Delete remaining keys in final chunk
      if (chunk.length > 0) {
        await Promise.all(chunk.map((key) => tx.store.delete(key)));
      }
    }
    await tx.done;
  } catch (err) {
    console.warn(
      `[OPFS] Failed to clear fingerprint cache for vault ${normalized}`,
      err,
    );
  }
}
// trigger review
// test review v5
