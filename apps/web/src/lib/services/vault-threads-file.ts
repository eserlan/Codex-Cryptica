import {
  parseThreadsFile,
  serialiseThreadsFile,
  type Thread,
} from "solo-session-engine";
import { readOpfsBlob, writeOpfsFile } from "$lib/utils/opfs";

/** Where the threads file lives inside the vault (spec 174, research R4). */
export const THREADS_PATH = [".codex", "threads.json"];

/** Plain file access inside one vault. Injected so the logic is testable without a browser. */
export interface VaultFileAccess {
  /** The file's text, or null when it does not exist. */
  read(path: string[]): Promise<string | null>;
  write(path: string[], text: string): Promise<void>;
}

export interface LoadedThreads {
  threads: Thread[];
  /** False when the file is present but not a readable threads file. It must not be overwritten. */
  valid: boolean;
}

export async function loadThreads(
  files: VaultFileAccess,
): Promise<LoadedThreads> {
  const text = await files.read(THREADS_PATH);
  if (text === null) return { threads: [], valid: true };
  try {
    return parseThreadsFile(JSON.parse(text));
  } catch {
    return { threads: [], valid: false };
  }
}

export async function saveThreads(
  files: VaultFileAccess,
  threads: readonly Thread[],
): Promise<void> {
  await files.write(THREADS_PATH, serialiseThreadsFile(threads));
}

/** The production adapter: the vault's own OPFS directory. */
export function opfsVaultFiles(
  vaultDir: FileSystemDirectoryHandle,
  vaultId: string,
): VaultFileAccess {
  return {
    async read(path) {
      try {
        const blob = await readOpfsBlob(path, vaultDir);
        return await blob.text();
      } catch (error) {
        if ((error as { name?: string })?.name === "NotFoundError") return null;
        throw error;
      }
    },
    write(path, text) {
      return writeOpfsFile(path, text, vaultDir, vaultId);
    },
  };
}
