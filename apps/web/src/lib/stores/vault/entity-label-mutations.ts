import * as vaultEntities from "./entities";
import { vaultEventBus } from "./events.svelte";
import type { LocalEntity } from "./types";
import type { EntityMutationContext } from "./entity-mutation-context";

export class EntityLabelMutations {
  constructor(private readonly context: EntityMutationContext) {}

  async addLabel(id: string, label: string): Promise<boolean> {
    const { entities, updated } = vaultEntities.addLabel(
      this.context.entities,
      id,
      label,
    );
    return this.commitSingleLabelChange(entities, updated);
  }

  async removeLabel(id: string, label: string): Promise<boolean> {
    const { entities, updated } = vaultEntities.removeLabel(
      this.context.entities,
      id,
      label,
    );
    return this.commitSingleLabelChange(entities, updated);
  }

  private async commitSingleLabelChange(
    entities: Record<string, LocalEntity>,
    updated: LocalEntity | undefined | null,
  ): Promise<boolean> {
    if (!updated) return false;
    this.context.entities = entities;
    await this.context.deps.persistence.scheduleSave(updated);
    vaultEventBus.emit({
      type: "ENTITY_UPDATED",
      vaultId: this.context.deps.activeVaultId() || "unknown",
      entity: updated,
      patch: { labels: updated.labels },
    });
    return true;
  }

  /**
   * Saves the entities a label change touched and announces them once. Returns
   * how many changed.
   */
  private async commitLabelChanges(
    entities: Record<string, LocalEntity>,
    modifiedIds: string[],
  ): Promise<number> {
    if (modifiedIds.length === 0) return 0;

    this.context.entities = entities;
    const changed: LocalEntity[] = [];
    const savePromises: Promise<void>[] = [];
    for (const id of modifiedIds) {
      const entity = entities[id];
      if (entity) {
        savePromises.push(this.context.deps.persistence.scheduleSave(entity));
        changed.push(entity);
      }
    }
    await Promise.all(savePromises);
    vaultEventBus.emit({
      type: "BATCH_UPDATED",
      vaultId: this.context.deps.activeVaultId() || "unknown",
      entities: changed,
    });
    return modifiedIds.length;
  }

  async bulkAddLabel(ids: string[], label: string): Promise<number> {
    const { entities, modifiedIds } = vaultEntities.bulkAddLabel(
      this.context.entities,
      ids,
      label,
    );
    return this.commitLabelChanges(entities, modifiedIds);
  }

  async bulkRemoveLabel(ids: string[], label: string): Promise<number> {
    const { entities, modifiedIds } = vaultEntities.bulkRemoveLabel(
      this.context.entities,
      ids,
      label,
    );
    return this.commitLabelChanges(entities, modifiedIds);
  }

  /** Renames a label on every entity that has it. Returns how many changed. */
  async renameLabel(from: string, to: string): Promise<number> {
    const { entities, modifiedIds } = vaultEntities.renameLabel(
      this.context.entities,
      from,
      to,
    );
    return this.commitLabelChanges(entities, modifiedIds);
  }

  /** Removes a label from every entity that has it. Entities stay. */
  async deleteLabel(label: string): Promise<number> {
    const { entities, modifiedIds } = vaultEntities.bulkRemoveLabel(
      this.context.entities,
      Object.keys(this.context.entities),
      label,
    );
    return this.commitLabelChanges(entities, modifiedIds);
  }
}
