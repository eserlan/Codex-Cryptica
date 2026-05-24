import * as vaultRelationships from "./relationships";
import type { LocalEntity, BatchCreateInput } from "./types";
import { VaultRepository } from "@codex/vault-engine";
import type { Entity } from "schema";
import type { InboundMap } from "./relationships";
import { EntityContentLoader } from "./entity-content-loader.svelte";
import { EntityPersistenceService } from "./entity-persistence";
import { EntityMutationService } from "./entity-mutations";

export interface EntityStoreDependencies {
  repository: VaultRepository;
  activeVaultId: () => string | null;
  isGuest: () => boolean;
  getGuestFile?: (path: string) => Promise<Blob>;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getSpecificVaultHandle: (
    vaultId: string,
  ) => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveFolderHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getServices: () => any;
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
  private repository: VaultRepository;
  public loader: EntityContentLoader;
  private persistence: EntityPersistenceService;
  private mutations: EntityMutationService;

  get entities() {
    return this.repository.entities;
  }

  set entities(val: Record<string, LocalEntity>) {
    this.repository.entities = val;
  }

  allEntities: LocalEntity[];
  allActiveEntities: LocalEntity[];
  inboundConnections: InboundMap;
  labelIndex: string[];
  labelCounts: Record<string, number>;

  constructor(
    depsOrRepository: EntityStoreDependencies | VaultRepository,
    loader?: EntityContentLoader,
    persistence?: EntityPersistenceService,
    mutations?: EntityMutationService,
  ) {
    // Determine if we are in the DI path by checking for the presence of the extra args.
    // We check for loader OR persistence OR mutations to decide we're TRYING to use DI.
    if (
      loader ||
      persistence ||
      mutations ||
      (depsOrRepository &&
        "entities" in depsOrRepository &&
        !("activeVaultId" in depsOrRepository))
    ) {
      if (!loader || !persistence || !mutations) {
        const missing = [
          !loader ? "loader" : null,
          !persistence ? "persistence" : null,
          !mutations ? "mutations" : null,
        ].filter(Boolean);

        throw new Error(
          `EntityStore requires ${missing.join(", ")} when using the Dependency Injection constructor. Pass loader, persistence, and mutations, or use the EntityStoreDependencies object form.`,
        );
      }
      this.repository = depsOrRepository as VaultRepository;
      this.loader = loader;
      this.persistence = persistence;
      this.mutations = mutations;
    } else {
      const deps = depsOrRepository as EntityStoreDependencies;
      this.repository = deps.repository;
      this.loader = new EntityContentLoader({
        repository: deps.repository,
        activeVaultId: deps.activeVaultId,
        isGuest: deps.isGuest,
        getGuestFile: deps.getGuestFile,
        getActiveVaultHandle: deps.getActiveVaultHandle,
        getActiveFolderHandle: deps.getActiveFolderHandle,
      });

      this.persistence = new EntityPersistenceService({
        repository: deps.repository,
        activeVaultId: deps.activeVaultId,
        isGuest: deps.isGuest,
        getSpecificVaultHandle: deps.getSpecificVaultHandle,
        setStatus: deps.setStatus,
        setErrorMessage: deps.setErrorMessage,
        onEntityUpdate: deps.onEntityUpdate,
        isContentLoaded: (id) => this.loader.isContentLoaded(id),
        loadContent: (id) => this.loader.internalLoadContent(id),
        markContentLoaded: (id) => this.loader.markContentLoaded(id),
      });

      this.mutations = new EntityMutationService({
        repository: deps.repository,
        persistence: this.persistence,
        loader: this.loader,
        activeVaultId: deps.activeVaultId,
        isGuest: deps.isGuest,
        getActiveVaultHandle: deps.getActiveVaultHandle,
        getActiveFolderHandle: deps.getActiveFolderHandle,
        getServices: deps.getServices,
        invalidateUrlCache: deps.invalidateUrlCache,
        onEntityDelete: deps.onEntityDelete,
        onBatchUpdate: deps.onBatchUpdate,
        updateEntityCount: deps.updateEntityCount,
      });
    }

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
    this.labelCounts = $derived.by(() => {
      const counts: Record<string, number> = {};
      for (const entity of this.allActiveEntities) {
        if (entity.labels) {
          for (const l of entity.labels) {
            counts[l] = (counts[l] || 0) + 1;
          }
        }
      }
      return counts;
    });
  }

  // --- Persistence Delegation ---

  scheduleSave(entity: LocalEntity | Entity): Promise<void> {
    return this.persistence.scheduleSave(entity);
  }

  async flushPendingSaves(): Promise<void> {
    return this.persistence.flushPendingSaves();
  }

  // --- Loader Delegation ---

  async loadEntityContent(id: string): Promise<void> {
    return this.loader.loadEntityContent(id);
  }

  async internalLoadContent(id: string): Promise<void> {
    return this.loader.internalLoadContent(id);
  }

  isContentLoaded(id: string) {
    return this.loader.isContentLoaded(id);
  }

  isContentVerified(id: string) {
    return this.loader.isContentVerified(id);
  }

  markContentLoaded(id: string) {
    this.loader.markContentLoaded(id);
  }

  // --- Mutation Delegation ---

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
    return this.mutations.addConnection(
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
    return this.mutations.updateConnection(
      sourceId,
      targetId,
      oldType,
      newType,
      newLabel,
    );
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
}
