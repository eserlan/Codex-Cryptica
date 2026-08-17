import type { RandomSourceFiles } from "$lib/stores/random-source-store.svelte";
import {
  deleteOpfsEntry,
  getDirHandle,
  isNotFoundError,
  readFileAsText,
  writeOpfsFile,
} from "$lib/utils/opfs";

/**
 * `RandomSourceFiles` over the open vault (#2247).
 *
 * Sources are ordinary vault files, so they travel with an export or a Drive
 * push exactly like entities do. Only one vault is open at a time, so the
 * adapter is bound to the active one rather than taking a vault id per call.
 */
export interface RandomVaultDeps {
  activeVaultId: () => string | null;
  vaultHandle: () => Promise<FileSystemDirectoryHandle | null>;
}

export class VaultRandomSourceFiles implements RandomSourceFiles {
  constructor(private readonly deps: RandomVaultDeps) {}

  /**
   * Files directly inside `dir`, never recursing.
   *
   * Deck draw state lives in `_decks/state/`, and listing it here would hand
   * the store JSON files to parse as Markdown for no gain.
   */
  async list(dir: string): Promise<string[]> {
    const root = await this.deps.vaultHandle();
    if (!root) return [];

    let handle: FileSystemDirectoryHandle;
    try {
      handle = await getDirHandle(root, dir.split("/"), false);
    } catch (err) {
      // A vault with no tables yet simply has no directory.
      if (isNotFoundError(err)) return [];
      throw err;
    }

    const paths: string[] = [];
    for await (const [name, entry] of handle.entries()) {
      if (entry.kind === "file") paths.push(`${dir}/${name}`);
    }
    return paths.sort();
  }

  async read(path: string): Promise<string | undefined> {
    const root = await this.deps.vaultHandle();
    if (!root) return undefined;
    try {
      return await readFileAsText(root, path.split("/"));
    } catch (err) {
      if (isNotFoundError(err)) return undefined;
      throw err;
    }
  }

  async write(path: string, contents: string): Promise<void> {
    const root = await this.deps.vaultHandle();
    if (!root) throw new Error("No vault is open.");
    await writeOpfsFile(
      path.split("/"),
      contents,
      root,
      this.deps.activeVaultId() ?? undefined,
    );
  }

  async remove(path: string): Promise<void> {
    const root = await this.deps.vaultHandle();
    if (!root) return;
    await deleteOpfsEntry(
      root,
      path.split("/"),
      this.deps.activeVaultId() ?? undefined,
    );
  }
}
