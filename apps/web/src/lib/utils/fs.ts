import { debugStore } from "../stores/debug.svelte";

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
  content: string,
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
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  try {
    // Use values() as it's sometimes more stable than entries() on certain platforms
    for await (const handle of dirHandle.values()) {
      try {
        const name = handle.name;
        const currentPath = [...path, name];
        if (handle.kind === "file") {
          if (name.endsWith(".md")) {
            entries.push({
              handle: handle as FileSystemFileHandle,
              path: currentPath,
            });
          }
        } else if (handle.kind === "directory") {
          // Recursion
          const subEntries = await walkDirectory(
            handle as FileSystemDirectoryHandle,
            currentPath,
          );
          entries.push(...subEntries);
        }
      } catch (innerErr) {
        debugStore.error(`Failed to process entry in ${path.join("/") || 'root'}`, innerErr);
        // Continue to next entry
      }
    }
  } catch (err) {
    debugStore.error(`Failed to iterate directory: ${path.join("/") || 'root'}`, err);
    throw err; // Re-throw to fail the specific walk if iteration itself fails
  }

  return entries;
}
