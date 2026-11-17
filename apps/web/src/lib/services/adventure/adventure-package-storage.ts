import {
  approveAdventurePackage,
  getAdventurePackagePath,
  listApprovedAdventurePackages,
  loadAdventurePackage,
  loadStoredAdventurePackage,
  saveAdventurePackage,
  saveApprovedAdventureJson,
  type AdventureJsonV1,
  type AdventurePackageFileIO,
  type AdventureSourcePackage,
  type SaveAdventureJsonResult,
  type SaveAdventurePackageResult,
  type StoredAdventurePackage,
} from "@codex/adventure-engine";
import type { AdventureVaultRootResolver } from "./adventure-session-repository.js";
import {
  withAdventurePackagePinLock,
  type AdventurePackagePinLock,
} from "./adventure-package-pin-lock.js";

function splitPackagePath(path: string): { dirs: string[]; fileName: string } {
  const parts = path.split("/").filter((part) => part.length > 0);
  if (
    parts.length === 0 ||
    parts.some((part) => part === "." || part === "..")
  ) {
    throw new Error(`Invalid adventure package path: "${path}"`);
  }
  return {
    dirs: parts.slice(0, -1),
    fileName: parts[parts.length - 1],
  };
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "NotFoundError"
  );
}

async function resolveDirectory(
  root: FileSystemDirectoryHandle,
  dirs: string[],
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  let current = root;
  for (const segment of dirs) {
    try {
      current = await current.getDirectoryHandle(segment, { create });
    } catch (error) {
      if (!create && isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }
  return current;
}

/**
 * Provides Vault-backed `AdventurePackageFileIO` and persistence helpers for
 * approved `AdventureSourcePackage` files under `.codex/adventures/packages/`.
 */
export class AdventurePackageRepository {
  private rootResolver?: AdventureVaultRootResolver;
  private withPackagePinLock: AdventurePackagePinLock =
    withAdventurePackagePinLock;
  private readPinnedHashes?: (vaultId: string) => Promise<ReadonlySet<string>>;

  constructor(resolveVaultRoot?: AdventureVaultRootResolver) {
    this.rootResolver = resolveVaultRoot;
  }

  setRootResolver(resolveVaultRoot: AdventureVaultRootResolver): void {
    this.rootResolver = resolveVaultRoot;
  }

  setPackagePinCoordination(
    withLock: AdventurePackagePinLock,
    readPinnedHashes: (vaultId: string) => Promise<ReadonlySet<string>>,
  ): void {
    this.withPackagePinLock = withLock;
    this.readPinnedHashes = readPinnedHashes;
  }

  private async requireRoot(
    vaultId: string,
  ): Promise<FileSystemDirectoryHandle> {
    if (!this.rootResolver) {
      throw new Error("adventure-package-storage-not-configured");
    }
    return this.rootResolver(vaultId);
  }

  createIO(vaultId: string): AdventurePackageFileIO {
    return {
      exists: async (path: string): Promise<boolean> => {
        const root = await this.requireRoot(vaultId);
        const { dirs, fileName } = splitPackagePath(path);
        const dir = await resolveDirectory(root, dirs, false);
        if (!dir) return false;
        try {
          await dir.getFileHandle(fileName, { create: false });
          return true;
        } catch (error) {
          if (isNotFoundError(error)) return false;
          throw error;
        }
      },
      read: async (path: string): Promise<string> => {
        const root = await this.requireRoot(vaultId);
        const { dirs, fileName } = splitPackagePath(path);
        const dir = await resolveDirectory(root, dirs, false);
        if (!dir) {
          throw new Error(`Adventure package directory missing for "${path}"`);
        }
        const handle = await dir.getFileHandle(fileName, { create: false });
        return (await handle.getFile()).text();
      },
      write: async (path: string, content: string): Promise<void> => {
        const root = await this.requireRoot(vaultId);
        const { dirs, fileName } = splitPackagePath(path);
        const dir = await resolveDirectory(root, dirs, true);
        if (!dir) {
          throw new Error(`Unable to create directory for "${path}"`);
        }
        const handle = await dir.getFileHandle(fileName, { create: true });
        const writable = await handle.createWritable();
        try {
          await writable.write(content);
        } finally {
          await writable.close();
        }
      },
      list: async (dirPath: string): Promise<string[]> => {
        const root = await this.requireRoot(vaultId);
        const segments = dirPath.split("/").filter((part) => part.length > 0);
        const dir = await resolveDirectory(root, segments, false);
        if (!dir) return [];
        const results: string[] = [];
        for await (const [name, handle] of (
          dir as FileSystemDirectoryHandle & {
            entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
          }
        ).entries()) {
          if (handle.kind === "file") {
            results.push(`${dirPath}/${name}`);
          }
        }
        return results;
      },
      remove: async (path: string): Promise<void> => {
        const root = await this.requireRoot(vaultId);
        const { dirs, fileName } = splitPackagePath(path);
        const dir = await resolveDirectory(root, dirs, false);
        if (!dir) return;
        try {
          await dir.removeEntry(fileName);
        } catch (error) {
          if (!isNotFoundError(error)) throw error;
        }
      },
    };
  }

  async saveApproved(
    vaultId: string,
    pkg: AdventureSourcePackage,
  ): Promise<SaveAdventurePackageResult> {
    const approved = approveAdventurePackage(pkg);
    return saveAdventurePackage(this.createIO(vaultId), approved);
  }

  async saveApprovedJson(
    vaultId: string,
    pkg: AdventureJsonV1,
  ): Promise<SaveAdventureJsonResult> {
    return saveApprovedAdventureJson(this.createIO(vaultId), pkg);
  }

  async load(
    vaultId: string,
    documentHash: string,
  ): Promise<AdventureSourcePackage | null> {
    return loadAdventurePackage(this.createIO(vaultId), documentHash);
  }

  async loadStored(
    vaultId: string,
    hash: string,
  ): Promise<StoredAdventurePackage | null> {
    return loadStoredAdventurePackage(this.createIO(vaultId), hash);
  }

  async listApproved(vaultId: string): Promise<StoredAdventurePackage[]> {
    return listApprovedAdventurePackages(this.createIO(vaultId));
  }

  /**
   * Removes one approved version's file, refusing when any session pins its
   * hash. The authoritative session scan and file removal run under the same
   * cross-tab lock as pinning.
   */
  async removeApproved(
    vaultId: string,
    hash: string,
    _pinnedHashes: ReadonlySet<string> = new Set(),
  ): Promise<
    | { status: "removed"; hash: string; path: string }
    | { status: "refused"; hash: string; path: string; reason: string }
  > {
    return this.withPackagePinLock(vaultId, hash, async () => {
      const path = getAdventurePackagePath(hash);
      if (!this.readPinnedHashes) {
        throw new Error("adventure-session-pin-scan-unavailable");
      }
      const currentPinnedHashes = await this.readPinnedHashes(vaultId);
      if (currentPinnedHashes.has(hash)) {
        return {
          status: "refused",
          hash,
          path,
          reason:
            "This version is still in use by an adventure session, so it cannot be removed. Sessions keep playing the exact version they started with.",
        };
      }
      const io = this.createIO(vaultId);
      if (!io.remove) {
        throw new Error("Adventure package storage does not support removal.");
      }
      await io.remove(path);
      return { status: "removed", hash, path };
    });
  }
}

export const adventurePackageRepository = new AdventurePackageRepository();
