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
      "idle" | "loading" | "saving" | "saved" | "needs-permission" | "error",
  ) => void;
  status: () =>
    "idle" | "loading" | "saving" | "saved" | "needs-permission" | "error";
  setErrorMessage: (msg: string | null) => void;
  // callbacks
  onEntityUpdate?: (entity: LocalEntity) => void;
  onEntityDelete?: (entityId: string) => void;
  onBatchUpdate?: (updates: Record<string, Partial<LocalEntity>>) => void;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
  onEntitiesUpdated?: (
    oldEntities: Record<string, LocalEntity>,
    newEntities: Record<string, LocalEntity>,
  ) => void;
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

  allEntities = $state<LocalEntity[]>([]);
  allActiveEntities = $state<LocalEntity[]>([]);
  inboundConnections = $state<InboundMap>({});
  parentToChildren = $state<Record<string, string[]>>({});
  labelIndex = $state<string[]>([]);
  labelCounts = $state<Record<string, number>>({});
  titleAndAliasIndex = $state<
    Array<{
      lowercaseText: string;
      entityId: string;
      actualTitle: string;
      isAlias: boolean;
      visibility?: string;
      labels?: string[];
      status: string;
    }>
  >([]);

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
      const originalOnEntitiesUpdated = this.mutations.deps?.onEntitiesUpdated;

      this.mutations.registerStoreCallbacks({
        onEntityDelete: (id) => {
          this.patchDeleteEntity(id);
          originalOnEntityDelete?.(id);
        },
        onBatchUpdate: (updates) => {
          originalOnBatchUpdate?.(updates);
        },
        onEntitiesUpdated: (oldVal, val) => {
          this.handleEntitiesUpdate(oldVal, val);
          originalOnEntitiesUpdated?.(oldVal, val);
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
        onEntitiesUpdated: (oldVal, val) => {
          this.handleEntitiesUpdate(oldVal, val);
          if (deps.onEntitiesUpdated) deps.onEntitiesUpdated(oldVal, val);
        },
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

    this.inboundConnections = vaultRelationships.rebuildInboundMap(
      this.entities,
    );

    this.rebuildIndexes();
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
        this.rebuildIndexes();
      }
    }, "EntityStore-InboundRebuild");
  }

  // --- Incremental Index Maintenance ---

  rebuildIndexes() {
    const entities = this.entities;
    const all = Object.values(entities);

    this.allEntities = all;
    this.allActiveEntities = all.filter((e) => e.status !== "draft");

    const parentMap: Record<string, string[]> = {};
    const labelsSet = new Set<string>();
    const counts: Record<string, number> = {};
    const titleAndAlias: Array<{
      lowercaseText: string;
      entityId: string;
      actualTitle: string;
      isAlias: boolean;
      visibility?: string;
      labels?: string[];
      status: string;
    }> = [];

    for (let i = 0; i < all.length; i++) {
      const entity = all[i];

      // Parent to children mapping
      if (entity.parent) {
        if (!parentMap[entity.parent]) {
          parentMap[entity.parent] = [];
        }
        parentMap[entity.parent].push(entity.id);
      }

      // Label index and counts
      if (entity.labels) {
        const isDraft = entity.status === "draft";
        for (let j = 0; j < entity.labels.length; j++) {
          labelsSet.add(entity.labels[j]);
        }
        if (!isDraft) {
          const uniqueLabels = new Set(entity.labels);
          for (const l of uniqueLabels) {
            counts[l] = (counts[l] || 0) + 1;
          }
        }
      }

      // Title matching index
      if (entity.title) {
        titleAndAlias.push({
          lowercaseText: entity.title.toLowerCase(),
          entityId: entity.id,
          actualTitle: entity.title,
          isAlias: false,
          visibility: entity.visibility,
          labels: entity.labels,
          status: entity.status || "active",
        });
      }

      // Alias matching index
      if (entity.aliases && Array.isArray(entity.aliases)) {
        for (let j = 0; j < entity.aliases.length; j++) {
          const alias = entity.aliases[j];
          if (alias) {
            titleAndAlias.push({
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

    this.parentToChildren = parentMap;
    this.labelIndex = Array.from(labelsSet).sort();
    this.labelCounts = counts;
    this.titleAndAliasIndex = titleAndAlias.sort(
      (a, b) => b.lowercaseText.length - a.lowercaseText.length,
    );
  }

  handleEntitiesUpdate(
    oldMap: Record<string, LocalEntity>,
    newMap: Record<string, LocalEntity>,
  ) {
    const oldKeys = Object.keys(oldMap);
    const newKeys = Object.keys(newMap);

    // If either map is completely empty, do a full rebuild.
    if (oldKeys.length === 0 || newKeys.length === 0) {
      this.rebuildIndexes();
      return;
    }

    // Detect deleted entities
    for (let i = 0; i < oldKeys.length; i++) {
      const id = oldKeys[i];
      if (!newMap[id]) {
        this.incrementalDelete(oldMap[id]);
      }
    }

    // Detect added or modified entities
    for (let i = 0; i < newKeys.length; i++) {
      const id = newKeys[i];
      const oldEnt = oldMap[id];
      const newEnt = newMap[id];

      if (!oldEnt) {
        this.incrementalAdd(newEnt);
      } else if (oldEnt !== newEnt) {
        // Compare only index-relevant fields to detect if a heavy re-indexing is required.
        const titleChanged = oldEnt.title !== newEnt.title;
        const aliasesChanged =
          JSON.stringify(oldEnt.aliases) !== JSON.stringify(newEnt.aliases);
        const labelsChanged =
          JSON.stringify(oldEnt.labels) !== JSON.stringify(newEnt.labels);
        const parentChanged = oldEnt.parent !== newEnt.parent;
        const statusChanged = oldEnt.status !== newEnt.status;
        const visibilityChanged = oldEnt.visibility !== newEnt.visibility;

        if (
          titleChanged ||
          aliasesChanged ||
          labelsChanged ||
          parentChanged ||
          statusChanged ||
          visibilityChanged
        ) {
          this.incrementalUpdate(oldEnt, newEnt);
        } else {
          // Cold content or timestamp update path (e.g. keystroke inside editor).
          // Replace the array identity so derived graph elements resync for
          // connection-only updates without rebuilding all secondary indexes.
          const idx = this.allEntities.findIndex((e) => e.id === id);
          if (idx !== -1) {
            const nextAllEntities = [...this.allEntities];
            nextAllEntities[idx] = newEnt;
            this.allEntities = nextAllEntities;
          }
          if (newEnt.status !== "draft") {
            const activeIdx = this.allActiveEntities.findIndex(
              (e) => e.id === id,
            );
            if (activeIdx !== -1) {
              const nextActiveEntities = [...this.allActiveEntities];
              nextActiveEntities[activeIdx] = newEnt;
              this.allActiveEntities = nextActiveEntities;
            }
          }
        }
      }
    }
  }

  private incrementalAdd(entity: LocalEntity) {
    const id = entity.id;

    this.allEntities.push(entity);
    if (entity.status !== "draft") {
      this.allActiveEntities.push(entity);
    }

    if (entity.parent) {
      if (!this.parentToChildren[entity.parent]) {
        this.parentToChildren[entity.parent] = [];
      }
      if (!this.parentToChildren[entity.parent].includes(id)) {
        this.parentToChildren[entity.parent].push(id);
      }
    }

    let addedToTitleIndex = false;
    if (entity.title) {
      this.titleAndAliasIndex.push({
        lowercaseText: entity.title.toLowerCase(),
        entityId: entity.id,
        actualTitle: entity.title,
        isAlias: false,
        visibility: entity.visibility,
        labels: entity.labels,
        status: entity.status || "active",
      });
      addedToTitleIndex = true;
    }
    if (entity.aliases && Array.isArray(entity.aliases)) {
      for (let j = 0; j < entity.aliases.length; j++) {
        const alias = entity.aliases[j];
        if (alias) {
          this.titleAndAliasIndex.push({
            lowercaseText: alias.toLowerCase(),
            entityId: entity.id,
            actualTitle: entity.title,
            isAlias: true,
            visibility: entity.visibility,
            labels: entity.labels,
            status: entity.status || "active",
          });
          addedToTitleIndex = true;
        }
      }
    }
    if (addedToTitleIndex) {
      this.titleAndAliasIndex.sort(
        (a, b) => b.lowercaseText.length - a.lowercaseText.length,
      );
    }

    if (entity.labels) {
      const isDraft = entity.status === "draft";
      let labelsAdded = false;
      const uniqueLabels = new Set(entity.labels);

      for (const l of uniqueLabels) {
        if (!this.labelIndex.includes(l)) {
          this.labelIndex.push(l);
          labelsAdded = true;
        }
        if (!isDraft) {
          this.labelCounts[l] = (this.labelCounts[l] || 0) + 1;
        }
      }

      if (labelsAdded) {
        this.labelIndex.sort();
      }
    }
  }

  private incrementalDelete(entity: LocalEntity) {
    const id = entity.id;

    this.allEntities = this.allEntities.filter((e) => e.id !== id);
    if (entity.status !== "draft") {
      this.allActiveEntities = this.allActiveEntities.filter(
        (e) => e.id !== id,
      );
    }

    if (entity.parent && this.parentToChildren[entity.parent]) {
      this.parentToChildren[entity.parent] = this.parentToChildren[
        entity.parent
      ].filter((cid) => cid !== id);
      if (this.parentToChildren[entity.parent].length === 0) {
        delete this.parentToChildren[entity.parent];
      }
    }
    if (this.parentToChildren[id]) {
      delete this.parentToChildren[id];
    }

    this.titleAndAliasIndex = this.titleAndAliasIndex.filter(
      (item) => item.entityId !== id,
    );

    if (entity.labels) {
      const isDraft = entity.status === "draft";
      const uniqueLabels = new Set(entity.labels);
      for (const l of uniqueLabels) {
        if (!isDraft && this.labelCounts[l] !== undefined) {
          this.labelCounts[l]--;
          if (this.labelCounts[l] <= 0) {
            delete this.labelCounts[l];
          }
        }
      }

      const remainingLabels = new Set<string>();
      for (let j = 0; j < this.allEntities.length; j++) {
        const e = this.allEntities[j];
        if (e.labels) {
          for (let k = 0; k < e.labels.length; k++) {
            remainingLabels.add(e.labels[k]);
          }
        }
      }
      this.labelIndex = Array.from(remainingLabels).sort();
    }
  }

  private incrementalUpdate(oldEntity: LocalEntity, newEntity: LocalEntity) {
    const id = newEntity.id;

    const idx = this.allEntities.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.allEntities[idx] = newEntity;
    } else {
      this.allEntities.push(newEntity);
    }

    const wasActive = oldEntity.status !== "draft";
    const isActive = newEntity.status !== "draft";

    if (wasActive && !isActive) {
      this.allActiveEntities = this.allActiveEntities.filter(
        (e) => e.id !== id,
      );
    } else if (!wasActive && isActive) {
      this.allActiveEntities.push(newEntity);
    } else if (isActive) {
      const activeIdx = this.allActiveEntities.findIndex((e) => e.id === id);
      if (activeIdx !== -1) {
        this.allActiveEntities[activeIdx] = newEntity;
      } else {
        this.allActiveEntities.push(newEntity);
      }
    }

    if (oldEntity.parent !== newEntity.parent) {
      if (oldEntity.parent && this.parentToChildren[oldEntity.parent]) {
        this.parentToChildren[oldEntity.parent] = this.parentToChildren[
          oldEntity.parent
        ].filter((cid) => cid !== id);
        if (this.parentToChildren[oldEntity.parent].length === 0) {
          delete this.parentToChildren[oldEntity.parent];
        }
      }
      if (newEntity.parent) {
        if (!this.parentToChildren[newEntity.parent]) {
          this.parentToChildren[newEntity.parent] = [];
        }
        if (!this.parentToChildren[newEntity.parent].includes(id)) {
          this.parentToChildren[newEntity.parent].push(id);
        }
      }
    }

    this.titleAndAliasIndex = this.titleAndAliasIndex.filter(
      (item) => item.entityId !== id,
    );
    let addedToTitleIndex = false;
    if (newEntity.title) {
      this.titleAndAliasIndex.push({
        lowercaseText: newEntity.title.toLowerCase(),
        entityId: newEntity.id,
        actualTitle: newEntity.title,
        isAlias: false,
        visibility: newEntity.visibility,
        labels: newEntity.labels,
        status: newEntity.status || "active",
      });
      addedToTitleIndex = true;
    }
    if (newEntity.aliases && Array.isArray(newEntity.aliases)) {
      for (let j = 0; j < newEntity.aliases.length; j++) {
        const alias = newEntity.aliases[j];
        if (alias) {
          this.titleAndAliasIndex.push({
            lowercaseText: alias.toLowerCase(),
            entityId: newEntity.id,
            actualTitle: newEntity.title,
            isAlias: true,
            visibility: newEntity.visibility,
            labels: newEntity.labels,
            status: newEntity.status || "active",
          });
          addedToTitleIndex = true;
        }
      }
    }
    if (addedToTitleIndex) {
      this.titleAndAliasIndex.sort(
        (a, b) => b.lowercaseText.length - a.lowercaseText.length,
      );
    }

    if (wasActive && oldEntity.labels) {
      const uniqueOldLabels = new Set(oldEntity.labels);
      for (const l of uniqueOldLabels) {
        if (this.labelCounts[l] !== undefined) {
          this.labelCounts[l]--;
          if (this.labelCounts[l] <= 0) {
            delete this.labelCounts[l];
          }
        }
      }
    }
    if (isActive && newEntity.labels) {
      const uniqueLabels = new Set(newEntity.labels);
      for (const l of uniqueLabels) {
        this.labelCounts[l] = (this.labelCounts[l] || 0) + 1;
      }
    }

    const oldLabelsStr = JSON.stringify(oldEntity.labels || []);
    const newLabelsStr = JSON.stringify(newEntity.labels || []);
    if (oldLabelsStr !== newLabelsStr) {
      const remainingLabels = new Set<string>();
      for (let j = 0; j < this.allEntities.length; j++) {
        const e = this.allEntities[j];
        if (e.labels) {
          for (let k = 0; k < e.labels.length; k++) {
            remainingLabels.add(e.labels[k]);
          }
        }
      }
      this.labelIndex = Array.from(remainingLabels).sort();
    }
  }

  // --- Persistence Delegation ---

  scheduleSave(entity: LocalEntity | Entity): Promise<void> {
    return this.persistence.scheduleSave(entity);
  }

  async flushPendingSaves(timeoutMs?: number): Promise<void> {
    return this.persistence.flushPendingSaves(timeoutMs);
  }

  suspendSaving() {
    this.persistence.suspendSaving();
  }

  resumeSaving() {
    this.persistence.resumeSaving();
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
