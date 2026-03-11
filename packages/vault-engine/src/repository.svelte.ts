import { KeyedTaskQueue } from "./queue";
import type { LocalEntity, FileEntry } from "./types";

export interface IFileIOAdapter {
  walkDirectory(dir: FileSystemDirectoryHandle): Promise<FileEntry[]>;
  readFileAsText(fileEntry: FileEntry): Promise<string>;
  writeEntityFile(
    dir: FileSystemDirectoryHandle,
    vaultId: string,
    entity: LocalEntity,
  ): Promise<void>;
  getCachedEntity(
    vaultId: string,
    path: string,
  ): Promise<{ lastModified: number; entity: LocalEntity } | null>;
  setCachedEntity(
    vaultId: string,
    path: string,
    lastModified: number,
    entity: LocalEntity,
  ): Promise<void>;
  parseMarkdown(text: string, filePath: string[]): LocalEntity | null;
}

export class VaultRepository {
  entities = $state<Record<string, LocalEntity>>({});
  saveQueue = new KeyedTaskQueue();

  constructor(private ioAdapter: IFileIOAdapter) {}

  get pendingSaveCount() {
    return this.saveQueue.totalPendingCount;
  }

  async loadFiles(
    activeVaultId: string,
    vaultHandle: FileSystemDirectoryHandle,
    onProgress?: (
      chunkEntities: Record<string, LocalEntity>,
      current: number,
      total: number,
    ) => Promise<void> | void,
  ) {
    const files = await this.ioAdapter.walkDirectory(vaultHandle);

    const mdFiles = files.filter((f) => {
      const name = f.path[f.path.length - 1].toLowerCase();
      return name.endsWith(".md") || name.endsWith(".markdown");
    });

    const total = mdFiles.length;
    const newEntities: Record<string, LocalEntity> = {};

    const processFile = async (fileEntry: FileEntry) => {
      const filePath = fileEntry.path.join("/");
      const file = await fileEntry.handle.getFile();
      const lastModified = file.lastModified;

      const cached = await this.ioAdapter.getCachedEntity(
        activeVaultId,
        filePath,
      );

      let entity: LocalEntity | null;

      if (cached && cached.lastModified === lastModified) {
        entity = { ...cached.entity, _path: fileEntry.path };
      } else {
        const text = await this.ioAdapter.readFileAsText(fileEntry);
        entity = this.ioAdapter.parseMarkdown(text, fileEntry.path);

        if (entity) {
          await this.ioAdapter.setCachedEntity(
            activeVaultId,
            filePath,
            lastModified,
            entity,
          );
        }
      }

      if (!entity || !entity.id) return null;
      return entity;
    };

    const CHUNK_SIZE = 40;
    for (let i = 0; i < mdFiles.length; i += CHUNK_SIZE) {
      const chunk = mdFiles.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(chunk.map(processFile));

      const chunkEntities: Record<string, LocalEntity> = {};
      for (const entity of chunkResults) {
        if (entity) {
          newEntities[entity.id] = entity;
          chunkEntities[entity.id] = entity;
        }
      }

      if (onProgress) {
        await onProgress(chunkEntities, Math.min(i + CHUNK_SIZE, total), total);
      }

      if (total > CHUNK_SIZE) {
        // Yield to allow UI updates
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    this.entities = newEntities;
    return newEntities;
  }

  async saveToDisk(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    activeVaultId: string,
    entity: LocalEntity,
    isGuest: boolean,
  ) {
    if (isGuest || !vaultHandle) return;

    await this.ioAdapter.writeEntityFile(vaultHandle, activeVaultId, entity);
  }

  scheduleSave(
    vaultHandle: FileSystemDirectoryHandle | undefined,
    activeVaultId: string,
    entity: LocalEntity,
    isGuest: boolean,
    onStatusChange: (status: "saving" | "idle" | "error") => void,
  ): Promise<void> {
    onStatusChange("saving");

    return this.saveQueue
      .enqueue(entity.id, async () => {
        await this.saveToDisk(vaultHandle, activeVaultId, entity, isGuest);
        onStatusChange("idle");
      })
      .catch((err) => {
        console.error("Save failed for", entity.title, err);
        onStatusChange("error");
      });
  }

  async waitForAllSaves() {
    await this.saveQueue.waitForAll();
  }

  clear() {
    this.entities = {};
  }
}
