import * as vaultRelationships from "./relationships";
import type { LocalEntity, BatchCreateInput } from "./types";
import type { VaultRepository } from "@codex/vault-engine";
import type { Entity } from "schema";
import type { InboundMap } from "./relationships";
import { EntityContentLoader } from "./entity-content-loader.svelte";
import { EntityPersistence } from "./entity-persistence";
import { EntityMutations } from "./entity-mutations";
import type { IVaultServices } from "./service-registry";

export interface EntityStoreDependencies {
  repository: VaultRepository;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getGuestFile?: (path: string) => Promise<Blob>;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getSpecificVaultHandle: (
    vaultId: string,
  ) => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveSyncHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getServices: () => IVaultServices | null;
  invalidateUrlCache?: (path: string) => void;
  setStatus: (status: "idle" | "loading" | "saving" | "error") => void;
  setErrorMessage: (msg: string | null) => void;
  // callbacks
  onEntityUpdate?: (entity: LocalEntity) => void;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
}

export class EntityStore {
  private contentLoader: EntityContentLoader;
  private persistence: EntityPersistence;
  private mutations: EntityMutations;

  get entities() {
    return this.deps.repository.entities;
  }

  set entities(val: Record<string, LocalEntity>) {
    this.deps.repository.entities = val;
  }

  allEntities: LocalEntity[];
  allActiveEntities: LocalEntity[];
  inboundConnections: InboundMap;
  labelIndex: string[];

  constructor(private deps: EntityStoreDependencies) {
    this.contentLoader = new EntityContentLoader({
      repository: deps.repository,
      activeVaultId: deps.activeVaultId,
      isGuest: deps.isGuest,
      getGuestFile: deps.getGuestFile,
      getActiveVaultHandle: deps.getActiveVaultHandle,
      getActiveSyncHandle: deps.getActiveSyncHandle,
    });

    this.persistence = new EntityPersistence(
      {
        repository: deps.repository,
        activeVaultId: deps.activeVaultId,
        isGuest: deps.isGuest,
        getSpecificVaultHandle: deps.getSpecificVaultHandle,
        setStatus: deps.setStatus,
        setErrorMessage: deps.setErrorMessage,
        onEntityUpdate: deps.onEntityUpdate,
      },
      this.contentLoader,
    );

    this.mutations = new EntityMutations(
      {
        repository: deps.repository,
        activeVaultId: deps.activeVaultId,
        isGuest: deps.isGuest,
        getActiveVaultHandle: deps.getActiveVaultHandle,
        getActiveSyncHandle: deps.getActiveSyncHandle,
        getServices: deps.getServices,
        invalidateUrlCache: deps.invalidateUrlCache,
        updateEntityCount: deps.updateEntityCount,
        onEntityDelete: deps.onEntityDelete,
        onBatchUpdate: deps.onBatchUpdate,
      },
      this.persistence,
      this.contentLoader,
    );

    this.allEntities = $derived.by(() => Object.values(this.entities));
    this.allActiveEntities = $derived.by(() =>
      this.allEntities.filter((e) => e.status !== "draft"),
    );
    this.inboundConnections = $derived.by(() =>
      vaultRelationships.rebuildInboundMap(this.entities),
    );
    this.labelIndex = $derived.by(() => {
      const labels = new Set<string>();
      for (const entity of this.allEntities) {
        if (entity.labels) {
          entity.labels.forEach((l) => labels.add(l));
        }
      }
      return Array.from(labels).sort();
    });
  }

  // --- Delegation ---

  scheduleSave(entity: LocalEntity | Entity): Promise<void> {
    return this.persistence.scheduleSave(entity);
  }

  async flushPendingSaves(): Promise<void> {
    return this.persistence.flushPendingSaves();
  }

  async createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ): Promise<string> {
    return this.mutations.createEntity(type, title, initialData);
  }

  async updateEntity(
    id: string,
    updates: Partial<LocalEntity>,
  ): Promise<boolean> {
    return this.mutations.updateEntity(id, updates);
  }

  async batchUpdate(
    updates: Record<string, Partial<LocalEntity>>,
  ): Promise<boolean> {
    return this.mutations.batchUpdate(updates);
  }

  async deleteEntity(id: string) {
    return this.mutations.deleteEntity(id);
  }

  async addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
    strength: number = 1.0,
  ): Promise<boolean> {
    return this.mutations.addConnection(sourceId, targetId, type, label, strength);
  }

  async updateConnection(
    sourceId: string,
    targetId: string,
    oldType: string,
    newType: string,
    newLabel?: string,
  ): Promise<boolean> {
    return this.mutations.updateConnection(sourceId, targetId, oldType, newType, newLabel);
  }

  async removeConnection(
    sourceId: string,
    targetId: string,
    type: string,
  ): Promise<boolean> {
    return this.mutations.removeConnection(sourceId, targetId, type);
  }

  async addLabel(id: string, label: string): Promise<boolean> {
    return this.mutations.addLabel(id, label);
  }

  async removeLabel(id: string, label: string): Promise<boolean> {
    return this.mutations.removeLabel(id, label);
  }

  async bulkAddLabel(ids: string[], label: string): Promise<number> {
    return this.mutations.bulkAddLabel(ids, label);
  }

  async bulkRemoveLabel(ids: string[], label: string): Promise<number> {
    return this.mutations.bulkRemoveLabel(ids, label);
  }

  async batchCreateEntities(newEntitiesList: BatchCreateInput[]) {
    return this.mutations.batchCreateEntities(newEntitiesList);
  }

  async loadEntityContent(id: string): Promise<void> {
    return this.contentLoader.loadEntityContent(id);
  }

  async internalLoadContent(id: string): Promise<void> {
    return this.contentLoader.internalLoadContent(id);
  }

  isContentLoaded(id: string) {
    return this.contentLoader.isContentLoaded(id);
  }

  isContentVerified(id: string) {
    return this.contentLoader.isContentVerified(id);
  }

  markContentLoaded(id: string) {
    this.contentLoader.markContentLoaded(id);
  }
}
