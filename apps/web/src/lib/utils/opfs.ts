export interface FileEntry {
  handle: FileSystemFileHandle;
  path: string[];
}

const VAULTS_DIR = "vaults";

/**
 * Gets the root directory handle for the Origin Private File System.
 */
export async function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  return await navigator.storage.getDirectory();
}

/**
 * Gets a directory handle at the specified path relative to the root handle.
 * @param create If true, creates the directory if it doesn't exist.
 */
export async function getDirHandle(
  root: FileSystemDirectoryHandle,
  path: string[],
  create: boolean = false
): Promise<FileSystemDirectoryHandle> {
  let currentDir = root;
  for (const part of path) {
    currentDir = await currentDir.getDirectoryHandle(part, { create });
  }
  return currentDir;
}

/**
 * Gets or creates a directory at the specified path relative to the root handle.
 * @deprecated Use getDirHandle(root, path, true) instead.
 */
export async function getOrCreateDir(
  root: FileSystemDirectoryHandle,
  path: string[]
): Promise<FileSystemDirectoryHandle> {
  return getDirHandle(root, path, true);
}

/**
 * Recursively walks an OPFS directory and returns a list of all files.
 */
export async function walkOpfsDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path: string[] = [],
  onError?: (error: unknown, path: string[]) => void
): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      try {
        const currentPath = [...path, name];
        if (handle.kind === "file") {
          files.push({ handle: handle as FileSystemFileHandle, path: currentPath });
        } else if (handle.kind === "directory") {
          const subFiles = await walkOpfsDirectory(
            handle as FileSystemDirectoryHandle,
            currentPath,
            onError
          );
          files.push(...subFiles);
        }
      } catch (error) {
        if (onError) {
          onError(error, [...path, name]);
        } else {
          console.error(`Error processing entry ${[...path, name].join("/")}:`, error);
        }
      }
    }
  } catch (error) {
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
  path: string[]
): Promise<string> {
  if (path.length === 0) throw new Error("Path cannot be empty");

  const fileName = path[path.length - 1];
  const dirPath = path.slice(0, -1);

  const dirHandle = await getDirHandle(root, dirPath, false);
  const fileHandle = await dirHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return await file.text();
}

/**
 * Reads a file as a Blob from OPFS given its path segments.
 */
export async function readOpfsBlob(
  path: string[],
  root: FileSystemDirectoryHandle
): Promise<Blob> {
  if (path.length === 0) throw new Error("Path cannot be empty");

  const fileName = path[path.length - 1];
  const dirPath = path.slice(0, -1);

  // If dirPath is empty, we are at root (relative to provided handle)
  let dirHandle = root;
  if (dirPath.length > 0) {
    dirHandle = await getDirHandle(root, dirPath, false);
  }

  const fileHandle = await dirHandle.getFileHandle(fileName);
  return await fileHandle.getFile();
}

/**
 * Writes content (string or Blob) to a file in OPFS.
 */
export async function writeOpfsFile(
  path: string[],
  content: string | Blob | File,
  root: FileSystemDirectoryHandle
): Promise<void> {
  if (path.length === 0) throw new Error("Path cannot be empty");

  const fileName = path[path.length - 1];
  const dirPath = path.slice(0, -1);

  const dirHandle = await getOrCreateDir(root, dirPath);
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });

  // Create a writable stream to the file
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Deletes a file or directory in OPFS.
 */
export async function deleteOpfsEntry(
  root: FileSystemDirectoryHandle,
  path: string[]
): Promise<void> {
  if (path.length === 0) throw new Error("Path cannot be empty");

  const entryName = path[path.length - 1];
  const dirPath = path.slice(0, -1);

  const dirHandle = await getDirHandle(root, dirPath, false);
  await dirHandle.removeEntry(entryName, { recursive: true });
}

/**
 * Gets the directory handle for a specific vault.
 */
export async function getVaultDir(
  root: FileSystemDirectoryHandle,
  vaultId: string
): Promise<FileSystemDirectoryHandle> {
  return await getOrCreateDir(root, [VAULTS_DIR, vaultId]);
}

/**
 * Creates a new vault directory.
 */
export async function createVaultDir(
  root: FileSystemDirectoryHandle,
  vaultId: string
): Promise<FileSystemDirectoryHandle> {
  return await getOrCreateDir(root, [VAULTS_DIR, vaultId]);
}

/**
 * Deletes a vault directory and all its contents.
 */
export async function deleteVaultDir(
  root: FileSystemDirectoryHandle,
  vaultId: string
): Promise<void> {
  const vaultsDir = await getOrCreateDir(root, [VAULTS_DIR]);
  await vaultsDir.removeEntry(vaultId, { recursive: true });
}
