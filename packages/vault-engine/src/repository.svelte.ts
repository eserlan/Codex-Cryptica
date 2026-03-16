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
  isNotFoundError(err: any): boolean;
}

const SKEW_MS = 1000;

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
      newOrChanged: Record<string, LocalEntity>,
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
      const lastModified = Math.floor(file.lastModified);

      const cached = await this.ioAdapter.getCachedEntity(
        activeVaultId,
        filePath,
      );

      if (cached && Math.abs(cached.lastModified - lastModified) <= SKEW_MS) {
        const entity: LocalEntity = { ...cached.entity, _path: fileEntry.path };
        return { entity, isHit: true };
      }

      const text = await this.ioAdapter.readFileAsText(fileEntry);
      const entity = this.ioAdapter.parseMarkdown(text, fileEntry.path);

      if (entity) {
        await this.ioAdapter.setCachedEntity(
          activeVaultId,
          filePath,
          lastModified,
          entity,
        );
        return { entity, isHit: false };
      }

      return null;
    };

    const CHUNK_SIZE = 40;
    for (let i = 0; i < mdFiles.length; i += CHUNK_SIZE) {
      const chunk = mdFiles.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(chunk.map(processFile));

      const updatedEntities: Record<string, LocalEntity> = {};
      const newOrChanged: Record<string, LocalEntity> = {};

      for (const res of chunkResults) {
        if (res) {
          newEntities[res.entity.id] = res.entity;
          updatedEntities[res.entity.id] = res.entity;
          if (!res.isHit) {
            newOrChanged[res.entity.id] = res.entity;
          }
        }
      }

      // Update incrementally to allow search/UI to work during load.
      // We only spread if there are actual updates.
      if (Object.keys(updatedEntities).length > 0) {
        const newMap = { ...this.entities };
        for (const [id, entity] of Object.entries(updatedEntities)) {
          const existing = newMap[id];

          // CRITICAL: Metadata-only updates (cache hits) have content = "".
          // We MUST NOT overwrite an existing entity that already has
          // content/lore loaded in memory.
          const finalContent =
            existing?.content && !entity.content
              ? existing.content
              : entity.content;

          const finalLore =
            existing?.lore && !entity.lore ? existing.lore : entity.lore;

          newMap[id] = {
            ...entity,
            content: finalContent,
            lore: finalLore,
          };
        }
        this.entities = newMap;
      }

      if (onProgress) {
        await onProgress(
          updatedEntities,
          Math.min(i + CHUNK_SIZE, total),
          total,
          newOrChanged,
        );
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
