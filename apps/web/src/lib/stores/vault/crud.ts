import * as vaultEntities from "./entities";
import type { LocalEntity, BatchCreateInput } from "./types";
import type { Entity } from "schema";
import { uiStore } from "../ui.svelte";

export class VaultCrudManager {
  constructor(
    private getEntities: () => Record<string, LocalEntity>,
    private setEntities: (entities: Record<string, LocalEntity>) => void,
    private scheduleSave: (entity: LocalEntity) => Promise<void>,
    private getActiveVaultHandle: () => Promise<
      FileSystemDirectoryHandle | undefined
    >,
    private isGuest: () => boolean,
    private getServices: () => any,
    private onEntityDelete?: (id: string) => void,
    private onEntityUpdate?: (entity: LocalEntity) => void,
    private onBatchUpdate?: (
      updates: Record<string, Partial<LocalEntity>>,
    ) => void,
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
      this.getEntities(),
    );
    const entities = this.getEntities();
    entities[newEntity.id] = newEntity;
    this.setEntities(entities);
    await this.scheduleSave(newEntity);
    return newEntity.id;
  }

  async updateEntity(
    id: string,
    updates: Partial<LocalEntity>,
  ): Promise<boolean> {
    const { entities, updated } = vaultEntities.updateEntity(
      this.getEntities(),
      id,
      updates,
    );
    if (!updated) return false;

    this.setEntities(entities);

    const services = this.getServices();
    if (
      services &&
      ["art style", "style", "visual aesthetic"].some((kw) =>
        updated.title.toLowerCase().includes(kw),
      )
    ) {
      services.ai.clearStyleCache();
    }

    await this.scheduleSave(updated);
    return true;
  }

  async batchUpdateEntities(
    updates: Record<string, Partial<LocalEntity>>,
  ): Promise<boolean> {
    let hasChanges = false;
    const currentEntities = this.getEntities();
    const newEntities = { ...currentEntities };
    const appliedUpdates: Record<string, Partial<LocalEntity>> = {};
    const savePromises: Promise<void>[] = [];

    for (const [id, patch] of Object.entries(updates)) {
      if (!currentEntities[id]) continue;
      const current = currentEntities[id];
      const merged = { ...current, ...patch, updatedAt: Date.now() };
      newEntities[id] = merged;
      appliedUpdates[id] = patch;
      hasChanges = true;
      savePromises.push(this.scheduleSave(merged));
    }

    if (hasChanges) {
      this.setEntities(newEntities);
      if (this.onBatchUpdate) this.onBatchUpdate(appliedUpdates);
      await Promise.all(savePromises);
      return true;
    }
    return false;
  }

  async deleteEntity(id: string): Promise<void> {
    if (this.isGuest()) throw new Error("Cannot delete entities in Guest Mode");
    if (uiStore.isDemoMode) {
      uiStore.notify("Deletion is disabled in Demo Mode.", "info");
      return;
    }
    const vaultDir = await this.getActiveVaultHandle();
    if (!vaultDir) return;

    const { entities, deletedEntity, modifiedIds } =
      await vaultEntities.deleteEntity(vaultDir, this.getEntities(), id);
    if (deletedEntity) {
      this.setEntities(entities);
      if (this.onEntityDelete) this.onEntityDelete(id);
      modifiedIds.forEach((mId) => {
        const entity = this.getEntities()[mId];
        if (entity) {
          this.scheduleSave(entity);
          if (this.onEntityUpdate) this.onEntityUpdate(entity);
        }
      });
      const services = this.getServices();
      if (services) await services.search.remove(id);
    }
  }

  async addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
    _strength: number = 1.0,
  ): Promise<boolean> {
    const { entities, updatedSource } = vaultEntities.addConnection(
      this.getEntities(),
      sourceId,
      targetId,
      type,
      label,
      _strength,
    );
    if (updatedSource) {
      this.setEntities(entities);
      await this.scheduleSave(updatedSource);
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
      this.getEntities(),
      sourceId,
      targetId,
      oldType,
      newType,
      newLabel,
    );
    if (updatedSource) {
      this.setEntities(entities);
      await this.scheduleSave(updatedSource);
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
      this.getEntities(),
      sourceId,
      targetId,
      type,
    );
    if (updatedSource) {
      this.setEntities(entities);
      await this.scheduleSave(updatedSource);
      return true;
    }
    return false;
  }

  async addLabel(id: string, label: string): Promise<boolean> {
    const { entities, updated } = vaultEntities.addLabel(
      this.getEntities(),
      id,
      label,
    );
    if (updated) {
      this.setEntities(entities);
      await this.scheduleSave(updated);
      return true;
    }
    return false;
  }

  async bulkAddLabel(ids: string[], label: string): Promise<number> {
    const { entities, modifiedIds } = vaultEntities.bulkAddLabel(
      this.getEntities(),
      ids,
      label,
    );
    if (modifiedIds.length > 0) {
      this.setEntities(entities);
      for (const id of modifiedIds) {
        const entity = entities[id];
        if (entity) await this.scheduleSave(entity);
      }
    }
    return modifiedIds.length;
  }

  async bulkRemoveLabel(ids: string[], label: string): Promise<number> {
    const { entities, modifiedIds } = vaultEntities.bulkRemoveLabel(
      this.getEntities(),
      ids,
      label,
    );
    if (modifiedIds.length > 0) {
      this.setEntities(entities);
      for (const id of modifiedIds) {
        const entity = entities[id];
        if (entity) await this.scheduleSave(entity);
      }
    }
    return modifiedIds.length;
  }

  async removeLabel(id: string, label: string): Promise<boolean> {
    const { entities, updated } = vaultEntities.removeLabel(
      this.getEntities(),
      id,
      label,
    );
    if (updated) {
      this.setEntities(entities);
      await this.scheduleSave(updated);
      return true;
    }
    return false;
  }

  async batchCreateEntities(newEntitiesList: BatchCreateInput[]): Promise<void> {
    const { entities, created } = vaultEntities.batchCreateEntities(
      this.getEntities(),
      newEntitiesList,
    );
    this.setEntities(entities);
    for (const entity of created) {
      await this.scheduleSave(entity);
    }
  }
}
