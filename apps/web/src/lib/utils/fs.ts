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
  // @ts-expect-error - TS might not have full FS types yet depending on config
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === "file") {
      if (name.endsWith(".md")) {
        entries.push({
          handle: handle as FileSystemFileHandle,
          path: [...path, name],
        });
      }
    } else if (handle.kind === "directory") {
      // Recursion
      const subEntries = await walkDirectory(
        handle as FileSystemDirectoryHandle,
        [...path, name],
      );
      entries.push(...subEntries);
    }
  }

  return entries;
}
