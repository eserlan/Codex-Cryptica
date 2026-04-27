import { vaultEventBus } from "./events";
import type { LocalEntity, BatchCreateInput } from "./types";
import * as vaultEntities from "./entities";
import type { VaultRepository } from "@codex/vault-engine";
import type { Entity } from "schema";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import { uiStore } from "../ui.svelte";
import type { EntityContentLoader } from "./entity-content-loader.svelte";
import type { EntityPersistence } from "./entity-persistence";
import type { IVaultServices } from "./service-registry";

export interface EntityMutationsDependencies {
  repository: VaultRepository;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveSyncHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getServices: () => IVaultServices | null;
  invalidateUrlCache?: (path: string) => void;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;
}

export class EntityMutations {
  constructor(
    private deps: EntityMutationsDependencies,
    private persistence: EntityPersistence,
    private contentLoader: EntityContentLoader,
  ) {}

  async createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ): Promise<string> {
    const newEntity = vaultEntities.createEntity(
      title,
      type,
      initialData,
      this.deps.repository.entities,
    );
    const updatedEntities = { ...this.deps.repository.entities };
    updatedEntities[newEntity.id] = newEntity;
    this.deps.repository.entities = updatedEntities;

    this.contentLoader.markContentLoaded(newEntity.id);

    const activeVaultId = this.deps.activeVaultId();
    await this.persistence.scheduleSave(newEntity);

    if (activeVaultId) {
      await this.deps.updateEntityCount(
        activeVaultId,
        Object.keys(this.deps.repository.entities).length,
      );
    }

    vaultEventBus.emit({
      type: "BATCH_CREATED",
      vaultId: activeVaultId || "unknown",
      entities: [newEntity],
    });

    return newEntity.id;
  }

  async updateEntity(
    id: string,
    updates: Partial<LocalEntity>,
  ): Promise<boolean> {
    const existing = this.deps.repository.entities[id];
    if (!existing) return false;

    const safeUpdates = {
      ...updates,
      content:
        updates.content !== undefined ? updates.content : existing.content,
      lore: updates.lore !== undefined ? updates.lore : existing.lore,
    };

    const { entities, updated } = vaultEntities.updateEntity(
      this.deps.repository.entities,
      id,
      safeUpdates,
    );
    if (!updated) return false;

    this.deps.repository.entities = entities;

    if (
      updates.content !== undefined ||
      updates.lore !== undefined ||
      updates.title !== undefined ||
      updates.tags !== undefined
    ) {
      this.contentLoader.markContentLoaded(id);
    }

    if (updates.image && this.deps.invalidateUrlCache) {
      this.deps.invalidateUrlCache(updates.image);
    }

    const services = this.deps.getServices();
    if (
      services?.ai &&
      ["art style", "style", "visual aesthetic"].some((kw) =>
        updated.title.toLowerCase().includes(kw),
      )
    ) {
      services.ai.clearStyleCache();
    }

    await this.persistence.scheduleSave(updated);

    vaultEventBus.emit({
      type: "ENTITY_UPDATED",
      vaultId: this.deps.activeVaultId() || "unknown",
      entity: updated,
      patch: updates,
    });

    return true;
  }

  async batchUpdate(
    updates: Record<string, Partial<LocalEntity>>,
  ): Promise<boolean> {
    let hasChanges = false;
    const currentEntities = this.deps.repository.entities;
    const newEntities = { ...currentEntities };
    const appliedUpdates: Record<string, Partial<LocalEntity>> = {};
    const savePromises: Promise<void>[] = [];

    for (const [id, patch] of Object.entries(updates)) {
      if (!currentEntities[id]) continue;
      const current = currentEntities[id];

      const preserveGuestContent =
        this.deps.isGuest() && patch.content === "" && !!current.content;
      const merged = {
        ...current,
        ...patch,
        metadata:
          patch.metadata !== undefined
            ? { ...(current.metadata ?? {}), ...patch.metadata }
            : current.metadata,
        content:
          patch.content !== undefined
            ? preserveGuestContent
              ? current.content
              : patch.content
            : current.content,
        lore: patch.lore !== undefined ? patch.lore : current.lore,
        updatedAt: Date.now(),
      } as LocalEntity;

      newEntities[id] = merged;
      appliedUpdates[id] = patch;
      hasChanges = true;

      if (
        patch.content !== undefined ||
        patch.lore !== undefined ||
        patch.title !== undefined ||
        patch.tags !== undefined
      ) {
        this.contentLoader.markContentLoaded(id);
      }

      if (patch.image && this.deps.invalidateUrlCache) {
        this.deps.invalidateUrlCache(patch.image);
      }

      savePromises.push(this.persistence.scheduleSave(merged));
    }

    if (hasChanges) {
      this.deps.repository.entities = newEntities;
      if (this.deps.onBatchUpdate) this.deps.onBatchUpdate(appliedUpdates);
      await Promise.all(savePromises);

      vaultEventBus.emit({
        type: "BATCH_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entities: Object.keys(appliedUpdates).map((id) => newEntities[id]),
        patches: appliedUpdates,
      });

      return true;
    }
    return false;
  }

  async deleteEntity(id: string) {
    if (this.deps.isGuest())
      throw new Error("Cannot delete entities in Guest Mode");
    if (uiStore.isDemoMode) {
      const updated = { ...this.deps.repository.entities };
      delete updated[id];
      this.deps.repository.entities = updated;
      if (this.deps.onEntityDelete) this.deps.onEntityDelete(id);
      return;
    }

    const lockKey = id;
    return this.deps.repository.saveQueue.enqueue(lockKey, async () => {
      const vaultHandle = await this.deps.getActiveVaultHandle();
      const localHandle = await this.deps.getActiveSyncHandle();
      const activeVaultId = this.deps.activeVaultId();

      if (vaultHandle && activeVaultId) {
        const entity = this.deps.repository.entities[id];
        const path = entity?._path || [`${id}.md`];

        const { entities, deletedEntity, modifiedIds } =
          await vaultEntities.deleteEntity(vaultHandle, this.deps.repository.entities, id);

        if (deletedEntity) {
          this.deps.repository.entities = entities;
          if (this.deps.onEntityDelete) this.deps.onEntityDelete(id);

          import("./registry").then((m) =>
            m.updateLastInternalChange(activeVaultId),
          );

          modifiedIds.forEach((mId) => {
            const modEntity = this.deps.repository.entities[mId];
            if (modEntity) {
              this.persistence.scheduleSave(modEntity);
            }
          });

          vaultEventBus.emit({
            type: "ENTITY_DELETED",
            vaultId: activeVaultId,
            entityId: id,
          });

          await this.deps.updateEntityCount(
            activeVaultId,
            Object.keys(this.deps.repository.entities).length,
          );

          if (localHandle) {
            try {
              const permission = await localHandle.queryPermission({
                mode: "readwrite",
              });
              if (permission === "granted") {
                const fileName = path[path.length - 1];
                const dirPath = path.slice(0, -1);
                let targetDir: FileSystemDirectoryHandle | undefined =
                  localHandle;

                for (const part of dirPath) {
                  targetDir = await targetDir
                    ?.getDirectoryHandle(part, { create: false })
                    .catch(() => undefined);
                  if (!targetDir) break;
                }

                if (targetDir) {
                  await targetDir.removeEntry(fileName, { recursive: true });
                  debugStore.log(
                    `[EntityMutations] Deleted ${path.join("/")} from local filesystem`,
                  );
                }
              }
            } catch (e) {
              debugStore.warn(
                `[EntityMutations] Failed to delete ${path.join("/")} from local filesystem`,
                e,
              );
            }
          }

          await cacheService.remove(`${activeVaultId}:${path.join("/")}`);
        }
      }
    });
  }

  async addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
    strength: number = 1.0,
  ): Promise<boolean> {
    const { entities, updatedSource } = vaultEntities.addConnection(
      this.deps.repository.entities,
      sourceId,
      targetId,
      type,
      label,
      strength,
    );
    if (updatedSource) {
      this.deps.repository.entities = entities;
      await this.persistence.scheduleSave(updatedSource);

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entity: updatedSource,
        patch: { connections: updatedSource.connections },
      });

      return true;
    }
    return false;
  }

  async updateConnection(
    sourceId: string,
    targetId: string,
    oldType: string,
    newType: string,
    newLabel?: string,
  ): Promise<boolean> {
    const { entities, updatedSource } = vaultEntities.updateConnection(
      this.deps.repository.entities,
      sourceId,
      targetId,
      oldType,
      newType,
      newLabel,
    );
    if (updatedSource) {
      this.deps.repository.entities = entities;
      await this.persistence.scheduleSave(updatedSource);

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entity: updatedSource,
        patch: { connections: updatedSource.connections },
      });

      return true;
    }
    return false;
  }

  async removeConnection(
    sourceId: string,
    targetId: string,
    type: string,
  ): Promise<boolean> {
    const { entities, updatedSource } = vaultEntities.removeConnection(
      this.deps.repository.entities,
      sourceId,
      targetId,
      type,
    );
    if (updatedSource) {
      this.deps.repository.entities = entities;
      await this.persistence.scheduleSave(updatedSource);

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entity: updatedSource,
        patch: { connections: updatedSource.connections },
      });

      vaultEventBus.emit({
        type: "CONNECTION_REMOVED",
        vaultId: this.deps.activeVaultId() || "unknown",
        sourceId,
        targetId,
        connectionType: type,
      });

      return true;
    }
    return false;
  }

  async addLabel(id: string, label: string): Promise<boolean> {
    const { entities, updated } = vaultEntities.addLabel(
      this.deps.repository.entities,
      id,
      label,
    );
    if (updated) {
      this.deps.repository.entities = entities;
      await this.persistence.scheduleSave(updated);

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entity: updated,
        patch: { labels: updated.labels },
      });

      return true;
    }
    return false;
  }

  async removeLabel(id: string, label: string): Promise<boolean> {
    const { entities, updated } = vaultEntities.removeLabel(
      this.deps.repository.entities,
      id,
      label,
    );
    if (updated) {
      this.deps.repository.entities = entities;
      await this.persistence.scheduleSave(updated);

      vaultEventBus.emit({
        type: "ENTITY_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entity: updated,
        patch: { labels: updated.labels },
      });

      return true;
    }
    return false;
  }

  async bulkAddLabel(ids: string[], label: string): Promise<number> {
    const { entities, modifiedIds } = vaultEntities.bulkAddLabel(
      this.deps.repository.entities,
      ids,
      label,
    );
    if (modifiedIds.length > 0) {
      this.deps.repository.entities = entities;
      const changed: LocalEntity[] = [];
      for (const id of modifiedIds) {
        const entity = entities[id];
        if (entity) {
          await this.persistence.scheduleSave(entity);
          changed.push(entity);
        }
      }
      vaultEventBus.emit({
        type: "BATCH_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entities: changed,
      });
    }
    return modifiedIds.length;
  }

  async bulkRemoveLabel(ids: string[], label: string): Promise<number> {
    const { entities, modifiedIds } = vaultEntities.bulkRemoveLabel(
      this.deps.repository.entities,
      ids,
      label,
    );
    if (modifiedIds.length > 0) {
      this.deps.repository.entities = entities;
      const changed: LocalEntity[] = [];
      for (const id of modifiedIds) {
        const entity = entities[id];
        if (entity) {
          await this.persistence.scheduleSave(entity);
          changed.push(entity);
        }
      }
      vaultEventBus.emit({
        type: "BATCH_UPDATED",
        vaultId: this.deps.activeVaultId() || "unknown",
        entities: changed,
      });
    }
    return modifiedIds.length;
  }

  async batchCreateEntities(newEntitiesList: BatchCreateInput[]) {
    const { entities, created } = vaultEntities.batchCreateEntities(
      this.deps.repository.entities,
      newEntitiesList,
    );
    this.deps.repository.entities = entities;

    const savePromises = created.map(async (entity) => {
      this.contentLoader.markContentLoaded(entity.id);
      await this.persistence.scheduleSave(entity);
    });

    const activeVaultId = this.deps.activeVaultId();
    await Promise.all(savePromises);

    if (activeVaultId) {
      await this.deps.updateEntityCount(
        activeVaultId,
        Object.keys(this.deps.repository.entities).length,
      );
    }

    vaultEventBus.emit({
      type: "BATCH_CREATED",
      vaultId: activeVaultId || "unknown",
      entities: created,
    });
  }
}
