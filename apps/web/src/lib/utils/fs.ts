import { debugStore } from "$lib/stores/debug.svelte";

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export type FileSystemAccessBrowser =
  "brave" | "firefox" | "safari" | "chromium" | "unknown";

/**
 * Brave doesn't identify itself in the User-Agent string (by design, to
 * reduce fingerprinting), but it exposes a `navigator.brave` object no other
 * browser has — that's the only reliable way to detect it client-side.
 */
export function detectFileSystemAccessBrowser(): FileSystemAccessBrowser {
  if (typeof navigator === "undefined") return "unknown";
  if ("brave" in navigator && (navigator as any).brave?.isBrave) {
    return "brave";
  }
  const ua = navigator.userAgent;
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome|Chromium|CriOS|Edg\/|OPR\//.test(ua)) return "chromium";
  if (/Safari\//.test(ua)) return "safari";
  return "unknown";
}

export function getFileSystemAccessUnsupportedMessage(
  browser: FileSystemAccessBrowser = detectFileSystemAccessBrowser(),
): string {
  switch (browser) {
    case "brave":
      return (
        "Brave disables local folder saving by default. Open a new tab, go to " +
        "brave://flags/#file-system-access-api, set it to Enabled, and relaunch Brave."
      );
    case "firefox":
      return (
        "Your vault is fully saved in this browser — Firefox just doesn't support " +
        "mirroring it to a folder on disk. To back it up, use Export Backup in " +
        "Settings (works everywhere), or switch to Chrome or Edge for live folder sync."
      );
    case "safari":
      return (
        "Your vault is fully saved in this browser — Safari just doesn't support " +
        "mirroring it to a folder on disk. To back it up, use Export Backup in " +
        "Settings (works everywhere), or switch to Chrome or Edge for live folder sync."
      );
    default:
      return (
        "Your vault is saved in this browser, but this browser can't mirror it to a " +
        "folder on disk, or the feature is disabled. Use Export Backup in Settings " +
        "(works everywhere), or try Chrome, Edge, or Brave (with the " +
        "file-system-access-api flag enabled)."
      );
  }
}

/**
 * Wraps window.showDirectoryPicker with a feature check so unsupported
 * browsers (e.g. Brave with the file-system-access-api flag disabled) throw
 * an actionable NotSupportedError instead of a raw "not a function" TypeError.
 */
export async function pickDirectory(options?: {
  id?: string;
  mode?: "read" | "readwrite";
  startIn?:
    | FileSystemHandle
    | "desktop"
    | "documents"
    | "downloads"
    | "music"
    | "pictures"
    | "videos";
}): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    const err = new Error(getFileSystemAccessUnsupportedMessage());
    err.name = "NotSupportedError";
    throw err;
  }
  return window.showDirectoryPicker(options);
}

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

  debugStore.log(`Walking directory: /${path.join("/")}`);

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
            debugStore.log(`Skipping directory: /${currentPath.join("/")}`);
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
        debugStore.error(
          `Error processing entry /${currentPath.join("/")}: ${innerErr.name} - ${innerErr.message}`,
        );
        if (onError) onError(innerErr, currentPath);
        // Continue to next entry
      }
    }
  } catch (err: any) {
    debugStore.error(
      `Failed to iterate directory handle for /${path.join("/")}: ${err.name} - ${err.message}`,
    );
    if (onError) onError(err, path);
    throw err; // Re-throw to fail the specific walk if iteration itself fails
  }

  return entries;
}
