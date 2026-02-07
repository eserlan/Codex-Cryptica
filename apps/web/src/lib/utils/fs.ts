export async function walkDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path: string[] = [],
  onError?: (err: unknown, path: string[]) => void
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
            onError
          );
          entries.push(...subEntries);
        }
      } catch (innerErr) {
        if (onError) onError(innerErr, path);
        // Continue to next entry
      }
    }
  } catch (err) {
    if (onError) onError(err, path);
    throw err; // Re-throw to fail the specific walk if iteration itself fails
  }

  return entries;
}
