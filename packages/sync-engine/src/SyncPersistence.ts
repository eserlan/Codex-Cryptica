import { type ISyncBackend, type FileMetadata, type SyncEntry } from "./types";
import { SyncRegistry } from "./SyncRegistry";
import { OpfsBackend } from "./OpfsBackend";
import { FileSystemBackend } from "./FileSystemBackend";

export class SyncPersistence {
  constructor(private registry: SyncRegistry) {}

  getSerializableId(
    metadata: FileMetadata,
    backend: ISyncBackend,
    registryEntry?: SyncEntry,
  ): string | undefined {
    return typeof metadata.handle === "string"
      ? metadata.handle
      : backend instanceof FileSystemBackend
        ? undefined
        : registryEntry?.remoteId;
  }

  async persistOpfsStateIfNeeded(
    vaultId: string,
    backend: ISyncBackend,
    path: string,
    metadata: FileMetadata,
  ) {
    if (!(backend instanceof OpfsBackend) || !metadata.hash) return;

    await this.registry.putOpfsState({
      vaultId,
      filePath: path,
      hash: metadata.hash,
      size: metadata.size,
      lastModified: metadata.lastModified,
    });
  }

  async deleteOpfsStateIfNeeded(
    vaultId: string,
    backend: ISyncBackend,
    path: string,
  ) {
    if (!(backend instanceof OpfsBackend)) return;
    await this.registry.deleteOpfsState(vaultId, path);
  }
}
