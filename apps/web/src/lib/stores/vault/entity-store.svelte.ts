import * as vaultRelationships from "./relationships";
import type { LocalEntity, BatchCreateInput } from "./types";
import { VaultRepository } from "@codex/vault-engine";
import type { Entity } from "schema";
import type { InboundMap } from "./relationships";
import { EntityContentLoader } from "./entity-content-loader.svelte";
import { EntityPersistenceService } from "./entity-persistence";
import { EntityMutationService } from "./entity-mutations";
import { vaultEventBus } from "./events.svelte";

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
  setStatus: (
    status:
      | "idle"
      | "loading"
      | "saving"
      | "saved"
      | "needs-permission"
      | "error",
  ) => void;
  status: () =>
    | "idle"
    | "loading"
    | "saving"
    | "saved"
    | "needs-permission"
    | "error";
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
  private _eventBusUnsubscribe?: () => void;

  get entities() {
    return this.repository.entities;
  }

  set entities(val: Record<string, LocalEntity>) {
    this.repository.entities = val;
  }

  allEntities: LocalEntity[];
  allActiveEntities: LocalEntity[];
  inboundConnections = $state<InboundMap>({});
  parentToChildren: Record<string, string[]>;
  labelIndex: string[];
  labelCounts: Record<string, number>;
  titleAndAliasIndex: Array<{
    lowercaseText: string;
    entityId: string;
    actualTitle: string;
    isAlias: boolean;
    visibility?: string;
    labels?: string[];
    status: string;
  }>;

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

      const originalOnEntityDelete = this.mutations.deps?.onEntityDelete;
      const originalOnBatchUpdate = this.mutations.deps?.onBatchUpdate;

      this.mutations.registerStoreCallbacks({
        onEntityDelete: (id) => {
          this.patchDeleteEntity(id);
          originalOnEntityDelete?.(id);
        },
        onBatchUpdate: (updates) => {
          originalOnBatchUpdate?.(updates);
        },
        onConnectionAdded: (sourceId, targetId, connection) => {
          this.patchAddConnection(sourceId, targetId, connection);
        },
        onConnectionRemoved: (sourceId, targetId, type) => {
          this.patchRemoveConnection(sourceId, targetId, type);
        },
        onConnectionUpdated: (sourceId, targetId, oldType, connection) => {
          this.patchUpdateConnection(sourceId, targetId, oldType, connection);
        },
        getInboundConnections: () => this.inboundConnections,
        getParentToChildren: () => this.parentToChildren,
      });
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
        status: deps.status,
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
        onEntityDelete: (id) => {
          this.patchDeleteEntity(id);
          if (deps.onEntityDelete) deps.onEntityDelete(id);
        },
        onBatchUpdate: deps.onBatchUpdate,
        updateEntityCount: deps.updateEntityCount,
        onConnectionAdded: (sourceId, targetId, connection) => {
          this.patchAddConnection(sourceId, targetId, connection);
        },
        onConnectionRemoved: (sourceId, targetId, type) => {
          this.patchRemoveConnection(sourceId, targetId, type);
        },
        onConnectionUpdated: (sourceId, targetId, oldType, connection) => {
          this.patchUpdateConnection(sourceId, targetId, oldType, connection);
        },
        getInboundConnections: () => this.inboundConnections,
        getParentToChildren: () => this.parentToChildren,
      });
    }

    this.allEntities = $derived.by(() => Object.values(this.entities));
    this.allActiveEntities = $derived.by(() =>
      this.allEntities.filter((e) => e.status !== "draft"),
    );
    this.parentToChildren = $derived.by(() => {
      const map: Record<string, string[]> = {};
      for (const entity of this.allEntities) {
        if (entity.parent) {
          if (!map[entity.parent]) {
            map[entity.parent] = [];
          }
          map[entity.parent].push(entity.id);
        }
      }
      return map;
    });

    this.initializeInboundConnections();

    if (this._eventBusUnsubscribe) {
      this._eventBusUnsubscribe();
    }
    this._eventBusUnsubscribe = vaultEventBus.subscribe((event) => {
      if (
        event.type === "CACHE_LOADED" ||
        event.type === "SYNC_COMPLETE" ||
        event.type === "VAULT_SWITCHED" ||
        event.type === "SYNC_CHUNK_READY"
      ) {
        this.initializeInboundConnections();
      }
    }, "EntityStore-InboundRebuild");
    const labelData = $derived.by(() => {
      const labels = new Set<string>();
      const counts: Record<string, number> = {};

      for (const entity of this.allEntities) {
        if (entity.labels) {
          const isDraft = entity.status === "draft";
          for (const l of entity.labels) {
            labels.add(l);
          }

          if (!isDraft) {
            const uniqueLabels = new Set(entity.labels);
            for (const l of uniqueLabels) {
              counts[l] = (counts[l] || 0) + 1;
            }
          }
        }
      }

      return {
        index: Array.from(labels).sort(),
        counts,
      };
    });

    this.labelIndex = $derived(labelData.index);
    this.labelCounts = $derived(labelData.counts);

    this.titleAndAliasIndex = $derived.by(() => {
      const idx: Array<{
        lowercaseText: string;
        entityId: string;
        actualTitle: string;
        isAlias: boolean;
        visibility?: string;
        labels?: string[];
        status: string;
      }> = [];

      for (const entity of this.allEntities) {
        if (entity.title) {
          idx.push({
            lowercaseText: entity.title.toLowerCase(),
            entityId: entity.id,
            actualTitle: entity.title,
            isAlias: false,
            visibility: entity.visibility,
            labels: entity.labels,
            status: entity.status || "active",
          });
        }

        if (entity.aliases && Array.isArray(entity.aliases)) {
          for (const alias of entity.aliases) {
            if (alias) {
              idx.push({
                lowercaseText: alias.toLowerCase(),
                entityId: entity.id,
                actualTitle: entity.title,
                isAlias: true,
                visibility: entity.visibility,
                labels: entity.labels,
                status: entity.status || "active",
              });
            }
          }
        }
      }

      return idx.sort(
        (a, b) => b.lowercaseText.length - a.lowercaseText.length,
      );
    });
  }

  // --- Persistence Delegation ---

  scheduleSave(entity: LocalEntity | Entity): Promise<void> {
    return this.persistence.scheduleSave(entity);
  }

  async flushPendingSaves(timeoutMs?: number): Promise<void> {
    return this.persistence.flushPendingSaves(timeoutMs);
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

  // --- Delta Connection Patching (O(1) Hot-Path Optimization) ---

  initializeInboundConnections() {
    this.inboundConnections = vaultRelationships.rebuildInboundMap(
      this.entities,
    );
  }

  patchAddConnection(sourceId: string, targetId: string, connection: any) {
    if (!this.inboundConnections[targetId]) {
      this.inboundConnections[targetId] = [];
    }
    const list = this.inboundConnections[targetId];
    const exists = list.some(
      (item) =>
        item.sourceId === sourceId && item.connection.type === connection.type,
    );
    if (!exists) {
      this.inboundConnections[targetId] = [...list, { sourceId, connection }];
    }
  }

  patchRemoveConnection(sourceId: string, targetId: string, type: string) {
    const list = this.inboundConnections[targetId];
    if (list) {
      this.inboundConnections[targetId] = list.filter(
        (item) =>
          !(item.sourceId === sourceId && item.connection.type === type),
      );
    }
  }

  patchUpdateConnection(
    sourceId: string,
    targetId: string,
    oldType: string,
    connection: any,
  ) {
    const list = this.inboundConnections[targetId];
    if (list) {
      const idx = list.findIndex(
        (item) =>
          item.sourceId === sourceId && item.connection.type === oldType,
      );
      if (idx !== -1) {
        const updated = [...list];
        updated[idx] = { sourceId, connection };
        this.inboundConnections[targetId] = updated;
      }
    }
  }

  patchDeleteEntity(id: string) {
    delete this.inboundConnections[id];

    for (const targetId in this.inboundConnections) {
      const list = this.inboundConnections[targetId];
      if (list) {
        const filtered = list.filter((item) => item.sourceId !== id);
        if (filtered.length !== list.length) {
          this.inboundConnections[targetId] = filtered;
        }
      }
    }
  }
}
