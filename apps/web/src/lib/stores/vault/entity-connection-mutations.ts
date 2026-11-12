import * as vaultEntities from "./entities";
import { vaultEventBus } from "./events.svelte";
import type { EntityMutationContext } from "./entity-mutation-context";

export class EntityConnectionMutations {
  constructor(private readonly context: EntityMutationContext) {}

  private async ensureContentLoaded(sourceId: string): Promise<void> {
    if (!this.context.deps.loader.isContentLoaded(sourceId)) {
      await this.context.deps.loader.loadEntityContent(sourceId);
    }
  }

  async addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
    strength: number = 1.0,
  ): Promise<boolean> {
    await this.ensureContentLoaded(sourceId);
    const { entities, updatedSource } = vaultEntities.addConnection(
      this.context.entities,
      sourceId,
      targetId,
      type,
      label,
      strength,
    );
    if (updatedSource) {
      this.context.entities = entities;
      await this.context.deps.persistence.scheduleSave(updatedSource);

      const newConn = updatedSource.connections.find(
        (c) => c.target === targetId && c.type === type,
      );
      if (newConn && this.context.deps.onConnectionAdded) {
        this.context.deps.onConnectionAdded(sourceId, targetId, newConn);
      }

      vaultEventBus.emit({
        type: "CONNECTION_ADDED",
        vaultId: this.context.deps.activeVaultId() || "unknown",
        sourceId,
        targetId,
        connectionType: type,
        label,
        strength,
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
    await this.ensureContentLoaded(sourceId);
    const { entities, updatedSource } = vaultEntities.updateConnection(
      this.context.entities,
      sourceId,
      targetId,
      oldType,
      newType,
      newLabel,
    );
    if (updatedSource) {
      this.context.entities = entities;
      await this.context.deps.persistence.scheduleSave(updatedSource);

      const updatedConn = updatedSource.connections.find(
        (c) => c.target === targetId && c.type === newType,
      );
      if (updatedConn && this.context.deps.onConnectionUpdated) {
        this.context.deps.onConnectionUpdated(
          sourceId,
          targetId,
          oldType,
          updatedConn,
        );
      }

      vaultEventBus.emit({
        type: "CONNECTION_UPDATED",
        vaultId: this.context.deps.activeVaultId() || "unknown",
        sourceId,
        targetId,
        oldType,
        newType,
        newLabel,
      });

      return true;
    }
    return false;
  }

  /**
   * Hides or shows one connection everywhere it is drawn (graph, Connections
   * diagram). The connection itself is kept and still listed on the entity.
   */
  async setConnectionHidden(
    sourceId: string,
    targetId: string,
    type: string,
    hidden: boolean,
  ): Promise<boolean> {
    await this.ensureContentLoaded(sourceId);
    const { entities, updatedSource, updatedConnection } =
      vaultEntities.setConnectionHidden(
        this.context.entities,
        sourceId,
        targetId,
        type,
        hidden,
      );
    if (!updatedSource || !updatedConnection) return false;

    this.context.entities = entities;
    await this.context.deps.persistence.scheduleSave(updatedSource);
    this.context.deps.onConnectionUpdated?.(
      sourceId,
      targetId,
      type,
      updatedConnection,
    );
    vaultEventBus.emit({
      type: "CONNECTION_UPDATED",
      vaultId: this.context.deps.activeVaultId() || "unknown",
      sourceId,
      targetId,
      oldType: type,
      newType: type,
      newLabel: updatedConnection.label,
    });
    return true;
  }

  async removeConnection(
    sourceId: string,
    targetId: string,
    type: string,
  ): Promise<boolean> {
    await this.ensureContentLoaded(sourceId);
    const { entities, updatedSource } = vaultEntities.removeConnection(
      this.context.entities,
      sourceId,
      targetId,
      type,
    );
    if (updatedSource) {
      this.context.entities = entities;
      await this.context.deps.persistence.scheduleSave(updatedSource);

      if (this.context.deps.onConnectionRemoved) {
        this.context.deps.onConnectionRemoved(sourceId, targetId, type);
      }

      // CONNECTION_REMOVED carries the full semantic; ENTITY_UPDATED with a
      // connections-only patch was redundant and triggered unnecessary fan-out.
      vaultEventBus.emit({
        type: "CONNECTION_REMOVED",
        vaultId: this.context.deps.activeVaultId() || "unknown",
        sourceId,
        targetId,
        connectionType: type,
      });
      return true;
    }
    return false;
  }
}
