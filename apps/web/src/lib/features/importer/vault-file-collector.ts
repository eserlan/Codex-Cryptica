import type { DroppedItem } from "@codex/importer";

/**
 * Collects dropped files (and any dropped folder, walked recursively) from
 * a drag-and-drop DataTransfer into DroppedItems. A dropped folder is
 * treated as the vault root — its own name is stripped, so `relativePath`
 * matches how vault entities reference their own content (e.g.
 * `entities/x.md`, `images/x.webp`), not prefixed with the folder name the
 * user happened to drag in. Uses `webkitGetAsEntry()` (broadly supported
 * across Chrome, Firefox, and Safari for drag-and-drop, unlike
 * `showDirectoryPicker()`) rather than `dataTransfer.files`, since the
 * latter never exposes folder contents at all.
 */
export async function collectDroppedItems(
  dataTransfer: DataTransfer,
): Promise<DroppedItem[]> {
  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < dataTransfer.items.length; i++) {
    const entry = dataTransfer.items[i]?.webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }

  if (entries.length === 0) {
    // Fallback for environments without webkitGetAsEntry support: loose
    // files still come through dataTransfer.files (folders would not).
    return collectUploadedItems(dataTransfer.files);
  }

  const items: DroppedItem[] = [];
  await Promise.all(entries.map((entry) => walkTopLevelEntry(entry, items)));
  return items;
}

/**
 * A dropped top-level *folder* is treated as the vault root itself — its
 * own name isn't part of any internal reference (an entity's `image:
 * images/x.webp` is vault-root-relative), so its own name must not become
 * a path prefix. A dropped top-level *file* has no such root to strip.
 */
async function walkTopLevelEntry(
  entry: FileSystemEntry,
  out: DroppedItem[],
): Promise<void> {
  if (!entry.isDirectory) {
    await walkEntry(entry, "", out);
    return;
  }

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  try {
    const children = await readAllEntries(reader);
    await Promise.all(children.map((child) => walkEntry(child, "", out)));
  } catch {
    // Unreadable directory — excluded, doesn't block the rest of the drop.
  }
}

async function walkEntry(
  entry: FileSystemEntry,
  prefix: string,
  out: DroppedItem[],
): Promise<void> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;

  if (entry.isFile) {
    try {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      out.push({ relativePath: path, file });
    } catch {
      // Unreadable entry — excluded, doesn't block the rest of the drop.
    }
    return;
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    try {
      const children = await readAllEntries(reader);
      await Promise.all(children.map((child) => walkEntry(child, path, out)));
    } catch {
      // Unreadable directory — excluded, doesn't block the rest of the drop.
    }
  }
}

function readAllEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  // readEntries() can return a partial batch and must be called repeatedly
  // until it returns an empty array, per the File and Directory Entries API.
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const readNext = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(all);
          return;
        }
        all.push(...batch);
        readNext();
      }, reject);
    };
    readNext();
  });
}

/**
 * Collects files chosen via the traditional file upload dialog. No folder
 * structure is preserved here (the dialog itself offers no folder-drop
 * equivalent) — each file's relative path is just its own filename, unless
 * the browser populated `webkitRelativePath` (e.g. a `webkitdirectory`
 * input, not used by this feature's own upload button but handled for
 * robustness).
 */
export function collectUploadedItems(files: FileList | File[]): DroppedItem[] {
  const list = Array.from(files);
  return list.map((file) => ({
    relativePath: file.webkitRelativePath || file.name,
    file,
  }));
}
