import * as vaultEntities from "./entities";
import { vaultEventBus } from "./events.svelte";
import type { Entity } from "schema";
import type { LocalEntity, BatchCreateInput } from "./types";
import type { EntityMutationContext } from "./entity-mutation-context";
import type { PerformanceRecorder } from "@codex/performance-observability";
import {
  hasLongFormUpdate,
  markMutationContentLoaded,
} from "./entity-mutation-effects";

export class EntityWriteMutations {
  constructor(
    private readonly context: EntityMutationContext,
    private readonly performanceRecorder: PerformanceRecorder,
  ) {}

  async createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ): Promise<string> {
    const span = this.performanceRecorder.start("entity_save");
    const newEntity = vaultEntities.createEntity(
      title,
      type,
      initialData,
      this.context.entities,
    );
    const updatedEntities = { ...this.context.entities };
    updatedEntities[newEntity.id] = newEntity;
    this.context.entities = updatedEntities;

    this.context.deps.loader.markContentLoaded(newEntity.id);

    const activeVaultId = this.context.deps.activeVaultId();
    await this.context.deps.persistence.scheduleSave(newEntity, {
      immediate: true,
    });

    if (activeVaultId) {
      await this.context.deps.updateEntityCount(
        activeVaultId,
        Object.keys(this.context.entities).length,
      );
    }

    vaultEventBus.emit({
      type: "BATCH_CREATED",
      vaultId: activeVaultId || "unknown",
      entities: [newEntity],
    });

    span.complete(() => ({
      entityCount: Object.keys(this.context.entities).length,
    }));
    return newEntity.id;
  }

  async updateEntity(
    id: string,
    updates: Partial<LocalEntity>,
  ): Promise<boolean> {
    const existing = this.context.entities[id];
    if (!existing) return false;
    const span = this.performanceRecorder.start("entity_save");

    const safeUpdates = {
      ...updates,
      content:
        updates.content !== undefined ? updates.content : existing.content,
      lore: updates.lore !== undefined ? updates.lore : existing.lore,
    };

    const { entities, updated } = vaultEntities.updateEntity(
      this.context.entities,
      id,
      safeUpdates,
    );
    if (!updated) return false;

    this.context.entities = entities;

    this.applyUpdateEffects(id, updates, updated);

    try {
      await this.context.deps.persistence.scheduleSave(updated, {
        immediate: hasLongFormUpdate(updates),
      });
    } catch (error) {
      span.fail("unexpected", () => ({
        entityCount: Object.keys(this.context.entities).length,
      }));
      throw error;
    }

    vaultEventBus.emit({
      type: "ENTITY_UPDATED",
      vaultId: this.context.deps.activeVaultId() || "unknown",
      entity: updated,
      patch: updates,
    });

    span.complete(() => ({
      entityCount: Object.keys(this.context.entities).length,
    }));
    return true;
  }

  private applyUpdateEffects(
    id: string,
    updates: Partial<LocalEntity>,
    updated: LocalEntity,
  ): void {
    if (hasLongFormUpdate(updates)) {
      markMutationContentLoaded(this.context, id);
    }
    if (updates.image && this.context.deps.invalidateUrlCache) {
      this.context.deps.invalidateUrlCache(updates.image);
    }
    this.invalidateStyleCache(updated);
  }

  private invalidateStyleCache(updated: LocalEntity): void {
    const services = this.context.deps.getServices();
    if (
      services?.ai &&
      ["art style", "style", "visual aesthetic"].some((keyword) =>
        updated.title.toLowerCase().includes(keyword),
      )
    ) {
      services.ai.clearStyleCache();
    }
  }

  async batchCreateEntities(newEntitiesList: BatchCreateInput[]) {
    const { entities, created } = vaultEntities.batchCreateEntities(
      this.context.entities,
      newEntitiesList,
    );
    this.context.entities = entities;

    const savePromises = created.map(async (entity) => {
      this.context.deps.loader.markContentLoaded(entity.id);
      await this.context.deps.persistence.scheduleSave(entity);
    });

    const activeVaultId = this.context.deps.activeVaultId();
    await Promise.all(savePromises);

    if (activeVaultId) {
      await this.context.deps.updateEntityCount(
        activeVaultId,
        Object.keys(this.context.entities).length,
      );
    }

    vaultEventBus.emit({
      type: "BATCH_CREATED",
      vaultId: activeVaultId || "unknown",
      entities: created,
    });
  }
}
