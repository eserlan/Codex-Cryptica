import { debugStore } from '$lib/stores/debug.svelte';

export async function getFileHandle(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  create = false,
): Promise<FileSystemFileHandle> {
  return await dirHandle.getFileHandle(name, { create });
}

export async function readFile(
  fileHandle: FileSystemFileHandle,
): Promise<string> {
  const file = await fileHandle.getFile();
  return await file.text();
}

export async function writeFile(
  fileHandle: FileSystemFileHandle,
  content: string | Blob,
): Promise<void> {
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deleteFile(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
): Promise<void> {
  await dirHandle.removeEntry(name);
}

export interface FileEntry {
  handle: FileSystemFileHandle;
  path: string[]; // Relative path from root
}

export async function walkDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path: string[] = [],
  onError?: (err: unknown, path: string[]) => void,
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  // Avoid scanning large binary folders that never contain markdown.
  const SKIP_DIRS = new Set(["images"]);
  
  debugStore.log(`Walking directory: /${path.join('/')}`);

  try {
    // Use values() as it's sometimes more stable than entries() on certain platforms
    for await (const handle of dirHandle.values()) {
      const name = handle.name;
      const currentPath = [...path, name];
      try {
        if (handle.kind === "file") {
          if (name.endsWith(".md")) {
            entries.push({
              handle: handle as FileSystemFileHandle,
              path: currentPath,
            });
          }
        } else if (handle.kind === "directory") {
          if (SKIP_DIRS.has(name)) {
            debugStore.log(`Skipping directory: /${currentPath.join('/')}`);
            continue;
          }
          // Recursion
          const subEntries = await walkDirectory(
            handle as FileSystemDirectoryHandle,
            currentPath,
            onError,
          );
          entries.push(...subEntries);
        }
      } catch (innerErr: any) {
        debugStore.error(`Error processing entry /${currentPath.join('/')}: ${innerErr.name} - ${innerErr.message}`);
        if (onError) onError(innerErr, currentPath);
        // Continue to next entry
      }
    }
  } catch (err: any) {
    debugStore.error(`Failed to iterate directory handle for /${path.join('/')}: ${err.name} - ${err.message}`);
    if (onError) onError(err, path);
    throw err; // Re-throw to fail the specific walk if iteration itself fails
  }

  return entries;
}
