import { EntityDeletionMutations } from "./entity-deletion-mutations";
import { EntityBulkUpdate } from "./entity-bulk-update";
import type { MutationDependencies } from "./entity-mutation-context";
export type { MutationDependencies } from "./entity-mutation-context";
import { EntityConnectionMutations } from "./entity-connection-mutations";
import { EntityWriteMutations } from "./entity-write-mutations";
import { EntityLabelMutations } from "./entity-label-mutations";
import type { LocalEntity, BatchCreateInput } from "./types";
import type { Entity } from "schema";
import type { BulkMutationResult } from "./bulk-results";
import { performanceRecorder } from "@codex/performance-observability";

export class EntityMutationService {
  private writes: EntityWriteMutations;
  private bulkUpdates: EntityBulkUpdate;
  private deletions: EntityDeletionMutations;
  private connections = new EntityConnectionMutations(this);
  private labels = new EntityLabelMutations(this);

  constructor(public deps: MutationDependencies) {
    const recorder = deps.performanceRecorder ?? performanceRecorder;
    this.writes = new EntityWriteMutations(this, recorder);
    this.bulkUpdates = new EntityBulkUpdate(this, recorder);
    this.deletions = new EntityDeletionMutations(this, recorder);
  }

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
    return this.writes.createEntity(type, title, initialData);
  }

  async updateEntity(
    id: string,
    updates: Partial<LocalEntity>,
  ): Promise<boolean> {
    return this.writes.updateEntity(id, updates);
  }

  async batchUpdate(
    updates: Record<string, Partial<LocalEntity>>,
  ): Promise<boolean> {
    const result = await this.bulkUpdate(updates);
    return result.succeededIds.length > 0;
  }

  async bulkUpdate(
    updates: Record<string, Partial<LocalEntity>>,
  ): Promise<BulkMutationResult> {
    return this.bulkUpdates.bulkUpdate(updates);
  }

  async deleteEntity(id: string) {
    return this.deletions.deleteEntity(id);
  }

  async bulkDelete(
    ids: string[],
    expectedVaultId?: string,
  ): Promise<BulkMutationResult> {
    return this.deletions.bulkDelete(ids, expectedVaultId);
  }

  async addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
    strength: number = 1.0,
  ): Promise<boolean> {
    return this.connections.addConnection(
      sourceId,
      targetId,
      type,
      label,
      strength,
    );
  }

  async updateConnection(
    sourceId: string,
    targetId: string,
    oldType: string,
    newType: string,
    newLabel?: string,
  ): Promise<boolean> {
    return this.connections.updateConnection(
      sourceId,
      targetId,
      oldType,
      newType,
      newLabel,
    );
  }

  async setConnectionHidden(
    sourceId: string,
    targetId: string,
    type: string,
    hidden: boolean,
  ): Promise<boolean> {
    return this.connections.setConnectionHidden(
      sourceId,
      targetId,
      type,
      hidden,
    );
  }

  async removeConnection(
    sourceId: string,
    targetId: string,
    type: string,
  ): Promise<boolean> {
    return this.connections.removeConnection(sourceId, targetId, type);
  }

  async addLabel(id: string, label: string): Promise<boolean> {
    return this.labels.addLabel(id, label);
  }

  async removeLabel(id: string, label: string): Promise<boolean> {
    return this.labels.removeLabel(id, label);
  }

  async bulkAddLabel(ids: string[], label: string): Promise<number> {
    return this.labels.bulkAddLabel(ids, label);
  }

  async bulkRemoveLabel(ids: string[], label: string): Promise<number> {
    return this.labels.bulkRemoveLabel(ids, label);
  }

  async renameLabel(from: string, to: string): Promise<number> {
    return this.labels.renameLabel(from, to);
  }

  async deleteLabel(label: string): Promise<number> {
    return this.labels.deleteLabel(label);
  }

  async batchCreateEntities(newEntitiesList: BatchCreateInput[]) {
    return this.writes.batchCreateEntities(newEntitiesList);
  }
}
