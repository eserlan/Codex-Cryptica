import { vaultEventBus } from "./events.svelte";
import * as vaultEntities from "./entities";
import { debugStore } from "../debug.svelte";
import { cacheService } from "../../services/cache.svelte";
import type { LocalEntity, BatchCreateInput } from "./types";
import { VaultRepository } from "@codex/vault-engine";
import type { Entity } from "schema";
import type { EntityPersistenceService } from "./entity-persistence";
import type { EntityContentLoader } from "./entity-content-loader.svelte";
import type { IVaultServices } from "./service-registry";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

export interface MutationDependencies {
  repository: VaultRepository;
  persistence: EntityPersistenceService;
  loader: EntityContentLoader;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveFolderHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
  invalidateUrlCache?: (path: string) => void;
  getServices: () => IVaultServices | null;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;
  onEntitiesUpdated?: (
    oldEntities: Record<string, LocalEntity>,
    newEntities: Record<string, LocalEntity>,
  ) => void;
  onConnectionAdded?: (
    sourceId: string,
    targetId: string,
    connection: any,
  ) => void;
  onConnectionRemoved?: (
    sourceId: string,
    targetId: string,
    connectionType: string,
  ) => void;
  onConnectionUpdated?: (
    sourceId: string,
    targetId: string,
    oldType: string,
    connection: any,
  ) => void;
  getInboundConnections?: () => Record<
    string,
    { sourceId: string; connection: any }[]
  >;
  getParentToChildren?: () => Record<string, string[]>;
}

export class EntityMutationService {
  constructor(public deps: MutationDependencies) {}

  registerStoreCallbacks(
    callbacks: Partial<
      Pick<
        MutationDependencies,
        | "onEntityDelete"
        | "onBatchUpdate"
        | "onEntitiesUpdated"
        | "onConnectionAdded"
        | "onConnectionRemoved"
        | "onConnectionUpdated"
        | "getInboundConnections"
        | "getParentToChildren"
      >
    >,
  ) {
    this.deps = {
      ...this.deps,
      ...callbacks,
    };
  }

  get entities() {
    return this.deps.repository.entities;
  }

  set entities(val: Record<string, LocalEntity>) {
    const oldVal = this.deps.repository.entities;
    this.deps.repository.entities = val;
    this.deps.onEntitiesUpdated?.(oldVal, val);
  }

  async createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ): Promise<string> {
    const newEntity = vaultEntities.createEntity(
      title,
      type,
      initialData,
      this.entities,
    );
    const updatedEntities = { ...this.entities };
    updatedEntities[newEntity.id] = newEntity;
    this.entities = updatedEntities;

    this.deps.loader.markContentLoaded(newEntity.id);

    const activeVaultId = this.deps.activeVaultId();
    await this.deps.persistence.scheduleSave(newEntity);

    if (activeVaultId) {
      await this.deps.updateEntityCount(
        activeVaultId,
        Object.keys(this.entities).length,
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
    const existing = this.entities[id];
    if (!existing) return false;

    const safeUpdates = {
      ...updates,
      content:
        updates.content !== undefined ? updates.content : existing.content,
      lore: updates.lore !== undefined ? updates.lore : existing.lore,
    };

    const { entities, updated } = vaultEntities.updateEntity(
      this.entities,
      id,
      safeUpdates,
    );
    if (!updated) return false;

    this.entities = entities;

    if (
      updates.content !== undefined ||
      updates.lore !== undefined ||
      updates.title !== undefined ||
      updates.labels !== undefined
    ) {
      this.deps.loader.markContentLoaded(id);
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

    await this.deps.persistence.scheduleSave(updated);

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
    const currentEntities = this.entities;
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
        modifiedAt: Date.now(),
      } as LocalEntity;

      newEntities[id] = merged;
      appliedUpdates[id] = patch;
      hasChanges = true;

      if (
        patch.content !== undefined ||
        patch.lore !== undefined ||
        patch.title !== undefined ||
        patch.labels !== undefined
      ) {
        this.deps.loader.markContentLoaded(id);
      }

      if (patch.image && this.deps.invalidateUrlCache) {
        this.deps.invalidateUrlCache(patch.image);
      }

      savePromises.push(this.deps.persistence.scheduleSave(merged));
    }

    if (hasChanges) {
      this.entities = newEntities;
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
    if (sessionModeStore.isDemoMode) {
      const updated = { ...this.entities };
      delete updated[id];
      this.entities = updated;
      if (this.deps.onEntityDelete) this.deps.onEntityDelete(id);
      return;
    }

    const lockKey = id;
    return this.deps.repository.enqueueSave(lockKey, async () => {
      const vaultHandle = await this.deps.getActiveVaultHandle();
      const localHandle = await this.deps.getActiveFolderHandle();
      const activeVaultId = this.deps.activeVaultId();

      if (vaultHandle && activeVaultId) {
        const entity = this.entities[id];
        const path = entity?._path || [`${id}.md`];

        const inboundConns = this.deps.getInboundConnections?.();
        const parentToChildren = this.deps.getParentToChildren?.();
        const childrenIds = parentToChildren
          ? parentToChildren[id] || []
          : undefined;

        const { entities, deletedEntity, modifiedIds } =
          await vaultEntities.deleteEntity(
            vaultHandle,
            this.entities,
            id,
            inboundConns,
            childrenIds,
          );

        if (deletedEntity) {
          this.entities = entities;
          if (this.deps.onEntityDelete) this.deps.onEntityDelete(id);

          import("./registry").then((m) =>
            m.updateLastInternalChange(activeVaultId),
          );

          modifiedIds.forEach((mId) => {
            const modEntity = this.entities[mId];
            if (modEntity) {
              this.deps.persistence.scheduleSave(modEntity);
            }
          });

          vaultEventBus.emit({
            type: "ENTITY_DELETED",
            vaultId: activeVaultId,
            entityId: id,
          });

          await this.deps.updateEntityCount(
            activeVaultId,
            Object.keys(this.entities).length,
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
                }
              }
            } catch (e) {
              debugStore.warn(
                `[EntityMutation] Failed to delete ${path.join("/")} from local filesystem`,
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
      this.entities,
      sourceId,
      targetId,
      type,
      label,
      strength,
    );
    if (updatedSource) {
      this.entities = entities;
      await this.deps.persistence.scheduleSave(updatedSource);

      const newConn = updatedSource.connections.find(
        (c) => c.target === targetId && c.type === type,
      );
      if (newConn && this.deps.onConnectionAdded) {
        this.deps.onConnectionAdded(sourceId, targetId, newConn);
      }
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
      this.entities,
      sourceId,
      targetId,
      oldType,
      newType,
      newLabel,
    );
    if (updatedSource) {
      this.entities = entities;
      await this.deps.persistence.scheduleSave(updatedSource);

      const updatedConn = updatedSource.connections.find(
        (c) => c.target === targetId && c.type === newType,
      );
      if (updatedConn && this.deps.onConnectionUpdated) {
        this.deps.onConnectionUpdated(sourceId, targetId, oldType, updatedConn);
      }
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
      this.entities,
      sourceId,
      targetId,
      type,
    );
    if (updatedSource) {
      this.entities = entities;
      await this.deps.persistence.scheduleSave(updatedSource);

      if (this.deps.onConnectionRemoved) {
        this.deps.onConnectionRemoved(sourceId, targetId, type);
      }

      // CONNECTION_REMOVED carries the full semantic; ENTITY_UPDATED with a
      // connections-only patch was redundant and triggered unnecessary fan-out.
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
      this.entities,
      id,
      label,
    );
    if (updated) {
      this.entities = entities;
      await this.deps.persistence.scheduleSave(updated);

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
      this.entities,
      id,
      label,
    );
    if (updated) {
      this.entities = entities;
      await this.deps.persistence.scheduleSave(updated);

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
      this.entities,
      ids,
      label,
    );
    if (modifiedIds.length > 0) {
      this.entities = entities;
      const changed: LocalEntity[] = [];
      const savePromises: Promise<void>[] = [];
      for (const id of modifiedIds) {
        const entity = entities[id];
        if (entity) {
          savePromises.push(this.deps.persistence.scheduleSave(entity));
          changed.push(entity);
        }
      }
      await Promise.all(savePromises);
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
      this.entities,
      ids,
      label,
    );
    if (modifiedIds.length > 0) {
      this.entities = entities;
      const changed: LocalEntity[] = [];
      const savePromises: Promise<void>[] = [];
      for (const id of modifiedIds) {
        const entity = entities[id];
        if (entity) {
          savePromises.push(this.deps.persistence.scheduleSave(entity));
          changed.push(entity);
        }
      }
      await Promise.all(savePromises);
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
      this.entities,
      newEntitiesList,
    );
    this.entities = entities;

    const savePromises = created.map(async (entity) => {
      this.deps.loader.markContentLoaded(entity.id);
      await this.deps.persistence.scheduleSave(entity);
    });

    const activeVaultId = this.deps.activeVaultId();
    await Promise.all(savePromises);

    if (activeVaultId) {
      await this.deps.updateEntityCount(
        activeVaultId,
        Object.keys(this.entities).length,
      );
    }

    vaultEventBus.emit({
      type: "BATCH_CREATED",
      vaultId: activeVaultId || "unknown",
      entities: created,
    });
  }
}
