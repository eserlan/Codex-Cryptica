import type { LocalEntity } from "./types";
import type { VaultRepository } from "@codex/vault-engine";
import type { Entity } from "schema";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import { uiStore } from "../ui.svelte";
import type { EntityContentLoader } from "./entity-content-loader.svelte";

export interface EntityPersistenceDependencies {
  repository: VaultRepository;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getSpecificVaultHandle: (
    vaultId: string,
  ) => Promise<FileSystemDirectoryHandle | undefined>;
  setStatus: (status: "idle" | "loading" | "saving" | "error") => void;
  setErrorMessage: (msg: string | null) => void;
  onEntityUpdate?: (entity: LocalEntity) => void;
}

const SAVE_DEBOUNCE_MS = 400;

export class EntityPersistence {
  private _saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private _saveResolvers = new Map<string, Array<() => void>>();

  constructor(
    private deps: EntityPersistenceDependencies,
    private contentLoader: EntityContentLoader,
  ) {}

  scheduleSave(entity: LocalEntity | Entity): Promise<void> {
    if (this.deps.onEntityUpdate)
      this.deps.onEntityUpdate(entity as LocalEntity);

    const vaultIdAtStart = this.deps.activeVaultId();
    if (!vaultIdAtStart) return Promise.resolve();

    if (uiStore.isDemoMode) return Promise.resolve();

    const id = entity.id;

    const existing = this._saveTimers.get(id);
    if (existing) clearTimeout(existing);

    return new Promise<void>((resolve) => {
      const resolvers = this._saveResolvers.get(id) ?? [];
      resolvers.push(resolve);
      this._saveResolvers.set(id, resolvers);

      this._saveTimers.set(
        id,
        setTimeout(() => {
          this._saveTimers.delete(id);
          this._saveResolvers.delete(id);
          this.deps.repository.saveQueue
            .enqueue(id, () => this._persistEntity(id, vaultIdAtStart))
            .then(() => resolvers.forEach((r) => r()))
            .catch(() => resolvers.forEach((r) => r()));
        }, SAVE_DEBOUNCE_MS),
      );
    });
  }

  async flushPendingSaves(): Promise<void> {
    for (const [id, timer] of this._saveTimers) {
      clearTimeout(timer);
      this._saveTimers.delete(id);
      const resolvers = this._saveResolvers.get(id) ?? [];
      this._saveResolvers.delete(id);
      const vaultId = this.deps.activeVaultId();
      if (vaultId) {
        await this.deps.repository.saveQueue.enqueue(id, () =>
          this._persistEntity(id, vaultId),
        );
      }
      resolvers.forEach((r) => r());
    }
    await this.deps.repository.waitForAllSaves();
  }

  private async _persistEntity(
    id: string,
    vaultIdAtStart: string,
  ): Promise<void> {
    if (this.deps.activeVaultId() !== vaultIdAtStart) {
      debugStore.log(
        `[EntityPersistence] Discarding save for ${id} - vault changed.`,
      );
      return;
    }

    let latestEntity = this.deps.repository.entities[id];
    if (!latestEntity) return;

    if (!this.contentLoader.isContentLoaded(id)) {
      await this.contentLoader.internalLoadContent(id);
      latestEntity = this.deps.repository.entities[id] || latestEntity;
    }

    this.deps.setStatus("saving");
    try {
      const vaultHandle =
        await this.deps.getSpecificVaultHandle(vaultIdAtStart);
      if (!vaultHandle) {
        this.deps.setStatus("idle");
        return;
      }

      await this.deps.repository.saveToDisk(
        vaultHandle,
        vaultIdAtStart,
        latestEntity,
        this.deps.isGuest(),
      );

      import("./registry").then((m) =>
        m.updateLastInternalChange(vaultIdAtStart),
      );

      const path = latestEntity._path || [`${latestEntity.id}.md`];
      await cacheService.set(
        `${vaultIdAtStart}:${path.join("/")}`,
        Date.now(),
        latestEntity,
      );

      this.contentLoader.markContentLoaded(latestEntity.id);
      this.deps.setStatus("idle");
    } catch (error) {
      debugStore.error("[EntityPersistence] Failed to save entity to disk", error);
      this.deps.setStatus("error");
      this.deps.setErrorMessage("Failed to access storage for saving.");
    }
  }
}
