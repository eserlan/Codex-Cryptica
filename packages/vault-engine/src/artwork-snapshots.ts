interface SnapshotFileDependencies {
  lock<T>(key: string, action: () => Promise<T>): Promise<T>;
  exists(path: string): Promise<boolean>;
  write(path: string, blob: Blob): Promise<void>;
  read(path: string): Promise<Blob>;
  remove(path: string): Promise<void>;
}
function assertPath(path: string): void {
  if (!/^images\/artwork_[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(path))
    throw new Error("Invalid snapshot path");
}
/** Vault-local byte-preserving IO, backed by a shared lock and injected file operations. */
export class ArtworkSnapshotFiles {
  constructor(private readonly deps: SnapshotFileDependencies) {}
  async writeNew(path: string, blob: Blob): Promise<void> {
    assertPath(path);
    await this.deps.lock(`artwork-snapshot:${path}`, async () => {
      if (await this.deps.exists(path))
        throw new Error("Snapshot already exists");
      try {
        await this.deps.write(path, blob);
      } catch (error) {
        // The path was absent under the lock, so only this attempted write can
        // have created it. Do not leave a partial snapshot behind.
        await this.deps.remove(path).catch(() => {});
        throw error;
      }
    });
  }
  read(path: string): Promise<Blob> {
    assertPath(path);
    return this.deps.read(path);
  }
  remove(path: string): Promise<void> {
    assertPath(path);
    return this.deps.remove(path);
  }
}

/** Construct the snapshot boundary over the Vault's existing file adapter. */
export function createArtworkSnapshotFiles(
  io: import("./asset-types").IAssetIOAdapter,
  root: FileSystemDirectoryHandle,
  vaultId: string,
  lock: <T>(key: string, action: () => Promise<T>) => Promise<T>,
): ArtworkSnapshotFiles {
  return new ArtworkSnapshotFiles({
    lock: (key, action) => lock(`${vaultId}:${key}`, action),
    exists: async (path) => {
      try {
        await io.readOpfsBlob(path.split("/"), root);
        return true;
      } catch (error) {
        if (io.isNotFoundError(error)) return false;
        throw error;
      }
    },
    write: (path, blob) =>
      io.writeOpfsFile(path.split("/"), blob, root, vaultId),
    read: (path) => io.readOpfsBlob(path.split("/"), root),
    remove: async (path) => {
      if (!io.deleteFile) throw new Error("Snapshot deletion unavailable");
      await io.deleteFile(path.split("/"), root, vaultId);
    },
  });
}
